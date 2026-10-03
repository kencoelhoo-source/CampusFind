import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { FoggyController, FoggyExpression } from "./foggy-scene";
import { applyCommand, createCommandBuffer, type FoggyCommand, type FoggyEvent, type FoggyInit, type FoggyWorkerMessage } from "./foggy-messages";

export type { FoggyExpression };

interface FoggyProps {
  /** Driven by the page (e.g. "typing" while an answer loads). */
  expression: FoggyExpression;
  /**
   * When false, taps pass straight through Foggy. The FAQ turns this off on phones while
   * you're typing, so the floating companion can never sit on top of the send button.
   */
  interactive?: boolean;
  /**
   * Something Foggy should keep looking at (e.g. the question box while you type). While
   * set, it overrides following the cursor, taps and scrolling.
   */
  lookAt?: HTMLElement | null;
  className?: string;
}

interface Driver {
  send(command: FoggyCommand): void;
  dispose(): void;
}

/** Preferred: the whole scene lives in a worker, drawing into an OffscreenCanvas. */
function startInWorker(canvas: HTMLCanvasElement, init: FoggyInit, onEvent: (event: FoggyEvent) => void): Driver | null {
  if (typeof Worker === "undefined" || typeof canvas.transferControlToOffscreen !== "function") return null;
  let worker: Worker;
  try {
    worker = new Worker(new URL("./foggy.worker.ts", import.meta.url), { type: "module" });
  } catch {
    return null;
  }
  const offscreen = canvas.transferControlToOffscreen();
  worker.onmessage = (event: MessageEvent<FoggyEvent>) => onEvent(event.data);
  worker.onerror = () => onEvent({ type: "unsupported" });
  const initMessage: FoggyWorkerMessage = { type: "init", canvas: offscreen, ...init };
  worker.postMessage(initMessage, [offscreen]);
  return {
    send: (command) => worker.postMessage(command),
    dispose: () => {
      worker.postMessage({ type: "dispose" } satisfies FoggyWorkerMessage);
      window.setTimeout(() => worker.terminate(), 1000); // give it a moment to free the GPU context
    },
  };
}

/** Fallback for browsers without OffscreenCanvas WebGL: same scene on the page thread. */
function startOnPage(canvas: HTMLCanvasElement, init: FoggyInit, onEvent: (event: FoggyEvent) => void): Driver {
  let controller: FoggyController | null = null;
  let cancelled = false;
  const pending = createCommandBuffer();

  import("./foggy-scene")
    .then(({ createFoggyScene }) =>
      createFoggyScene(canvas, {
        ...init,
        isCancelled: () => cancelled,
        onQuality: (quality) => onEvent({ type: "quality", quality }),
        onFirstFrame: () => onEvent({ type: "firstFrame" }),
        onMoodChange: (label) => onEvent({ type: "mood", label }),
        onBoop: () => onEvent({ type: "boop" }),
      }),
    )
    .then((created) => {
      if (!created) return;
      if (cancelled) {
        created.dispose();
        return;
      }
      controller = created;
      pending.flush(created);
    })
    .catch(() => onEvent({ type: "unsupported" }));

  return {
    send: (command) => (controller ? applyCommand(controller, command) : pending.remember(command)),
    dispose: () => {
      cancelled = true;
      controller?.dispose();
      controller = null;
    },
  };
}

/**
 * Foggy, the 3D CampusFind assistant. Lazy-load this component.
 *
 * Phones: a small companion floating above the bottom dock, visible however far you scroll.
 * Desktop (md+): a larger stage in normal flow (the FAQ makes its column sticky).
 * Renders only while visible and the tab is active; frees the GPU when unmounted.
 */
export default function Foggy({ expression, interactive = true, lookAt = null, className }: FoggyProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const driverRef = useRef<Driver | null>(null);
  const expressionRef = useRef(expression);
  const lookAtRef = useRef(lookAt);
  const lookTowardRef = useRef<((clientX: number, clientY: number) => void) | null>(null);
  const [ready, setReady] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [mood, setMood] = useState("friendly");
  const [booped, setBooped] = useState(false);

  expressionRef.current = expression;
  lookAtRef.current = lookAt;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let disposed = false;
    let onScreen = true;
    const canvas = document.createElement("canvas");
    Object.assign(canvas.style, { display: "block", width: "100%", height: "100%", outline: "none", touchAction: "pan-y" });
    stage.appendChild(canvas);

    const send = (command: FoggyCommand) => driverRef.current?.send(command);
    const measure = () => {
      const rect = stage.getBoundingClientRect();
      return { width: rect.width || 300, height: rect.height || 300, devicePixelRatio: window.devicePixelRatio || 1 };
    };
    const syncActive = () => send({ type: "active", value: onScreen && document.visibilityState === "visible" });

    const onEvent = (event: FoggyEvent) => {
      if (disposed) return;
      if (event.type === "quality") canvas.dataset.quality = event.quality;
      else if (event.type === "firstFrame") setReady(true);
      else if (event.type === "mood") setMood(event.label);
      else if (event.type === "boop") setBooped(true);
      else if (event.type === "unsupported") setUnsupported(true);
    };

    // Start after the page has painted so the FAQ text never waits on Foggy.
    const start = () => {
      if (disposed) return;
      const init: FoggyInit = { ...measure(), reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches };
      driverRef.current = startInWorker(canvas, init, onEvent) ?? startOnPage(canvas, init, onEvent);
      sendTheme();
      send({ type: "expression", value: expressionRef.current });
      syncActive();
    };

    // Follow the site's light/dark switch (a "dark" class on <html>).
    const sendTheme = () => send({ type: "theme", dark: document.documentElement.classList.contains("dark") });
    const themeObserver = new MutationObserver(sendTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(start, { timeout: 600 })
      : window.setTimeout(start, 60);

    // Only draw while visible.
    const intersection = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      syncActive();
    });
    intersection.observe(stage);
    document.addEventListener("visibilitychange", syncActive);
    const resizeObserver = new ResizeObserver(() => send({ type: "resize", ...measure() }));
    resizeObserver.observe(stage);

    // Turn Foggy toward a point on screen. On phones he's small and tucked in a corner, so
    // the same distance counts for more (a shorter reach) and the glance reads clearly.
    const lookToward = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const reach = window.innerWidth < 768 ? 230 : 420;
      send({
        type: "look",
        x: (clientX - (rect.left + rect.width / 2)) / reach,
        y: -(clientY - (rect.top + rect.height / 2)) / reach,
      });
    };
    lookTowardRef.current = lookToward;

    // Eyes follow the cursor anywhere on the page (sent at most once per frame).
    let lookFrame = 0;
    let lastPointer: PointerEvent | null = null;
    const onWindowPointerMove = (event: PointerEvent) => {
      lastPointer = event;
      if (lookFrame) return;
      lookFrame = requestAnimationFrame(() => {
        lookFrame = 0;
        if (lastPointer && !lookAtRef.current) lookToward(lastPointer.clientX, lastPointer.clientY);
      });
    };
    // Phones have no hover: look at wherever you tap instead.
    const onWindowPointerDown = (event: PointerEvent) => {
      if (!lookAtRef.current) lookToward(event.clientX, event.clientY);
    };
    // Watch the page go by: glance up when scrolling down, down when scrolling up.
    let scrollFrame = 0;
    let lastScrollY = window.scrollY;
    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        const delta = window.scrollY - lastScrollY;
        lastScrollY = window.scrollY;
        if (Math.abs(delta) < 2 || lookAtRef.current) return;
        const offset = Math.max(-320, Math.min(320, delta * 10));
        lookToward(window.innerWidth / 2, window.innerHeight / 2 - offset);
      });
    };

    // Tap to boop, drag to spin.
    const onPointerDown = (event: PointerEvent) => {
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // older browsers
      }
      send({ type: "pointerDown", id: event.pointerId, x: event.clientX, y: event.clientY });
    };
    const onPointerMove = (event: PointerEvent) => {
      if (canvas.hasPointerCapture?.(event.pointerId)) {
        send({ type: "pointerMove", id: event.pointerId, x: event.clientX, y: event.clientY });
      }
    };
    const onPointerUp = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      send({
        type: "pointerUp",
        id: event.pointerId,
        ndcX: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        ndcY: -(((event.clientY - rect.top) / rect.height) * 2 - 1),
      });
    };
    const onPointerCancel = (event: PointerEvent) => send({ type: "pointerCancel", id: event.pointerId });

    window.addEventListener("pointermove", onWindowPointerMove, { passive: true });
    window.addEventListener("pointerdown", onWindowPointerDown, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerCancel);

    return () => {
      disposed = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      intersection.disconnect();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", syncActive);
      window.removeEventListener("pointermove", onWindowPointerMove);
      window.removeEventListener("pointerdown", onWindowPointerDown);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(lookFrame);
      cancelAnimationFrame(scrollFrame);
      lookTowardRef.current = null;
      driverRef.current?.dispose();
      driverRef.current = null;
      canvas.remove();
    };
  }, []);

  useEffect(() => {
    driverRef.current?.send({ type: "expression", value: expression });
  }, [expression]);

  // Keep looking at the target (it can move as the page scrolls or the keyboard opens).
  useEffect(() => {
    if (!lookAt) return;
    const aim = () => {
      const rect = lookAt.getBoundingClientRect();
      // The left part of a row is where the text is (what you're typing, or the question).
      lookTowardRef.current?.(rect.left + Math.min(rect.width * 0.3, 160), rect.top + rect.height / 2);
    };
    aim();
    const timer = window.setInterval(aim, 150);
    return () => window.clearInterval(timer);
  }, [lookAt]);

  if (unsupported) return null;

  return (
    <figure
      className={cn(
        "m-0 flex select-none flex-col",
        // Phones: floating companion above the mobile dock
        "fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] right-1 z-40 h-[122px] w-[124px]",
        // Desktop: stage in the page flow
        "md:static md:z-auto md:h-[300px] md:w-full",
        "transition-opacity duration-500",
        ready ? "opacity-100" : "opacity-0",
        !interactive && "pointer-events-none",
        className,
      )}
    >
      <div className="relative min-h-0 flex-1">
        {/* Soft spotlight that fades out before the edges, so there's never a visible box. */}
        <div className="absolute inset-0 hidden bg-[radial-gradient(closest-side_at_50%_45%,hsl(var(--secondary))_0%,transparent_100%)] md:block" />
        <div
          ref={stageRef}
          role="img"
          aria-label="Foggy, the CampusFind assistant. Tap to boop, drag to spin."
          className="relative h-full w-full cursor-grab active:cursor-grabbing"
        />
      </div>
      <figcaption className="pointer-events-none mt-2 hidden shrink-0 items-center justify-center gap-1.5 text-[12.5px] text-muted-foreground md:flex">
        <span>
          Feeling <b className="font-semibold text-foreground">{mood}</b>
        </span>
        <span
          className={cn("transition-opacity duration-500", booped ? "opacity-0" : "opacity-100")}
          aria-hidden={booped}
        >
          · tap to boop
        </span>
      </figcaption>
    </figure>
  );
}

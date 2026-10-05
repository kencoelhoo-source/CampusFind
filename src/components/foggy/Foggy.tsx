import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { PHONE_QUERY, useMediaQuery } from "@/hooks/use-media-query";
import type { FoggyExpression } from "./foggy-scene";
import type { FoggyCommand, FoggyEvent, FoggyInit } from "./foggy-messages";
import { startFoggy, type FoggyDriver } from "./foggy-driver";
import { createRoamer, type FoggyRoamer } from "./foggy-roam";

export type { FoggyExpression };

interface FoggyProps {
  /** Driven by the page (e.g. "typing" while an answer loads). */
  expression: FoggyExpression;
  /**
   * When false, taps pass straight through Foggy. The FAQ turns this off on phones while
   * you're typing, so he can never sit on top of the send button.
   */
  interactive?: boolean;
  /**
   * Something Foggy should keep looking at (e.g. the question box while you type). While
   * set, it overrides following the cursor, taps and scrolling.
   */
  lookAt?: HTMLElement | null;
  /** Phones: a box you're typing in. He goes and watches from just above it, out of its way. */
  watching?: HTMLElement | null;
  className?: string;
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isDark = () => document.documentElement.classList.contains("dark");

/**
 * Foggy, the 3D CampusFind assistant. Lazy-load this component.
 *
 * Phones: he roams the screen — walks the dock, climbs the page, can be picked up and thrown.
 * Desktop (md+): a larger stage in normal flow (the FAQ makes its column sticky).
 * Either way the 3D work runs in a worker, only while visible, and frees the GPU when unmounted.
 */
export default function Foggy(props: FoggyProps) {
  const phone = useMediaQuery(PHONE_QUERY);
  return phone ? <FoggyRoam {...props} /> : <FoggyStage {...props} />;
}

/* ───────────────────────── Desktop: a stage on the page ───────────────────────── */

function FoggyStage({ expression, interactive = true, lookAt = null, className }: FoggyProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const driverRef = useRef<FoggyDriver | null>(null);
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
      const init: FoggyInit = { ...measure(), reduceMotion: reducedMotion(), mode: "stage" };
      driverRef.current = startFoggy(canvas, init, onEvent);
      sendTheme();
      send({ type: "expression", value: expressionRef.current });
      syncActive();
    };

    // Follow the site's light/dark switch (a "dark" class on <html>).
    const sendTheme = () => send({ type: "theme", dark: isDark() });
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

    // Turn Foggy toward a point on screen.
    const lookToward = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const reach = 420;
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

  // Keep looking at the target (it can move as the page scrolls).
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
        "m-0 flex h-[300px] w-full select-none flex-col",
        "transition-opacity duration-500",
        ready ? "opacity-100" : "opacity-0",
        !interactive && "pointer-events-none",
        className,
      )}
    >
      <div className="relative min-h-0 flex-1">
        {/* Soft spotlight that fades out before the edges, so there's never a visible box. */}
        <div className="absolute inset-0 bg-[radial-gradient(closest-side_at_50%_45%,hsl(var(--secondary))_0%,transparent_100%)]" />
        <div
          ref={stageRef}
          role="img"
          aria-label="Foggy, the CampusFind assistant. Tap to boop, drag to spin."
          className="relative h-full w-full cursor-grab active:cursor-grabbing"
        />
      </div>
      <figcaption className="pointer-events-none mt-2 flex shrink-0 items-center justify-center gap-1.5 text-[12.5px] text-muted-foreground">
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

/* ───────────────────────── Phones: he roams the screen ───────────────────────── */

/** Canvas size, CSS px. Much bigger than Foggy so swings, tumbles and props never clip. */
const FIGURE = 168;

function FoggyRoam({ expression, interactive = true, lookAt = null, watching = null }: FoggyProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const figureRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const hitRef = useRef<HTMLDivElement>(null);
  const driverRef = useRef<FoggyDriver | null>(null);
  const roamerRef = useRef<FoggyRoamer | null>(null);
  const expressionRef = useRef(expression);
  const lookAtRef = useRef(lookAt);
  const lookTowardRef = useRef<((clientX: number, clientY: number) => void) | null>(null);
  const [ready, setReady] = useState(false);
  const [unsupported, setUnsupported] = useState(false);

  expressionRef.current = expression;
  lookAtRef.current = lookAt;

  useEffect(() => {
    const root = rootRef.current, figure = figureRef.current, shadow = shadowRef.current, hit = hitRef.current;
    if (!root || !figure || !shadow || !hit) return;

    let disposed = false;
    const reduceMotion = reducedMotion();
    const canvas = document.createElement("canvas");
    Object.assign(canvas.style, { display: "block", width: "100%", height: "100%" });
    figure.appendChild(canvas);

    const send = (command: FoggyCommand) => driverRef.current?.send(command);
    const roamer = createRoamer({ root, figure, shadow, hit }, { reduceMotion, send });
    roamerRef.current = roamer;
    // Dev only: poke him from the console (window.__foggy.act("explore")).
    if (import.meta.env.DEV) (window as unknown as { __foggy?: FoggyRoamer }).__foggy = roamer;

    // He walks in once the scene has drawn and told us where his feet are.
    let haveMetrics = false, haveFrame = false;
    const maybeStart = () => {
      if (!haveMetrics || !haveFrame || disposed) return;
      roamer.start();
      setReady(true);
    };
    const onEvent = (event: FoggyEvent) => {
      if (disposed) return;
      if (event.type === "metrics") {
        roamer.setMetrics(event);
        haveMetrics = true;
        maybeStart();
      } else if (event.type === "firstFrame") {
        haveFrame = true;
        maybeStart();
      } else if (event.type === "unsupported") {
        roamer.dispose();
        setUnsupported(true);
      }
    };

    const syncActive = () => send({ type: "active", value: document.visibilityState === "visible" });
    const sendTheme = () => send({ type: "theme", dark: isDark() });
    const start = () => {
      if (disposed) return;
      const init: FoggyInit = { width: FIGURE, height: FIGURE, devicePixelRatio: window.devicePixelRatio || 1, reduceMotion, mode: "roam" };
      driverRef.current = startFoggy(canvas, init, onEvent);
      sendTheme();
      send({ type: "expression", value: expressionRef.current });
      syncActive();
    };
    const themeObserver = new MutationObserver(sendTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(start, { timeout: 600 })
      : window.setTimeout(start, 60);

    // Turn his head toward a point on screen, from wherever he is right now.
    const lookToward = (clientX: number, clientY: number) => {
      const c = roamer.center();
      send({ type: "look", x: (clientX - c.x) / 230, y: -(clientY - c.y) / 230 });
    };
    lookTowardRef.current = lookToward;

    // Anything you do on the page makes him hold still (and look at where you tapped).
    const onWindowPointerDown = (event: PointerEvent) => {
      if (hit.contains(event.target as Node)) return;
      roamer.noteActivity("touch");
      if (!lookAtRef.current) lookToward(event.clientX, event.clientY);
    };
    let scrollFrame = 0;
    let lastScrollY = window.scrollY;
    const onScroll = () => {
      roamer.noteActivity("scroll");
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        const delta = window.scrollY - lastScrollY;
        lastScrollY = window.scrollY;
        if (Math.abs(delta) < 2 || lookAtRef.current) return;
        const c = roamer.center();
        lookToward(c.x, c.y - Math.max(-320, Math.min(320, delta * 10)));
      });
    };
    const onKeyDown = () => roamer.noteActivity("key");
    let hiddenAt = 0;
    const onVisibility = () => {
      syncActive();
      if (document.visibilityState === "hidden") hiddenAt = performance.now();
      else if (hiddenAt) roamer.welcomeBack(performance.now() - hiddenAt);
    };

    const down = (event: PointerEvent) => roamer.pointerDown(event);
    const move = (event: PointerEvent) => roamer.pointerMove(event);
    const up = (event: PointerEvent) => roamer.pointerUp(event);
    const cancel = (event: PointerEvent) => roamer.pointerCancel(event);
    const noMenu = (event: Event) => event.preventDefault(); // long-press picks him up, not a menu

    window.addEventListener("pointerdown", onWindowPointerDown, { passive: true, capture: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibility);
    hit.addEventListener("pointerdown", down);
    hit.addEventListener("pointermove", move);
    hit.addEventListener("pointerup", up);
    hit.addEventListener("pointercancel", cancel);
    hit.addEventListener("contextmenu", noMenu);

    return () => {
      disposed = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      themeObserver.disconnect();
      window.removeEventListener("pointerdown", onWindowPointerDown, { capture: true });
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibility);
      hit.removeEventListener("pointerdown", down);
      hit.removeEventListener("pointermove", move);
      hit.removeEventListener("pointerup", up);
      hit.removeEventListener("pointercancel", cancel);
      hit.removeEventListener("contextmenu", noMenu);
      cancelAnimationFrame(scrollFrame);
      lookTowardRef.current = null;
      roamer.dispose();
      roamerRef.current = null;
      driverRef.current?.dispose();
      driverRef.current = null;
      canvas.remove();
    };
  }, []);

  useEffect(() => {
    driverRef.current?.send({ type: "expression", value: expression });
  }, [expression]);

  useEffect(() => {
    roamerRef.current?.setContext({ busy: expression === "typing", focus: watching, interactive });
  }, [expression, watching, interactive]);

  useEffect(() => {
    if (!lookAt) return;
    const aim = () => {
      const rect = lookAt.getBoundingClientRect();
      lookTowardRef.current?.(rect.left + Math.min(rect.width * 0.3, 160), rect.top + rect.height / 2);
    };
    aim();
    const timer = window.setInterval(aim, 150);
    return () => window.clearInterval(timer);
  }, [lookAt]);

  if (unsupported) return null;

  return createPortal(
    <div ref={rootRef} className={cn("foggy-roam", ready && "is-ready")}>
      <div ref={shadowRef} className="foggy-roam-shadow" aria-hidden />
      <div ref={figureRef} className="foggy-roam-figure" aria-hidden />
      <div
        ref={hitRef}
        role="img"
        aria-label="Foggy, the CampusFind assistant. Tap to boop him; press and drag to carry him anywhere."
        className="foggy-roam-hit"
      />
    </div>,
    document.body,
  );
}

/**
 * Starts Foggy's scene for a canvas: in a worker when the browser can hand the canvas over
 * (OffscreenCanvas), otherwise on the page. Either way the caller gets the same `send`.
 */
import type { FoggyController } from "./foggy-scene";
import { applyCommand, createCommandBuffer, type FoggyCommand, type FoggyEvent, type FoggyInit, type FoggyWorkerMessage } from "./foggy-messages";

export interface FoggyDriver {
  send(command: FoggyCommand): void;
  dispose(): void;
}

/** Preferred: the whole scene lives in a worker, drawing into an OffscreenCanvas. */
function startInWorker(canvas: HTMLCanvasElement, init: FoggyInit, onEvent: (event: FoggyEvent) => void): FoggyDriver | null {
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
function startOnPage(canvas: HTMLCanvasElement, init: FoggyInit, onEvent: (event: FoggyEvent) => void): FoggyDriver {
  let controller: FoggyController | null = null;
  let cancelled = false;
  const pending = createCommandBuffer();

  import("./foggy-scene")
    .then(({ createFoggyScene }) =>
      createFoggyScene(canvas, {
        ...init,
        isCancelled: () => cancelled,
        onMetrics: (metrics) => onEvent({ type: "metrics", ...metrics }),
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

export function startFoggy(canvas: HTMLCanvasElement, init: FoggyInit, onEvent: (event: FoggyEvent) => void): FoggyDriver {
  return startInWorker(canvas, init, onEvent) ?? startOnPage(canvas, init, onEvent);
}

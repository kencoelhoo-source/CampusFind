/**
 * Runs Foggy on a background thread. Loading three.js, building the character, compiling
 * shaders and drawing every frame all happen here, so none of it can freeze the page.
 */
import { createFoggyScene, type FoggyController } from "./foggy-scene";
import { applyCommand, createCommandBuffer, type FoggyEvent, type FoggyWorkerMessage } from "./foggy-messages";

const scope = self as unknown as {
  postMessage(event: FoggyEvent): void;
  onmessage: ((event: MessageEvent<FoggyWorkerMessage>) => void) | null;
  close(): void;
};

let controller: FoggyController | null = null;
let cancelled = false;
const pending = createCommandBuffer();

scope.onmessage = (event) => {
  const message = event.data;
  if (message.type === "init") {
    void start(message);
  } else if (message.type === "dispose") {
    cancelled = true;
    controller?.dispose();
    controller = null;
    scope.close();
  } else if (controller) {
    applyCommand(controller, message);
  } else {
    pending.remember(message);
  }
};

async function start(init: Extract<FoggyWorkerMessage, { type: "init" }>) {
  try {
    controller = await createFoggyScene(init.canvas, {
      width: init.width,
      height: init.height,
      devicePixelRatio: init.devicePixelRatio,
      reduceMotion: init.reduceMotion,
      isCancelled: () => cancelled,
      onQuality: (quality) => scope.postMessage({ type: "quality", quality }),
      onFirstFrame: () => scope.postMessage({ type: "firstFrame" }),
      onMoodChange: (label) => scope.postMessage({ type: "mood", label }),
      onBoop: () => scope.postMessage({ type: "boop" }),
    });
  } catch {
    scope.postMessage({ type: "unsupported" }); // no WebGL in workers on this browser
    return;
  }
  if (controller) pending.flush(controller);
}

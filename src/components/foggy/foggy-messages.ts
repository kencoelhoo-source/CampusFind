/**
 * Messages between the page and Foggy's scene. Types only from foggy-scene, so importing
 * this never pulls three.js onto the page.
 */
import type { FoggyController, FoggyCue, FoggyExpression, FoggyMetrics, FoggyMode, FoggyMotion, FoggyQuality } from "./foggy-scene";

/** Page → scene. */
export type FoggyCommand =
  | { type: "expression"; value: FoggyExpression }
  | { type: "active"; value: boolean }
  | { type: "theme"; dark: boolean }
  | { type: "resize"; width: number; height: number; devicePixelRatio: number }
  | { type: "look"; x: number; y: number }
  | { type: "pointerDown"; id: number; x: number; y: number }
  | { type: "pointerMove"; id: number; x: number; y: number }
  | { type: "pointerUp"; id: number; ndcX: number; ndcY: number }
  | { type: "pointerCancel"; id: number }
  | ({ type: "motion" } & FoggyMotion)
  | { type: "cue"; name: FoggyCue; strength?: number };

export interface FoggyInit {
  width: number;
  height: number;
  devicePixelRatio: number;
  reduceMotion: boolean;
  mode: FoggyMode;
}

/** Page → worker. */
export type FoggyWorkerMessage = ({ type: "init"; canvas: OffscreenCanvas } & FoggyInit) | { type: "dispose" } | FoggyCommand;

/** Scene → page. */
export type FoggyEvent =
  | { type: "quality"; quality: FoggyQuality }
  | { type: "firstFrame" }
  | { type: "mood"; label: string }
  | { type: "boop" }
  | ({ type: "metrics" } & FoggyMetrics)
  | { type: "unsupported" };

export function applyCommand(controller: FoggyController, command: FoggyCommand) {
  switch (command.type) {
    case "expression":
      return controller.setExpression(command.value);
    case "active":
      return controller.setActive(command.value);
    case "theme":
      return controller.setTheme(command.dark);
    case "resize":
      return controller.resize(command.width, command.height, command.devicePixelRatio);
    case "look":
      return controller.look(command.x, command.y);
    case "pointerDown":
      return controller.pointerDown(command.id, command.x, command.y);
    case "pointerMove":
      return controller.pointerMove(command.id, command.x, command.y);
    case "pointerUp":
      return controller.pointerUp(command.id, command.ndcX, command.ndcY);
    case "pointerCancel":
      return controller.pointerCancel(command.id);
    case "motion":
      return controller.setMotion({ pose: command.pose, vx: command.vx, vy: command.vy, face: command.face, spin: command.spin });
    case "cue":
      return controller.cue(command.name, command.strength);
  }
}

type Remembered = "resize" | "theme" | "expression" | "active" | "motion";

/**
 * Holds the latest size/theme/expression/active/motion state sent while the scene is still
 * being built, then replays it once (in that order). Pointer input and cues from before then
 * are simply dropped.
 */
export function createCommandBuffer() {
  const latest: Partial<Record<Remembered, FoggyCommand>> = {};
  const order: Remembered[] = ["resize", "theme", "expression", "active", "motion"];
  return {
    remember(command: FoggyCommand) {
      if ((order as string[]).includes(command.type)) latest[command.type as Remembered] = command;
    },
    flush(controller: FoggyController) {
      order.forEach((key) => {
        const command = latest[key];
        if (command) applyCommand(controller, command);
      });
    },
  };
}

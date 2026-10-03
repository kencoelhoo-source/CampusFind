/**
 * Messages between the page and Foggy's scene. Types only from foggy-scene, so importing
 * this never pulls three.js onto the page.
 */
import type { FoggyController, FoggyExpression, FoggyQuality } from "./foggy-scene";

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
  | { type: "pointerCancel"; id: number };

export interface FoggyInit {
  width: number;
  height: number;
  devicePixelRatio: number;
  reduceMotion: boolean;
}

/** Page → worker. */
export type FoggyWorkerMessage = ({ type: "init"; canvas: OffscreenCanvas } & FoggyInit) | { type: "dispose" } | FoggyCommand;

/** Scene → page. */
export type FoggyEvent =
  | { type: "quality"; quality: FoggyQuality }
  | { type: "firstFrame" }
  | { type: "mood"; label: string }
  | { type: "boop" }
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
  }
}

/**
 * Holds the latest size/theme/expression/active state sent while the scene is still being built,
 * then replays it once (in that order). Pointer input from before then is simply dropped.
 */
export function createCommandBuffer() {
  const latest: Partial<Record<"resize" | "theme" | "expression" | "active", FoggyCommand>> = {};
  return {
    remember(command: FoggyCommand) {
      if (command.type === "resize" || command.type === "theme" || command.type === "expression" || command.type === "active") {
        latest[command.type] = command;
      }
    },
    flush(controller: FoggyController) {
      (["resize", "theme", "expression", "active"] as const).forEach((key) => {
        const command = latest[key];
        if (command) applyCommand(controller, command);
      });
    },
  };
}

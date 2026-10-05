/**
 * Foggy's brain on phones: where he goes, how he gets there and what he does once he's there.
 *
 * It runs on the page because it needs the layout; the 3D scene (in the worker) only turns the
 * `motion` it receives into poses. Positions are viewport px, measured at his feet.
 *
 * His world:
 * - Ground: the top of the mobile dock.
 * - Ledges: the top (or bottom, with `data-foggy-ledge="bottom"`) edge of every
 *   `[data-foggy-ledge]` element. One-way platforms: he jumps up through them and lands on top.
 * - Boxes: small things in his way on a ledge (icons, little buttons, `[data-foggy-box]`). He
 *   hops over them, or treats them as the end of the path when there's no room beyond.
 *
 * Manners, so he never gets annoying: he only wanders while you're idle and stops the moment you
 * scroll, touch or type; he steps out from in front of small buttons; only his body takes taps;
 * he keeps to the lower part of the screen; and he rests far more than he moves.
 */
import type { FoggyCommand } from "./foggy-messages";
import type { FoggyCue, FoggyMetrics, FoggyPose } from "./foggy-scene";
import {
  GRAVITY,
  boxInBand,
  findLanding,
  hurdleLanding,
  obstacleAhead,
  planClimb,
  solveJump,
  surfaceBelow,
  walkableSpan,
  type BodySize,
  type Box,
  type Surface,
} from "./foggy-world";

export interface RoamElements {
  /** Fixed to the screen, or absolute in the page while he stands on a ledge. */
  root: HTMLElement;
  /** Holds the canvas. */
  figure: HTMLElement;
  shadow: HTMLElement;
  /** The only part that takes touches: an oval over his body. */
  hit: HTMLElement;
}

export interface RoamContext {
  /** He's "typing" an answer: sit down and type. */
  busy: boolean;
  /** The question box while you type in it: he goes and watches from the ledge above it. */
  focus: HTMLElement | null;
  /** When false, taps go straight through him. */
  interactive: boolean;
}

export interface FoggyRoamer {
  setMetrics(metrics: FoggyMetrics): void;
  /** His first frame is on screen: walk in. */
  start(): void;
  setContext(context: Partial<RoamContext>): void;
  /** You scrolled, touched the page or typed. */
  noteActivity(kind: "scroll" | "touch" | "key"): void;
  /** You came back to the tab after `awayMs`. */
  welcomeBack(awayMs: number): void;
  /** Middle of his body, viewport px (to aim his gaze from). */
  center(): { x: number; y: number };
  pointerDown(event: PointerEvent): void;
  pointerMove(event: PointerEvent): void;
  pointerUp(event: PointerEvent): void;
  pointerCancel(event: PointerEvent): void;
  /** Dev tools / tests: what he's doing, and make him do something now. */
  snapshot(): Record<string, unknown>;
  act(name: string): void;
  dispose(): void;
}

const LEDGES = "[data-foggy-ledge]";
const BOXES = "[data-foggy-box], [data-foggy-ledge] svg, [data-foggy-ledge] button";
const CONTROLS = "a[href], button, input, textarea, select, label, [role='button'], [role='link']";
/** Height of the phone navbar: his ceiling. */
const NAV_BOTTOM = 56;
/** Walking speeds, px/s. */
const AMBLE = 50;
const WALK = 64;
const HURRY = 120;
const MAX_FALL = 2300;
const SHADOW_W = 58;
const SHADOW_H = 12;

type Script = (token: number) => Promise<void>;

class Interrupted extends Error {}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const chance = (p: number) => Math.random() < p;
function pick<T>(options: [number, T][]): T {
  const total = options.reduce((sum, [w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [w, value] of options) {
    roll -= w;
    if (roll <= 0 && w > 0) return value;
  }
  return options.find(([w]) => w > 0)?.[1] ?? options[0][1];
}

export function createRoamer(els: RoamElements, options: { reduceMotion: boolean; send: (command: FoggyCommand) => void }): FoggyRoamer {
  const { send, reduceMotion } = options;
  const clipSupported = typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("overflow-x", "clip");
  const now = () => performance.now();
  const cue = (name: FoggyCue, strength?: number) => send({ type: "cue", name, strength });
  const look = (lx: number, ly: number) => send({ type: "look", x: lx, y: ly });

  let metrics: FoggyMetrics | null = null;
  let body: BodySize = { halfWidth: 30, height: 66 };
  let holdH = 73;
  let started = false;
  let disposed = false;

  /* ---------- where he is ---------- */
  let phys: "stand" | "air" | "held" = "stand";
  let x = -999, y = 0, vx = 0, vy = 0, spin = 0;
  /** Velocity spring's acceleration while walking. */
  let accel = 0;
  const ground: Surface = { key: "ground", kind: "ground", x1: 0, x2: 0, y: 0 };
  let on: Surface = ground;
  let onEl: Element | null = null;
  /** Positioned in page coordinates (riding a ledge, so scrolling carries him natively). */
  let page = false;
  let landOnly: ((surface: Surface) => boolean) | null = null;
  let thrown = false;
  let lastSurfaces: Surface[] = [];

  /* ---------- walking ---------- */
  let targetX: number | null = null;
  let cruise = WALK;
  let facing: -1 | 1 = -1;
  let face: -1 | 0 | 1 = 0;
  let faceViewerIn = 0;
  let turning = 0;
  let pose: FoggyPose = "stand";
  let crouch = 0;
  let launch: (() => void) | null = null;
  let boxes: Box[] = [];
  let boxesAge = 1;
  let span: [number, number] = [0, 0];

  /* ---------- being carried ---------- */
  let press: { id: number; x: number; y: number; time: number; moved: number } | null = null;
  let longPress = 0;
  let hand = { x: 0, y: 0 };
  let hold = { x: 0, y: 0 };
  let grabOffset = { x: 0, y: 0 };
  let grabTarget = { x: 0, y: 0 };
  let samples: { t: number; x: number; y: number }[] = [];
  let handVx = 0;
  let taps: number[] = [];

  /* ---------- manners ---------- */
  let lastActivity = now();
  let lastScroll = 0;
  let context: RoamContext = { busy: false, focus: null, interactive: true };
  let lastExplore = now() - 15000;
  let lastWave = 0;
  let lastYawn = 0;
  let restUntil = now() + 2500;
  let politeCheck = 0;
  let ledgeSince = 0;
  let prevScrollY = window.scrollY;
  let scrollSpeed = 0;
  let braceCool = 0;

  /* ---------- scripts ---------- */
  let token = 0;
  let scriptRunning = false;
  let sticky = false;
  let pending: { resolve: () => void; reject: (reason: unknown) => void } | null = null;
  let pendingKind: "walk" | "jump" | "wait" | null = null;
  let waitLeft = 0;

  /* ---------- frame ---------- */
  let raf = 0;
  let last = now();
  let clock = 0;
  let vw = window.innerWidth;
  let vh = window.innerHeight;
  let scrollY = window.scrollY;
  let dockEl: HTMLElement | null = null;
  const written = { position: "", figure: "", hit: "", shadow: "", opacity: "" };
  let lastMotion = "";

  /* ---------- the world ---------- */

  function readGround() {
    if (!dockEl?.isConnected) dockEl = document.querySelector<HTMLElement>(".mobile-dock");
    const r = dockEl?.getBoundingClientRect();
    if (r && r.width > 0 && r.height > 0) {
      ground.y = r.top + 1;
      ground.x1 = r.left + 16;
      ground.x2 = r.right - 16;
    } else {
      ground.y = vh - 14;
      ground.x1 = 10;
      ground.x2 = vw - 10;
    }
  }

  const keys = new WeakMap<Element, string>();
  const ledgeEls = new Map<string, Element>();
  let keySeq = 0;
  function keyOf(el: Element) {
    let key = keys.get(el);
    if (!key) {
      key = `ledge-${++keySeq}`;
      keys.set(el, key);
    }
    return key;
  }

  function ledgeOf(el: Element): Surface | null {
    if (!el.isConnected) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height <= 0) return null;
    const y = (el as HTMLElement).dataset.foggyLedge === "bottom" ? r.bottom - 0.5 : r.top;
    return { key: keyOf(el), kind: "ledge", x1: r.left, x2: r.right, y };
  }

  /** Ledges on screen, between the navbar and the dock. */
  function scanLedges(): Surface[] {
    const found: Surface[] = [];
    document.querySelectorAll(LEDGES).forEach((el) => {
      if (els.root.contains(el)) return;
      const surface = ledgeOf(el);
      if (!surface || surface.y < NAV_BOTTOM || surface.y > ground.y - 4) return;
      ledgeEls.set(surface.key, el);
      found.push(surface);
    });
    return found;
  }

  /** Everything he can land on; the ground catches him anywhere across the screen. */
  function allSurfaces() {
    lastSurfaces = [...scanLedges(), { ...ground, x1: -1e4, x2: 1e4 }];
    return lastSurfaces;
  }

  function scanBoxes(): Box[] {
    if (on.kind === "ground") return [];
    const found: Box[] = [];
    document.querySelectorAll(BOXES).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4 || r.width > 72 || r.height > 72) return;
      const box = { x1: r.left, x2: r.right, top: r.top, bottom: r.bottom };
      if (boxInBand(box, on.y, body.height)) found.push(box);
    });
    return found;
  }

  function refreshSpan() {
    boxes = scanBoxes();
    span = walkableSpan(on, boxes, x, body);
    boxesAge = 0;
  }

  /** Would he stand in front of a small button or link at `atX`? */
  function blocksControl(atX: number) {
    const points: [number, number][] = [[0, 0.5], [-0.55, 0.35], [0.55, 0.35], [0, 0.85]];
    for (const [fx, fy] of points) {
      const px = atX + fx * body.halfWidth;
      const py = y - fy * body.height;
      if (px < 0 || px > vw || py < 0 || py > vh) continue;
      for (const el of document.elementsFromPoint(px, py)) {
        if (els.root.contains(el)) continue;
        const control = el.closest(CONTROLS);
        if (control && !control.closest(".mobile-dock")) {
          const r = control.getBoundingClientRect();
          // Covering a corner of a whole-row button is fine; covering a little one is not.
          if (r.width * r.height < 120 * 80) return true;
        }
        break; // only the topmost page element matters
      }
    }
    return false;
  }

  /* ---------- physics ---------- */

  function takeOff(nextVx: number, nextVy: number, only: ((surface: Surface) => boolean) | null) {
    phys = "air";
    vx = nextVx;
    vy = nextVy;
    accel = 0;
    landOnly = only;
    page = false;
    onEl = null;
  }

  function loseFooting() {
    interrupt();
    if (pose !== "stand") pose = "stand";
    takeOff(0, 0, null);
    thrown = false;
  }

  function land(surface: Surface, atX: number) {
    const impact = vy;
    const wasThrown = thrown;
    thrown = false;
    phys = "stand";
    landOnly = null;
    spin = 0;
    x = atX;
    y = surface.y;
    vy = 0;
    accel = 0;
    if (surface.kind === "ground") {
      on = ground;
      onEl = null;
      page = false;
    } else {
      on = surface;
      onEl = ledgeEls.get(surface.key) ?? null;
      page = Boolean(onEl);
      ledgeSince = now();
    }
    // A hurdle keeps its stride; a thrown landing stumbles on a few steps; a planned jump sticks.
    if (wasThrown && Math.abs(vx) > 60) {
      vx *= 0.3;
      facing = vx > 0 ? 1 : -1;
    } else if (targetX === null) vx = 0;
    refreshSpan();
    const strength = clamp((impact - 250) / 1500, 0, 1);
    if (impact > 140) cue("land", strength);
    if (pendingKind === "jump") settle();
    if (wasThrown) recover(strength);
  }

  function stepStand(dt: number) {
    if (on.kind === "ledge") {
      const surface = onEl ? ledgeOf(onEl) : null;
      if (!surface) return loseFooting();
      on = surface;
      // Carried up under the navbar by your scrolling: he slips off and falls.
      if (surface.y < NAV_BOTTOM + body.height + 14) return loseFooting();
      // Carried down into the dock: he just steps onto it.
      if (surface.y > ground.y - 3) {
        on = ground;
        onEl = null;
        page = false;
      } else if (x < surface.x1 - body.halfWidth * 0.3 || x > surface.x2 + body.halfWidth * 0.3) {
        return loseFooting(); // the ledge moved out from under him
      }
    }
    if (on.kind === "ground") on = ground;
    y = on.y;

    boxesAge += dt;
    if (boxesAge > 0.25) refreshSpan();

    if (crouch > 0) {
      crouch -= dt;
      vx *= Math.exp(-dt * 7);
      x += vx * dt;
      if (crouch <= 0 && launch) {
        const go = launch;
        launch = null;
        go();
      }
      return;
    }
    walk(dt);
  }

  function walk(dt: number) {
    let desired = 0;
    if (targetX !== null) {
      const facedYou = face === 0;
      face = facing;
      const dist = targetX - x;
      const dir: -1 | 1 = dist > 0 ? 1 : -1;
      if (Math.abs(dist) < 0.6 && Math.abs(vx) < 8) {
        x = targetX;
        vx = 0;
        accel = 0;
        arrive();
        return;
      }
      if (dir !== facing && Math.abs(vx) < 10) {
        // Turn around before setting off (quicker from facing you than from facing away).
        facing = dir;
        face = dir;
        turning = facedYou ? 0.14 : 0.24;
      }
      if (turning > 0) turning -= dt;
      else if (dir === facing) {
        const wobble = 1 + 0.06 * Math.sin(clock * 0.9) + 0.04 * Math.sin(clock * 2.3);
        const braking = Math.sqrt(2 * 240 * Math.max(0, Math.abs(dist) - Math.abs(vx) * 0.1)) + 4;
        desired = dir * Math.min(cruise * wobble, braking);
      }
    }
    // Speed follows a critically damped spring: an S-curve as he sets off, no robotic jolts.
    const k = 38;
    accel += (k * (desired - vx) - 2 * Math.sqrt(k) * accel) * dt;
    vx += accel * dt;
    if (desired === 0 && Math.abs(vx) < 1.5) {
      vx = 0;
      accel = 0;
    }
    let nx = x + vx * dt;
    if (targetX !== null && (targetX - x) * (targetX - nx) < 0) {
      nx = targetX; // never overshoot
      vx = 0;
      accel = 0;
    }
    x = nx;
    if (Math.abs(vx) > 14) hurdleCheck();
    if (faceViewerIn > 0 && targetX === null) {
      faceViewerIn -= dt;
      if (faceViewerIn <= 0) face = 0; // arrived: turn to you
    }
  }

  /** Something small in the way? Hop it without breaking stride. */
  function hurdleCheck() {
    const dir = vx > 0 ? 1 : -1;
    const box = obstacleAhead(boxes, on.y, x, dir, body, Math.abs(vx) * 0.3 + 6, targetX ?? x);
    if (!box) return;
    const landX = hurdleLanding(box, dir, body);
    if (landX < span[0] || landX > span[1]) return;
    const surfaceKey = on.key;
    const apex = on.y - box.top + 12;
    crouch = 0.07;
    vx *= 0.9;
    launch = () => {
      const jump = solveJump(x, y, landX, y, apex);
      takeOff(jump.vx, jump.vy, (surface) => surface.key === surfaceKey);
    };
  }

  function stepAir(dt: number) {
    if (y > ground.y + 2) {
      // The ground moved up past him (e.g. the keyboard opened): stand on it.
      land({ ...ground }, clamp(x, 0, vw));
      return;
    }
    vy = Math.min(vy + GRAVITY * dt, MAX_FALL);
    let nx = x + vx * dt;
    let ny = y + vy * dt;
    const margin = body.halfWidth * 0.85;
    if (nx < margin || nx > vw - margin) {
      // Screen edges are walls: bounce off them, flattening on a hard hit.
      const intoWall = (nx < margin && vx < 0) || (nx > vw - margin && vx > 0);
      nx = clamp(nx, margin, vw - margin);
      if (intoWall) {
        const speed = Math.abs(vx);
        vx = -vx * 0.42;
        spin *= -0.5;
        if (speed > 380) cue("bonk", Math.min(1, speed / 1600));
      }
    }
    if (ny - body.height < NAV_BOTTOM + 2 && vy < 0) {
      ny = NAV_BOTTOM + 2 + body.height;
      if (vy < -500) cue("bonk", Math.min(1, -vy / 1800));
      vy = -vy * 0.25;
    }
    if (vy > 0) {
      // While you're scrolling, ledges race past: only the ground catches him then.
      const scrolling = now() - lastScroll < 400;
      const landing = findLanding(allSurfaces(), nx, y, ny, (s) => s.kind === "ground" || (!scrolling && (!landOnly || landOnly(s))));
      if (landing) {
        land(landing, nx);
        return;
      }
    } else allSurfaces();
    x = nx;
    y = ny;
  }

  function stepHeld(dt: number) {
    // Your finger has his weight: the grab point eases in under it and he trails a touch.
    const ease = 1 - Math.exp(-dt * 9);
    grabOffset.x += (grabTarget.x - grabOffset.x) * ease;
    grabOffset.y += (grabTarget.y - grabOffset.y) * ease;
    const follow = 1 - Math.exp(-dt * 26);
    const before = hold.x;
    hold.x += (hand.x + grabOffset.x - hold.x) * follow;
    hold.y += (hand.y + grabOffset.y - hold.y) * follow;
    // However far your finger goes, he stays on screen, below the navbar and above the dock.
    const margin = body.halfWidth * 0.85;
    hold.x = clamp(hold.x, margin, vw - margin);
    hold.y = clamp(hold.y, NAV_BOTTOM + body.height + 4 - holdH, ground.y - holdH);
    handVx += ((hold.x - before) / Math.max(dt, 1e-3) - handVx) * Math.min(1, dt * 20);
    x = hold.x;
    y = hold.y + holdH;
    allSurfaces();
  }

  /* ---------- scripts (async, cancelled by `interrupt`) ---------- */

  function check(t: number) {
    if (t !== token) throw new Interrupted();
  }

  function block(kind: "walk" | "jump" | "wait", t: number) {
    check(t);
    return new Promise<void>((resolve, reject) => {
      pending = { resolve, reject };
      pendingKind = kind;
    });
  }

  function settle() {
    const done = pending;
    pending = null;
    pendingKind = null;
    done?.resolve();
  }

  function interrupt() {
    token++;
    const stale = pending;
    pending = null;
    pendingKind = null;
    stale?.reject(new Interrupted());
    targetX = null; // stop walking (he slows down; no sudden halt)
    if (crouch > 0 && phys === "stand") {
      crouch = 0;
      launch = null;
    }
    scriptRunning = false;
    sticky = false;
  }

  async function run(script: Script, opts: { sticky?: boolean } = {}) {
    interrupt();
    const t = token;
    scriptRunning = true;
    sticky = Boolean(opts.sticky);
    try {
      await script(t);
    } catch (error) {
      if (!(error instanceof Interrupted)) throw error;
    } finally {
      if (t === token) {
        scriptRunning = false;
        sticky = false;
        restUntil = now() + rand(2500, 6500);
      }
    }
  }

  function wait(seconds: number, t: number) {
    waitLeft = seconds;
    return block("wait", t);
  }

  function arrive() {
    targetX = null;
    faceViewerIn = rand(0.3, 0.7);
    if (pendingKind === "walk") settle();
  }

  function walkTo(tx: number, speed: number, t: number) {
    check(t);
    refreshSpan();
    const goal = clamp(tx, span[0], span[1]);
    if (Math.abs(goal - x) < 2) return Promise.resolve();
    targetX = goal;
    cruise = speed;
    if (pose !== "stand") pose = "stand";
    return block("walk", t);
  }

  function jumpTo(target: Surface, landX: number, apex: number, t: number) {
    check(t);
    facing = landX >= x ? 1 : -1;
    face = facing;
    crouch = reduceMotion ? 0.05 : 0.16;
    launch = () => {
      const el = ledgeEls.get(target.key);
      const fresh = target.kind === "ground" ? ground : (el && ledgeOf(el)) || target;
      const jump = solveJump(x, y, landX, fresh.y, apex);
      takeOff(jump.vx, jump.vy, (surface) => surface.key === target.key);
    };
    return block("jump", t);
  }

  /** Hop off this ledge and fall to whatever is below. */
  function dropDown(t: number) {
    check(t);
    const passing = on.key;
    const dir = facing;
    crouch = 0.12;
    launch = () => takeOff(dir * 50, -320, (surface) => surface.key !== passing);
    return block("jump", t);
  }

  function currentSpan() {
    refreshSpan();
    return span;
  }

  async function standUp(t: number) {
    if (pose !== "stand") {
      pose = "stand";
      await wait(0.4, t);
    }
  }

  const lookAround: Script = async (t) => {
    face = 0;
    const dir = chance(0.5) ? 1 : -1;
    look(dir * 0.9, 0.15);
    await wait(rand(0.8, 1.3), t);
    look(-dir * 0.9, 0.05);
    await wait(rand(0.8, 1.3), t);
    look(0, 0.1);
    await wait(0.6, t);
  };

  const stroll: Script = async (t) => {
    await standUp(t);
    const [lo, hi] = currentSpan();
    const reach = Math.max(60, Math.min(200, (hi - lo) * 0.6));
    let goal = x + (chance(0.5) ? 1 : -1) * rand(50, reach);
    if (goal < lo + 20 || goal > hi - 20) goal = x + (x > (lo + hi) / 2 ? -1 : 1) * rand(50, reach); // head back toward the middle
    await walkTo(goal, rand(AMBLE, WALK + 8), t);
    await wait(rand(0.5, 1.2), t);
    if (chance(0.35)) await lookAround(t);
  };

  const sitAWhile: Script = async (t) => {
    face = 0;
    await wait(0.25, t);
    pose = "sit";
    await wait(rand(5, 11), t);
    pose = "stand";
    await wait(0.5, t);
  };

  const waveHello: Script = async (t) => {
    await standUp(t);
    face = 0;
    await wait(0.3, t);
    cue("wave");
    lastWave = now();
    await wait(2.3, t);
  };

  const yawnStretch: Script = async (t) => {
    await standUp(t);
    face = 0;
    await wait(0.2, t);
    cue("yawn");
    lastYawn = now();
    await wait(2.2, t);
  };

  const twirl: Script = async (t) => {
    cue("twirl");
    await wait(1.3, t);
  };

  /** Walk to the end of what he's on and lean over to look down. */
  const peekEdge: Script = async (t) => {
    await standUp(t);
    const [lo, hi] = currentSpan();
    const dir: -1 | 1 = x - lo < hi - x ? -1 : 1;
    await walkTo(dir < 0 ? lo : hi, WALK, t);
    face = dir;
    pose = "peek";
    await wait(rand(1.2, 2), t);
    pose = "stand";
    await wait(0.3, t);
    await walkTo(x - dir * rand(40, 90), AMBLE, t);
  };

  /** Sit on the ledge with his feet dangling over the front. */
  const edgeSit: Script = async (t) => {
    await standUp(t);
    if (chance(0.5)) {
      const [lo, hi] = currentSpan();
      await walkTo(rand(lo, hi), AMBLE, t);
    }
    face = 0;
    await wait(0.35, t);
    pose = "edgeSit";
    await wait(rand(6, 12), t);
    pose = "stand";
    await wait(0.5, t);
  };

  /** A good long walk along a ledge (hopping whatever's in the way). */
  const ledgeStroll: Script = async (t) => {
    await standUp(t);
    const [lo, hi] = currentSpan();
    const goal = x - lo > hi - x ? rand(lo, lo + (hi - lo) * 0.3) : rand(hi - (hi - lo) * 0.3, hi);
    await walkTo(goal, WALK, t);
    await wait(rand(0.6, 1.4), t);
  };

  /** Back down to the dock: one hop if it's close, otherwise a ledge at a time. */
  const goDown: Script = async (t) => {
    await standUp(t);
    for (let guard = 0; on.kind === "ledge" && guard < 8; guard++) {
      face = facing;
      await wait(rand(0.2, 0.5), t);
      if (ground.y - on.y < body.height * 2.6 && chance(0.6)) {
        const landX = clamp(x + facing * rand(16, 34), ground.x1 + body.halfWidth, ground.x2 - body.halfWidth);
        await jumpTo(ground, landX, 14, t);
      } else {
        await dropDown(t);
      }
      await wait(rand(0.25, 0.5), t);
    }
  };

  /** Climb up a ledge or three, look around up there, come back down. */
  const explore: Script = async (t) => {
    lastExplore = now();
    await standUp(t);
    // Only ledges in the lower part of the screen: he never climbs up over what you're reading.
    const ledges = scanLedges().filter((s) => s.y > vh * 0.36 && s.y < ground.y - 46 && s.x2 - s.x1 > 100);
    const levels = chance(0.55) ? 1 : chance(0.6) ? 2 : 3;
    const path = planClimb(ledges, on, x, levels, body.height * 2.1, body);
    if (!path.length) return stroll(t);
    for (const step of path) {
      await walkTo(step.x, WALK, t);
      face = 0;
      look(0, 0.8); // size it up
      await wait(rand(0.3, 0.6), t);
      const landX = clamp(
        step.x + (chance(0.5) ? 1 : -1) * rand(10, 26),
        step.surface.x1 + body.halfWidth + 8,
        step.surface.x2 - body.halfWidth - 8,
      );
      await jumpTo(step.surface, landX, 26, t);
      if (on.key !== step.surface.key) return; // the page moved under him mid-jump
      await wait(rand(0.3, 0.7), t);
    }
    const plays = chance(0.5) ? 2 : 1;
    for (let i = 0; i < plays; i++) {
      await pick<Script>([[3, ledgeStroll], [2.4, edgeSit], [1.4, peekEdge], [1, lookAround], [0.6, waveHello]])(t);
    }
    await goDown(t);
  };

  const sleep: Script = async (t) => {
    await standUp(t);
    face = 0;
    if (chance(0.7)) {
      cue("yawn");
      await wait(2.1, t);
    }
    pose = "sit";
    await wait(rand(1.5, 2.5), t);
    pose = "sleep";
  };

  /** Out from in front of a small button, to the nearest clear spot. */
  const stepAside: Script = async (t) => {
    const [lo, hi] = currentSpan();
    for (const d of [24, -24, 48, -48, 72, -72, 100, -100, 140, -140, 180, -180]) {
      const nx = x + d;
      if (nx < lo || nx > hi || blocksControl(nx)) continue;
      await walkTo(nx, 95, t);
      return;
    }
  };

  /** Back onto the dock after landing past its end (or the screen rotating). */
  const backInside: Script = async (t) => {
    const [lo, hi] = currentSpan();
    await walkTo(clamp(x, lo, hi), WALK, t);
  };

  /** While you type a question: watch from the ledge just above the box, clear of it. */
  const watchTyping: Script = async (t) => {
    const input = context.focus;
    if (!input) return;
    await standUp(t);
    const box = input.getBoundingClientRect();
    const ledges = scanLedges();
    const perch = ledges
      .filter((s) => Math.abs(s.y - box.top) < 30 && s.x2 - s.x1 > 100)
      .sort((a, b) => Math.abs(a.y - box.top) - Math.abs(b.y - box.top))[0];
    if (perch) {
      const spotX = clamp(box.left + Math.min(box.width * 0.35, 120), perch.x1 + body.halfWidth + 8, perch.x2 - body.halfWidth - 8);
      if (on.key !== perch.key && perch.y < on.y) {
        // Never via the line under the box (that would park him on the send button): one big
        // leap straight up if it's in reach, otherwise climb from the spot above your text.
        if (on.y - perch.y <= body.height * 3.3) {
          await walkTo(spotX, HURRY, t);
          await jumpTo(perch, spotX, 18, t);
        } else {
          const path = planClimb(ledges, on, spotX, 4, body.height * 2.1, body);
          const end = path.findIndex((step) => step.surface.key === perch.key);
          for (const step of end >= 0 ? path.slice(0, end + 1) : []) {
            await walkTo(step.x, HURRY, t);
            await jumpTo(step.surface, step.x, 22, t);
          }
        }
      } else {
        for (let guard = 0; on.kind === "ledge" && on.key !== perch.key && on.y < perch.y - 4 && guard < 6; guard++) {
          await dropDown(t);
        }
      }
      if (on.key === perch.key) await walkTo(spotX, WALK, t);
    }
    face = 0;
    await wait(0.2, t);
    pose = "sit";
  };

  const reactions = {
    /** After a throw: dizzy if it was rough, otherwise a look at you. */
    recover: (strength: number): Script => async (t) => {
      await wait(0.25, t);
      if (strength > 0.6 && !reduceMotion) {
        pose = "dizzy";
        face = 0;
        await wait(1.5, t);
        pose = "stand";
        cue("shake");
        await wait(0.8, t);
      } else {
        face = 0;
        await wait(0.6, t);
        if (chance(0.5) && !reduceMotion) cue(chance(0.5) ? "twirl" : "wave");
        await wait(1, t);
      }
      // Landed past the end of the dock: step back on.
      if (on.kind === "ground") await backInside(t);
    },
    wake: (): Script => async (t) => {
      await wait(0.9, t);
      face = 0;
      if (chance(0.6)) cue("wave");
      await wait(1.5, t);
    },
  };

  function recover(strength: number) {
    void run(reactions.recover(strength), { sticky: true });
  }

  function wake() {
    pose = "stand";
    cue("startle");
    void run(reactions.wake(), { sticky: true });
  }

  /** What next? Only when he's free, you're idle and he's rested. */
  function decide() {
    if (on.kind === "ledge") {
      const upLong = (now() - ledgeSince) / 1000 > rand(10, 18);
      if (upLong || on.y < vh * 0.42) return void run(goDown);
      return void run(pick<Script>([[3, ledgeStroll], [2, edgeSit], [1.5, peekEdge], [1.5, lookAround], [0.6, waveHello]]));
    }
    const exploreOk = (now() - lastActivity) / 1000 > 7 && now() - lastExplore > 30000;
    void run(
      pick<Script>([
        [4, stroll],
        [2.2, sitAWhile],
        [1.6, lookAround],
        [now() - lastWave > 45000 ? 0.9 : 0, waveHello],
        [0.9, peekEdge],
        [now() - lastYawn > 40000 ? 0.6 : 0, yawnStretch],
        [0.4, twirl],
        [exploreOk ? 2.6 : 0, explore],
      ]),
    );
  }

  function think(dt: number) {
    // Flicking the page fast makes him brace for a second.
    braceCool = Math.max(0, braceCool - dt);
    if (Math.abs(scrollSpeed) > 2800 && braceCool <= 0 && phys === "stand" && pose === "stand" && targetX === null && !reduceMotion) {
      cue("brace", facing * 0.6);
      braceCool = 1.6;
    }
    if (phys !== "stand" || context.busy || scriptRunning) return;
    const idle = (now() - lastActivity) / 1000;
    if (pose === "sleep") return;
    politeCheck -= dt;
    if (politeCheck <= 0) {
      politeCheck = 0.6;
      if (idle > 0.7 && blocksControl(x)) return void run(stepAside);
      if (on.kind === "ground" && (x < span[0] - 2 || x > span[1] + 2)) return void run(backInside);
    }
    if (reduceMotion || context.focus) return;
    if (idle > 55) return void run(sleep);
    if (idle < 2.5 || now() < restUntil) return;
    decide();
  }

  /* ---------- output ---------- */

  function write() {
    const m = metrics;
    if (!m) return;
    const offsetY = page ? scrollY : 0;
    const position = page ? "absolute" : "fixed";
    if (written.position !== position) {
      els.root.style.position = position;
      written.position = position;
    }
    let fx = x - m.anchorX;
    // Without `overflow: clip`, a figure poking past the right edge would make the page scroll sideways.
    if (page && !clipSupported) fx = Math.min(fx, vw - els.figure.offsetWidth);
    const figure = `translate3d(${fx.toFixed(1)}px,${(y - m.anchorY + offsetY).toFixed(1)}px,0)`;
    if (figure !== written.figure) {
      els.figure.style.transform = figure;
      written.figure = figure;
    }
    const hitW = body.halfWidth * 2 + 6;
    const hitH = body.height * 0.98;
    const hit = `translate3d(${(x - hitW / 2).toFixed(1)}px,${(y - hitH + 2 + offsetY).toFixed(1)}px,0)`;
    if (hit !== written.hit) {
      els.hit.style.transform = hit;
      written.hit = hit;
    }
    // Shadow on whatever is under him, smaller and fainter the higher he is.
    let shadowY = y, scale = 1, opacity = 1;
    if (phys !== "stand") {
      const below = surfaceBelow(lastSurfaces, x, y);
      shadowY = below ? below.y : ground.y;
      const height = Math.max(0, shadowY - y);
      scale = 1 / (1 + height / 150);
      opacity = clamp(1 - height / 380, 0.12, 1);
    }
    const shadow = `translate3d(${(x - SHADOW_W / 2).toFixed(1)}px,${(shadowY - SHADOW_H / 2 + offsetY).toFixed(1)}px,0) scale(${scale.toFixed(3)})`;
    if (shadow !== written.shadow) {
      els.shadow.style.transform = shadow;
      written.shadow = shadow;
    }
    const op = opacity.toFixed(2);
    if (op !== written.opacity) {
      els.shadow.style.opacity = op;
      written.opacity = op;
    }
  }

  function sendMotion() {
    let p: FoggyPose = pose;
    let mvx = 0, mvy = 0, s = 0;
    let f: -1 | 0 | 1 = face;
    if (phys === "air") {
      p = "air";
      mvx = vx;
      mvy = vy;
      s = spin;
      f = Math.abs(vx) > 30 ? (vx > 0 ? 1 : -1) : facing;
    } else if (phys === "held") {
      p = "held";
      mvx = handVx;
      f = 0;
    } else if (crouch > 0) {
      p = "crouch";
      mvx = vx;
      f = facing;
    } else if (Math.abs(vx) > 2 || targetX !== null) {
      p = Math.abs(vx) > 2 || turning <= 0 ? "walk" : "stand";
      mvx = vx;
      f = facing;
    }
    const key = `${p}|${Math.round(mvx)}|${Math.round(mvy / 8)}|${f}|${s.toFixed(1)}`;
    if (key === lastMotion) return;
    lastMotion = key;
    send({ type: "motion", pose: p, vx: mvx, vy: mvy, face: f, spin: s });
  }

  function frame(time: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(1 / 30, Math.max(0, (time - last) / 1000));
    last = time;
    clock += dt;
    if (!metrics || !started || disposed) return;
    vw = document.documentElement.clientWidth || window.innerWidth;
    vh = window.innerHeight;
    scrollY = window.scrollY;
    scrollSpeed += ((scrollY - prevScrollY) / Math.max(dt, 1e-3) - scrollSpeed) * Math.min(1, dt * 10);
    prevScrollY = scrollY;
    readGround();
    if (phys === "stand") stepStand(dt);
    else if (phys === "air") stepAir(dt);
    else stepHeld(dt);
    if (pendingKind === "wait") {
      waitLeft -= dt;
      if (waitLeft <= 0) settle();
    }
    think(dt);
    write();
    sendMotion();
  }
  raf = requestAnimationFrame(frame);

  /* ---------- touch ---------- */

  function pickUp() {
    interrupt();
    phys = "held";
    page = false;
    onEl = null;
    crouch = 0;
    launch = null;
    vx = vy = accel = 0;
    pose = "stand";
    hold = { x, y: y - holdH };
    // Keep hold of him where you grabbed, eased toward your fingertip and lifted a little.
    grabOffset = { x: hold.x - hand.x, y: hold.y - hand.y };
    grabTarget = { x: grabOffset.x * 0.4, y: grabOffset.y - 12 };
    handVx = 0;
    cue("grab");
  }

  function release(fling: boolean) {
    let rvx = 0, rvy = 0;
    const first = samples[0], final = samples[samples.length - 1];
    if (fling && first && final && final.t - first.t > 16) {
      const elapsed = (final.t - first.t) / 1000;
      rvx = (final.x - first.x) / elapsed;
      rvy = (final.y - first.y) / elapsed;
    }
    const speed = Math.hypot(rvx, rvy);
    if (speed > 2600) {
      rvx *= 2600 / speed;
      rvy *= 2600 / speed;
    } else if (speed < 120) {
      rvx = rvy = 0;
    }
    takeOff(rvx, rvy, null);
    thrown = true;
    spin = speed > 900 && !reduceMotion ? clamp(rvx * 0.007, -14, 14) : 0;
    if (Math.abs(rvx) > 50) facing = rvx > 0 ? 1 : -1;
  }

  function onTap() {
    if (pose === "sleep") return wake();
    // Tap him a lot, quickly, and he gets dizzy.
    const t = now();
    taps = [...taps.filter((at) => t - at < 2000), t];
    if (taps.length >= 5 && phys === "stand" && !reduceMotion) {
      taps = [];
      return recover(1);
    }
    cue("boop");
    if (phys === "stand" && !scriptRunning) face = 0;
  }

  function trimSamples() {
    const cutoff = now() - 100;
    while (samples.length > 2 && samples[0].t < cutoff) samples.shift();
  }

  return {
    setMetrics(next) {
      metrics = next;
      body = { halfWidth: next.pxPerUnit * 1.0, height: next.pxPerUnit * 2.2 };
      holdH = next.anchorY - next.holdY;
      els.hit.style.width = `${body.halfWidth * 2 + 6}px`;
      els.hit.style.height = `${body.height * 0.98}px`;
      els.shadow.style.width = `${SHADOW_W}px`;
      els.shadow.style.height = `${SHADOW_H}px`;
    },
    start() {
      if (started) return;
      started = true;
      vw = document.documentElement.clientWidth || window.innerWidth;
      vh = window.innerHeight;
      readGround();
      on = ground;
      y = ground.y;
      refreshSpan();
      if (reduceMotion) {
        x = clamp(ground.x2 - 70, span[0], span[1]);
        write();
        return;
      }
      // Walk in from the right edge, stop, turn to you and wave.
      x = vw + body.halfWidth + 30;
      facing = -1;
      write();
      void run(
        async (t) => {
          await wait(0.25, t);
          await walkTo(Math.max(ground.x1 + 80, vw * 0.7), WALK, t);
          face = 0;
          await wait(0.35, t);
          cue("wave");
          lastWave = now();
          await wait(2, t);
        },
        { sticky: true },
      );
    },
    setContext(next) {
      const before = context;
      context = { ...context, ...next };
      els.hit.style.pointerEvents = context.interactive ? "" : "none";
      if (context.busy && !before.busy) {
        interrupt();
        if (phys === "stand") {
          pose = "sit";
          face = 0;
        }
      } else if (!context.busy && before.busy && pose === "sit") {
        pose = "stand";
      }
      if (context.focus && context.focus !== before.focus && phys === "stand" && started) {
        if (reduceMotion) {
          face = 0;
        } else {
          void run(watchTyping, { sticky: true });
        }
      } else if (!context.focus && before.focus && !context.busy) {
        if (scriptRunning && sticky) interrupt();
        if (pose === "sit") pose = "stand";
      }
    },
    noteActivity(kind) {
      lastActivity = now();
      if (kind === "scroll") lastScroll = lastActivity;
      if (pose === "sleep") return wake();
      if (scriptRunning && !sticky) interrupt();
    },
    welcomeBack(awayMs) {
      if (awayMs < 15000 || phys !== "stand" || scriptRunning || reduceMotion || pose === "sleep" || context.busy) return;
      void run(waveHello);
    },
    center() {
      return { x, y: y - body.height * 0.55 };
    },
    pointerDown(event) {
      if (!context.interactive || press) return;
      try {
        els.hit.setPointerCapture(event.pointerId);
      } catch {
        // older browsers
      }
      press = { id: event.pointerId, x: event.clientX, y: event.clientY, time: now(), moved: 0 };
      hand = { x: event.clientX, y: event.clientY };
      samples = [{ t: now(), x: event.clientX, y: event.clientY }];
      window.clearTimeout(longPress);
      // Press and hold picks him up too, without having to move first.
      longPress = window.setTimeout(() => {
        if (press && phys !== "held") pickUp();
      }, 380);
    },
    pointerMove(event) {
      if (!press || event.pointerId !== press.id) return;
      hand = { x: event.clientX, y: event.clientY };
      press.moved = Math.max(press.moved, Math.hypot(event.clientX - press.x, event.clientY - press.y));
      samples.push({ t: now(), x: event.clientX, y: event.clientY });
      trimSamples();
      if (phys !== "held" && press.moved > 7) pickUp();
    },
    pointerUp(event) {
      if (!press || event.pointerId !== press.id) return;
      window.clearTimeout(longPress);
      const tap = phys !== "held" && press.moved < 7 && now() - press.time < 400;
      press = null;
      trimSamples();
      if (phys === "held") release(true);
      else if (tap) onTap();
    },
    pointerCancel(event) {
      if (!press || event.pointerId !== press.id) return;
      window.clearTimeout(longPress);
      press = null;
      if (phys === "held") release(false);
    },
    snapshot() {
      return { phys, pose, x, y, vx, vy, on: on.kind, page, script: scriptRunning, idle: (now() - lastActivity) / 1000 };
    },
    act(name) {
      const scripts: Record<string, Script> = { stroll, explore, sitAWhile, sleep, peekEdge, edgeSit, goDown, waveHello, yawnStretch, twirl, ledgeStroll, lookAround };
      if (scripts[name]) void run(scripts[name]);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(longPress);
      interrupt();
    },
  };
}

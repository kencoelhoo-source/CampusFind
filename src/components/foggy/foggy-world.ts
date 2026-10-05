/**
 * Geometry for Foggy roaming on phones: the surfaces he stands on, the boxes in his way and
 * the jumps between them. Pure functions in viewport pixels (y grows downward), no DOM, so
 * they can be tested on their own.
 */

/** Something Foggy can stand on: the dock top ("ground") or the edge of a page element. */
export interface Surface {
  key: string;
  kind: "ground" | "ledge";
  x1: number;
  x2: number;
  y: number;
}

/** A small solid thing (an icon, a little button) that can stand in his way. */
export interface Box {
  x1: number;
  x2: number;
  top: number;
  bottom: number;
}

/** Cartoon gravity, px/s². Snappier than real life at his size, which reads as "light". */
export const GRAVITY = 2600;

/**
 * The surface Foggy lands on when his feet fall from `yFrom` to `yTo` at `x`. Surfaces are
 * one-way platforms (you can jump up through them), so only ones crossed on the way down count,
 * and the highest of those wins.
 */
export function findLanding(
  surfaces: readonly Surface[],
  x: number,
  yFrom: number,
  yTo: number,
  accept?: (surface: Surface) => boolean,
): Surface | null {
  let best: Surface | null = null;
  for (const surface of surfaces) {
    if (x < surface.x1 || x > surface.x2) continue;
    if (surface.y < yFrom - 0.5 || surface.y > yTo) continue;
    if (accept && !accept(surface)) continue;
    if (!best || surface.y < best.y) best = surface;
  }
  return best;
}

/** The highest surface at or below `y` under `x` (where his shadow falls). */
export function surfaceBelow(surfaces: readonly Surface[], x: number, y: number): Surface | null {
  return findLanding(surfaces, x, y, Number.POSITIVE_INFINITY);
}

/**
 * Launch velocity for a jump from (x0, y0) to (x1, y1) whose highest point is `apex` px above
 * the higher of the two points.
 */
export function solveJump(x0: number, y0: number, x1: number, y1: number, apex: number, gravity = GRAVITY) {
  const top = Math.min(y0, y1) - Math.max(1, apex);
  const timeUp = Math.sqrt((2 * (y0 - top)) / gravity);
  const timeDown = Math.sqrt((2 * (y1 - top)) / gravity);
  const time = timeUp + timeDown;
  return { vx: (x1 - x0) / time, vy: -gravity * timeUp, time };
}

/** Is the box inside his body's height when he stands on a surface at `surfaceY`? */
export function boxInBand(box: Box, surfaceY: number, bodyHeight: number) {
  return box.bottom > surfaceY - bodyHeight * 0.9 && box.top < surfaceY - 1;
}

export interface BodySize {
  /** Half his width, px. */
  halfWidth: number;
  /** Feet to crown, px. */
  height: number;
}

/** Highest box top (relative to the surface) he will hop over rather than treat as a wall. */
export const hurdleLimit = (body: BodySize) => body.height * 1.5;

/**
 * The stretch of `surface` he can walk while standing at `x`: its ends (minus a margin), cut
 * short by boxes too tall to hop or with no room to land beyond them.
 */
export function walkableSpan(surface: Surface, boxes: readonly Box[], x: number, body: BodySize): [number, number] {
  const margin = body.halfWidth * 0.7;
  let lo = surface.x1 + margin;
  let hi = surface.x2 - margin;
  for (const box of boxes) {
    if (!boxInBand(box, surface.y, body.height)) continue;
    const tooTall = box.top < surface.y - hurdleLimit(body);
    const roomRight = box.x2 + body.halfWidth + 8 <= hi;
    const roomLeft = box.x1 - body.halfWidth - 8 >= lo;
    const centre = (box.x1 + box.x2) / 2;
    if (centre >= x) {
      // Ahead to the right: a wall unless he can hop it and land on the far side.
      if (tooTall || !roomRight) hi = Math.min(hi, box.x1 - body.halfWidth * 0.8);
    } else if (tooTall || !roomLeft) {
      lo = Math.max(lo, box.x2 + body.halfWidth * 0.8);
    }
  }
  if (hi < lo) {
    const mid = Math.min(Math.max(x, surface.x1), surface.x2);
    return [mid, mid];
  }
  return [lo, hi];
}

/**
 * The first box he would walk into heading `dir` (±1) from `x`, if its near side is within
 * `lookahead` px of his front and before `stopAt` (where he means to stop).
 */
export function obstacleAhead(
  boxes: readonly Box[],
  surfaceY: number,
  x: number,
  dir: number,
  body: BodySize,
  lookahead: number,
  stopAt: number,
): Box | null {
  let best: Box | null = null;
  let bestGap = Number.POSITIVE_INFINITY;
  for (const box of boxes) {
    if (!boxInBand(box, surfaceY, body.height)) continue;
    const near = dir > 0 ? box.x1 : box.x2;
    const gap = (near - x) * dir - body.halfWidth;
    if (gap < -body.halfWidth * 0.5 || gap > lookahead) continue; // behind him, or still far away
    if ((stopAt - near) * dir < 0) continue; // he stops before reaching it
    if (gap < bestGap) {
      best = box;
      bestGap = gap;
    }
  }
  return best;
}

/** Where to land after hopping `box` heading `dir`. */
export function hurdleLanding(box: Box, dir: number, body: BodySize) {
  return dir > 0 ? box.x2 + body.halfWidth + 8 : box.x1 - body.halfWidth - 8;
}

export interface ClimbStep {
  surface: Surface;
  /** Where to take off from (and roughly land). */
  x: number;
}

/**
 * Plans a climb of up to `levels` jumps from `from`, always to the nearest ledge above that a
 * single jump of `maxRise` px can reach and that overlaps enough to stand on.
 */
export function planClimb(
  surfaces: readonly Surface[],
  from: Surface,
  x: number,
  levels: number,
  maxRise: number,
  body: BodySize,
): ClimbStep[] {
  const steps: ClimbStep[] = [];
  let current = from;
  let cx = x;
  const used = new Set([from.key]);
  for (let level = 0; level < levels; level++) {
    let next: Surface | null = null;
    for (const surface of surfaces) {
      if (used.has(surface.key)) continue;
      const rise = current.y - surface.y;
      if (rise < 24 || rise > maxRise) continue;
      const overlap = Math.min(current.x2, surface.x2) - Math.max(current.x1, surface.x1);
      if (overlap < body.halfWidth * 3) continue;
      if (!next || surface.y > next.y) next = surface;
    }
    if (!next) break;
    const lo = Math.max(current.x1, next.x1) + body.halfWidth + 6;
    const hi = Math.min(current.x2, next.x2) - body.halfWidth - 6;
    cx = Math.min(Math.max(cx, lo), hi);
    steps.push({ surface: next, x: cx });
    used.add(next.key);
    current = next;
  }
  return steps;
}

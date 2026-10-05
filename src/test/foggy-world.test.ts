import { describe, expect, it } from "vitest";
import {
  GRAVITY,
  findLanding,
  hurdleLanding,
  obstacleAhead,
  planClimb,
  solveJump,
  surfaceBelow,
  walkableSpan,
  type Box,
  type Surface,
} from "@/components/foggy/foggy-world";

const body = { halfWidth: 30, height: 66 };
const ground: Surface = { key: "ground", kind: "ground", x1: 14, x2: 376, y: 760 };
const row = (key: string, y: number): Surface => ({ key, kind: "ledge", x1: 24, x2: 366, y });

/** Exact ballistic position `t` seconds after take-off. */
const at = (x: number, y: number, jump: { vx: number; vy: number }, t: number) => ({
  x: x + jump.vx * t,
  y: y + jump.vy * t + (GRAVITY * t * t) / 2,
});

describe("findLanding", () => {
  const surfaces = [ground, row("a", 600), row("b", 528)];

  it("lands on the first surface crossed on the way down", () => {
    expect(findLanding(surfaces, 200, 500, 610)?.key).toBe("b");
    expect(findLanding(surfaces, 200, 540, 610)?.key).toBe("a");
  });

  it("ignores surfaces outside his x or not crossed this step", () => {
    expect(findLanding(surfaces, 5, 500, 700)).toBeNull();
    expect(findLanding(surfaces, 200, 610, 700)).toBeNull();
  });

  it("respects a filter (e.g. dropping through the ledge he was on)", () => {
    expect(findLanding(surfaces, 200, 500, 610, (s) => s.key !== "b")?.key).toBe("a");
  });

  it("finds what's under him for the shadow", () => {
    expect(surfaceBelow(surfaces, 200, 560)?.key).toBe("a");
  });
});

describe("solveJump", () => {
  it("reaches a ledge above, peaking `apex` px over it", () => {
    const jump = solveJump(100, 760, 140, 690, 26);
    const end = at(100, 760, jump, jump.time);
    expect(end.x).toBeCloseTo(140, 6);
    expect(end.y).toBeCloseTo(690, 6);
    const peak = at(100, 760, jump, -jump.vy / GRAVITY);
    expect(peak.y).toBeCloseTo(690 - 26, 6);
  });

  it("hops down onto a lower surface", () => {
    const jump = solveJump(200, 600, 230, 760, 14);
    expect(jump.vy).toBeLessThan(0);
    const end = at(200, 600, jump, jump.time);
    expect(end.x).toBeCloseTo(230, 6);
    expect(end.y).toBeCloseTo(760, 6);
  });
});

describe("boxes", () => {
  const ledge = row("a", 600);
  // A chevron floating in the row above the line, near the right end (like the FAQ).
  const chevron: Box = { x1: 326, x2: 342, top: 556, bottom: 572 };
  // A small box in the middle with room on both sides.
  const middle: Box = { x1: 180, x2: 200, top: 570, bottom: 598 };

  it("treats a box with no room beyond it as the end of the walk", () => {
    const [lo, hi] = walkableSpan(ledge, [chevron], 100, body);
    expect(lo).toBeCloseTo(24 + 21);
    expect(hi).toBeLessThan(chevron.x1);
  });

  it("lets him hop a box he can clear", () => {
    const [lo, hi] = walkableSpan(ledge, [middle], 100, body);
    expect(lo).toBeLessThan(middle.x1);
    expect(hi).toBeGreaterThan(middle.x2);
    const ahead = obstacleAhead([middle], ledge.y, 120, 1, body, 40, 300);
    expect(ahead).toBe(middle);
    expect(hurdleLanding(middle, 1, body)).toBeGreaterThan(middle.x2 + body.halfWidth);
  });

  it("doesn't hop a box he plans to stop before, or one already behind him", () => {
    expect(obstacleAhead([middle], ledge.y, 120, 1, body, 40, 140)).toBeNull();
    expect(obstacleAhead([middle], ledge.y, 260, 1, body, 40, 340)).toBeNull();
  });

  it("ignores boxes that aren't at his height", () => {
    const high: Box = { x1: 180, x2: 200, top: 400, bottom: 420 };
    expect(obstacleAhead([high], ledge.y, 120, 1, body, 40, 300)).toBeNull();
  });
});

describe("planClimb", () => {
  it("climbs one row at a time, nearest first, within reach", () => {
    const rows = [row("top", 546), row("mid", 618), row("low", 690), row("far", 200)];
    const path = planClimb(rows, ground, 300, 3, 140, body);
    expect(path.map((step) => step.surface.key)).toEqual(["low", "mid", "top"]);
    path.forEach((step) => {
      expect(step.x).toBeGreaterThanOrEqual(24 + body.halfWidth);
      expect(step.x).toBeLessThanOrEqual(366 - body.halfWidth);
    });
  });

  it("stops when the next ledge is out of reach", () => {
    expect(planClimb([row("far", 600)], ground, 200, 2, 140, body)).toEqual([]);
  });
});

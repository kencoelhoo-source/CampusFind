import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";

type Node = {
  el: HTMLElement;
  setLit: (on: boolean) => void;
  setAngle: (deg: number) => void;
};

const nodes = new Set<Node>();
let raf = 0;
const angle = new WeakMap<Node, { current: number; target: number }>();

function tick() {
  raf = 0;
  let anyLit = false;
  nodes.forEach((node) => {
    const state = angle.get(node);
    if (!state || !node.el.classList.contains("is-lit")) return;
    anyLit = true;
    let diff = state.target - state.current;
    diff = ((diff + 540) % 360) - 180;
    state.current += diff * 0.05;
    node.el.style.setProperty("--mouse-angle", `${state.current}deg`);
  });
  if (anyLit) raf = requestAnimationFrame(tick);
}

export function GlowAction({ to, children }: { to: string; children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const node: Node = {
      el,
      setLit: (on) => {
        el.classList.toggle("is-lit", on && !reduced);
        if (on && !raf && !reduced) raf = requestAnimationFrame(tick);
      },
      setAngle: (deg) => {
        const state = angle.get(node);
        if (state) state.target = deg;
      },
    };
    angle.set(node, { current: 20, target: 20 });
    nodes.add(node);

    const pointAngle = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const deg =
        (Math.atan2(
          event.clientY - (rect.top + rect.height / 2),
          event.clientX - (rect.left + rect.width / 2),
        ) *
          180) /
        Math.PI;
      node.setAngle(deg + 180);
    };

    const onEnter = (event: PointerEvent) => {
      nodes.forEach((other) => other.setLit(other === node));
      pointAngle(event);
      if (!raf && !reduced) raf = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      if (!el.classList.contains("is-lit")) return;
      pointAngle(event);
    };

    const onLeave = () => {
      node.setLit(false);
    };

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      nodes.delete(node);
      if (nodes.size === 0 && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
  }, []);

  return (
    <div ref={wrapRef} className="hero-glow">
      <Link to={to} className="hero-glow-btn">
        {children}
      </Link>
    </div>
  );
}

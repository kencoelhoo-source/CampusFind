import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Option<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: SegmentedControlProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ x: 4, w: 36, ready: false });

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const update = () => {
      const active = list.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!active) return;
      setPill({ x: active.offsetLeft, w: active.offsetWidth, ready: true });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(list);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [value, options.length]);

  return (
    <div
      ref={listRef}
      role="tablist"
      className={cn("relative isolate flex rounded-full bg-muted p-1", className)}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-1 z-0 h-9 rounded-full bg-card shadow-card"
        style={{
          width: pill.w,
          transform: `translate3d(${pill.x}px, 0, 0)`,
          willChange: "transform",
          transition: pill.ready ? "transform 400ms cubic-bezier(0.4, 0, 0.2, 1)" : "none",
        }}
      />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={option.label}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 inline-flex h-9 min-w-9 flex-1 cursor-pointer items-center justify-center rounded-full bg-transparent text-muted-foreground transition-colors duration-200 ease-apple",
              selected && "text-foreground",
            )}
          >
            {option.icon}
          </button>
        );
      })}
    </div>
  );
}

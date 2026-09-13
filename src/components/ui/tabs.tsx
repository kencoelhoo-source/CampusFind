import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const listRef = React.useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = React.useState({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    index: -1,
    ready: false,
    animate: false,
  });

  React.useImperativeHandle(ref, () => listRef.current as HTMLDivElement);

  const update = React.useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const tabs = Array.from(list.querySelectorAll<HTMLElement>('[role="tab"]'));
    const active = tabs.find((tab) => tab.getAttribute("data-state") === "active");
    if (!active) return;
    const index = tabs.indexOf(active);
    const x = active.offsetLeft;
    const y = active.offsetTop;
    const w = active.offsetWidth;
    const h = active.offsetHeight;
    if (w < 8 || h < 8) return;
    setIndicator((prev) => {
      if (prev.ready && prev.x === x && prev.y === y && prev.w === w && prev.h === h && prev.index === index) {
        return prev;
      }
      return {
        x,
        y,
        w,
        h,
        index,
        ready: true,
        animate: prev.ready && prev.index !== index,
      };
    });
  }, []);

  React.useLayoutEffect(() => {
    update();
    const list = listRef.current;
    if (!list) return;
    const ro = new ResizeObserver(update);
    ro.observe(list);
    list.querySelectorAll('[role="tab"]').forEach((tab) => ro.observe(tab));
    const mo = new MutationObserver(update);
    mo.observe(list, { attributes: true, subtree: true, attributeFilter: ["data-state"] });
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [update]);

  return (
    <TabsPrimitive.List
      ref={listRef}
      className={cn(
        "relative isolate flex h-11 sm:h-11 items-stretch rounded-full bg-secondary/80 dark:bg-white/[0.06] border border-border/40 dark:border-white/[0.08] p-1 text-muted-foreground backdrop-blur-xl",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-0 rounded-full bg-background dark:bg-white/15 shadow-sm"
        style={{
          width: indicator.w,
          height: indicator.h,
          opacity: indicator.ready ? 1 : 0,
          transform: `translate3d(${indicator.x}px, ${indicator.y}px, 0)`,
          willChange: indicator.animate ? "transform" : "auto",
          transition: indicator.animate ? "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
        }}
      />
      {children}
    </TabsPrimitive.List>
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative z-10 inline-flex h-full min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-full px-2.5 sm:px-4 text-[12.5px] sm:text-[13px] font-medium text-muted-foreground transition-colors duration-200 ease-apple data-[state=active]:text-foreground data-[state=active]:font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };

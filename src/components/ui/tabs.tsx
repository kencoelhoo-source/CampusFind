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
        "relative isolate flex h-12 w-full items-stretch rounded-[1.25rem] bg-muted/80 p-1 text-muted-foreground",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-0 rounded-[1rem] bg-card shadow-card"
        style={{
          width: indicator.w,
          height: indicator.h,
          opacity: indicator.ready ? 1 : 0,
          transform: `translate3d(${indicator.x}px, ${indicator.y}px, 0)`,
          willChange: indicator.animate ? "transform" : "auto",
          transition: indicator.animate ? "transform 400ms cubic-bezier(0.4, 0, 0.2, 1)" : "none",
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
      "relative z-10 inline-flex h-full min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-[1rem] px-2 text-[13px] font-medium text-muted-foreground transition-colors duration-200 ease-apple data-[state=active]:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50",
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

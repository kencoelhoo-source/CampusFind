import { useMemo, useRef, useEffect, startTransition } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, Plus, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrompt } from "@/contexts/AuthPromptContext";
import { cn } from "@/lib/utils";

type DockTab = {
  to: string;
  label: string;
  icon: typeof Home;
  match: (path: string) => boolean;
};

export function MobileDock() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openAuthPrompt } = useAuthPrompt();

  const tabs = useMemo<DockTab[]>(
    () => [
      { to: "/", label: "Home", icon: Home, match: (path) => path === "/" },
      { to: "/items", label: "Browse", icon: Search, match: (path) => path.startsWith("/items") },
      { to: "/post", label: "Report", icon: Plus, match: (path) => path === "/post" },
      {
        to: user ? "/dashboard" : "/",
        label: "You",
        icon: User,
        match: (path) => path.startsWith("/dashboard"),
      },
    ],
    [user],
  );

  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.match(pathname)));

  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const hasDraggedRef = useRef(false);
  const activeHoverRef = useRef(activeIndex);
  const currentPosRef = useRef(activeIndex);
  const pillAnimRef = useRef<Animation | null>(null);

  const dragStateRef = useRef({
    pointerId: -1,
    startX: 0,
    startIndex: activeIndex,
    tabWidth: 1,
    currentProgress: activeIndex,
  });

  // Pure butter glide: continuous single monotonic translation with decoupled organic fluid pill morph
  const animateToTab = (toIdx: number) => {
    if (!indicatorRef.current) return;
    const fromIdx = currentPosRef.current;
    currentPosRef.current = toIdx;

    tabRefs.current.forEach((node, i) => {
      if (node) node.classList.toggle("active", i === toIdx);
    });

    if (fromIdx === toIdx) {
      indicatorRef.current.style.transition = "none";
      indicatorRef.current.style.transform = `translate3d(${toIdx * 100}%, 0, 0)`;
      if (pillRef.current) {
        pillRef.current.style.transform = "scale(1, 1)";
      }
      return;
    }

    const dist = Math.abs(toIdx - fromIdx);
    // 320ms for 1 tab, 380ms for 2 tabs, 440ms for 3 tabs: responsive, silky, butter-smooth
    const duration = dist === 1 ? 320 : dist === 2 ? 380 : 440;

    // 1. POSITION: Single continuous unbroken curve - ZERO pauses or hitches in mid-flight!
    indicatorRef.current.style.transition = `transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    indicatorRef.current.style.transform = `translate3d(${toIdx * 100}%, 0, 0)`;

    // 2. FLUID PILL: Subtle organic stretch in-flight, gentle inward cushion on arrival (never outward)
    if (pillRef.current) {
      if (pillAnimRef.current) {
        try {
          pillAnimRef.current.commitStyles();
        } catch {
          // ignore
        }
        pillAnimRef.current.cancel();
      }

      const stretch = dist === 1 ? 0.06 : dist === 2 ? 0.09 : 0.12;
      const squash = dist === 1 ? 0.025 : dist === 2 ? 0.04 : 0.05;

      const keyframes = [
        { transform: "scale(1, 1)", offset: 0 },
        { transform: `scale(${1 + stretch}, ${1 - stretch * 0.2})`, offset: 0.38, easing: "ease-out" },
        { transform: `scale(${1 - squash}, ${1 + squash * 0.2})`, offset: 0.76, easing: "ease-in-out" },
        { transform: "scale(1, 1)", offset: 1 },
      ];

      const anim = pillRef.current.animate(keyframes, {
        duration,
        fill: "forwards",
      });
      pillAnimRef.current = anim;

      anim.onfinish = () => {
        if (pillRef.current) {
          pillRef.current.style.transform = "scale(1, 1)";
        }
        try {
          anim.cancel();
        } catch {
          // ignore
        }
      };
    }
  };

  // Sync on route change if navigation originated outside tab clicks (e.g. back/forward button)
  useEffect(() => {
    if (dragStateRef.current.pointerId !== -1) return;
    if (currentPosRef.current !== activeIndex) {
      animateToTab(activeIndex);
    }
  }, [activeIndex]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const tabW = (rect.width - 8) / tabs.length;

    if (pillAnimRef.current) {
      try {
        pillAnimRef.current.commitStyles();
      } catch {
        // ignore
      }
      pillAnimRef.current.cancel();
    }
    if (indicatorRef.current) indicatorRef.current.style.transition = "none";
    if (pillRef.current) pillRef.current.style.transition = "none";

    hasDraggedRef.current = false;
    activeHoverRef.current = currentPosRef.current;

    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startIndex: currentPosRef.current,
      tabWidth: tabW,
      currentProgress: currentPosRef.current,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current.pointerId !== e.pointerId || !indicatorRef.current) return;

    const deltaX = e.clientX - dragStateRef.current.startX;
    if (!hasDraggedRef.current && Math.abs(deltaX) > 4) {
      hasDraggedRef.current = true;
    }

    if (!hasDraggedRef.current) return;

    const tabW = dragStateRef.current.tabWidth;
    const rawProgress = dragStateRef.current.startIndex + deltaX / tabW;

    const maxIdx = tabs.length - 1; // 3
    let clampedProgress: number;
    let scaleX = 1;
    let scaleY = 1;
    let origin = "center center";

    if (rawProgress < 0) {
      // Squashing against left wall (Tab 0) - NEVER goes past left border!
      clampedProgress = 0;
      const over = Math.min(-rawProgress, 0.6);
      const squash = Math.min(over * 0.2, 0.14);
      scaleX = 1 - squash;
      scaleY = 1 + squash * 0.12;
      origin = "left center";
    } else if (rawProgress > maxIdx) {
      // Squashing against right wall (Tab 3) - NEVER goes past right border!
      clampedProgress = maxIdx;
      const over = Math.min(rawProgress - maxIdx, 0.6);
      const squash = Math.min(over * 0.2, 0.14);
      scaleX = 1 - squash;
      scaleY = 1 + squash * 0.12;
      origin = "right center";
    } else {
      // Inside dock bounds: stretch organically in drag direction
      clampedProgress = rawProgress;
      if (deltaX >= 0) {
        // Dragging right
        const roomToRight = maxIdx - rawProgress;
        const stretch = Math.min((Math.abs(deltaX) / tabW) * 0.2, roomToRight * 0.75, 0.2);
        scaleX = 1 + stretch;
        scaleY = Math.max(0.88, 1 - stretch * 0.18);
        origin = "left center";
      } else {
        // Dragging left
        const roomToLeft = rawProgress;
        const stretch = Math.min((Math.abs(deltaX) / tabW) * 0.2, roomToLeft * 0.75, 0.2);
        scaleX = 1 + stretch;
        scaleY = Math.max(0.88, 1 - stretch * 0.18);
        origin = "right center";
      }
    }

    dragStateRef.current.currentProgress = clampedProgress;

    // Direct hardware-accelerated 120fps styling with zero React re-renders
    indicatorRef.current.style.transition = "none";
    indicatorRef.current.style.transform = `translate3d(${clampedProgress * 100}%, 0, 0)`;

    if (pillRef.current) {
      pillRef.current.style.transition = "none";
      pillRef.current.style.transformOrigin = origin;
      pillRef.current.style.transform = `scale(${scaleX}, ${scaleY})`;
    }

    // Instant microsecond DOM class update
    const hovered = Math.max(0, Math.min(maxIdx, Math.round(clampedProgress)));
    if (hovered !== activeHoverRef.current) {
      activeHoverRef.current = hovered;
      tabRefs.current.forEach((node, i) => {
        if (node) node.classList.toggle("active", i === hovered);
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current.pointerId !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if already released
    }

    const wasDragged = hasDraggedRef.current;
    const finalProgress = dragStateRef.current.currentProgress;
    dragStateRef.current.pointerId = -1;

    if (wasDragged && indicatorRef.current) {
      const maxIdx = tabs.length - 1;
      const nearest = Math.max(0, Math.min(maxIdx, Math.round(finalProgress)));
      currentPosRef.current = nearest;

      // Silky buttery spring release: no overshoot past target, buttery settling
      indicatorRef.current.style.transition = "transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)";
      indicatorRef.current.style.transform = `translate3d(${nearest * 100}%, 0, 0)`;

      if (pillRef.current) {
        pillRef.current.style.transition = "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)";
        pillRef.current.style.transformOrigin = "center center";
        pillRef.current.style.transform = "scale(1, 1)";
      }

      tabRefs.current.forEach((node, i) => {
        if (node) node.classList.toggle("active", i === nearest);
      });

      if (nearest !== activeIndex) {
        if (tabs[nearest].label === "Report" && !user) {
          animateToTab(activeIndex);
          openAuthPrompt({ actionType: "report", redirectUrl: "/post" });
          return;
        }
        startTransition(() => {
          navigate(tabs[nearest].to);
        });
      }
    }

    window.setTimeout(() => {
      hasDraggedRef.current = false;
    }, 50);
  };

  return (
    <nav className="mobile-dock md:hidden" aria-label="Primary">
      <div
        ref={containerRef}
        className="dock-glass dock-tabs"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="dock-specular" aria-hidden />
        <div
          ref={indicatorRef}
          className="dock-indicator"
          aria-hidden
          style={{
            transform: `translate3d(${activeIndex * 100}%, 0, 0)`,
          }}
        >
          <div ref={pillRef} className="dock-pill" />
        </div>
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const active = tab.match(pathname);

          return (
            <NavLink
              key={tab.label}
              to={tab.to}
              ref={(node) => {
                tabRefs.current[idx] = node;
              }}
              onClick={(e) => {
                if (hasDraggedRef.current) {
                  e.preventDefault();
                  return;
                }
                if (tab.label === "Report" && !user) {
                  e.preventDefault();
                  openAuthPrompt({ actionType: "report", redirectUrl: "/post" });
                  return;
                }
                animateToTab(idx);
              }}
              className={cn("dock-tab", active && "active")}
            >
              <span className="dock-icon">
                <Icon />
              </span>
              <span className="dock-label">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

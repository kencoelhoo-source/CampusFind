import { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Search, Plus, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type DockTab = {
  to: string;
  label: string;
  icon: typeof Home;
  match: (path: string) => boolean;
};

export function MobileDock() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const tabs = useMemo<DockTab[]>(
    () => [
      { to: "/", label: "Home", icon: Home, match: (path) => path === "/" },
      { to: "/items", label: "Browse", icon: Search, match: (path) => path.startsWith("/items") },
      { to: user ? "/post" : "/auth", label: "Report", icon: Plus, match: (path) => path === "/post" },
      {
        to: user ? "/dashboard" : "/auth",
        label: "You",
        icon: User,
        match: (path) => path.startsWith("/dashboard"),
      },
    ],
    [user],
  );

  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.match(pathname)));

  return (
    <nav className="mobile-dock md:hidden" aria-label="Primary">
      <div className="dock-glass dock-tabs">
        <div className="dock-specular" aria-hidden />
        <div
          className="dock-indicator"
          aria-hidden
          style={{ transform: `translate3d(${activeIndex * 100}%, 0, 0)` }}
        />
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.match(pathname);
          return (
            <NavLink key={tab.label} to={tab.to} className={cn("dock-tab", active && "active")}>
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

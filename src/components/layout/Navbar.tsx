import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Bell, Menu, X, LogOut, Sun, Moon, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/common/Logo";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/items", label: "Browse" },
  { to: "/faq", label: "FAQ" },
];

export function Navbar() {
  const { user, loading, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (error) return 0;
      return count || 0;
    },
    enabled: Boolean(user),
    refetchInterval: 15000,
  });

  const overlay = (pathname === "/" || pathname === "/auth") && !scrolled && !mobileOpen;

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled((current) => {
        if (!current && y > 28) return true;
        if (current && y < 8) return false;
        return current;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
    setScrolled(window.scrollY > 28);
  }, [pathname]);

  const closeMobile = () => setMobileOpen(false);
  const muted = overlay ? "text-white/75 hover:text-white" : "text-muted-foreground hover:text-foreground";
  const active = overlay ? "bg-white/15 text-white" : "bg-secondary text-foreground";

  return (
    <nav
      className={cn(
        "fixed top-0 z-50 w-full transition-[background-color,backdrop-filter] duration-300 ease-apple",
        overlay ? "nav-overlay" : "glass-nav",
      )}
    >
      <div className="container flex h-14 items-center justify-between">
        <Logo inverted={overlay} />

        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-300 ease-apple",
                  muted,
                  isActive && active,
                )
              }
            >
              {item.label}
            </NavLink>
          ))}

          {user && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                cn(
                  "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-300 ease-apple",
                  muted,
                  isActive && active,
                )
              }
            >
              Dashboard
            </NavLink>
          )}

          {loading ? (
            <div className={cn("ml-2 h-8 w-20 animate-pulse rounded-full", overlay ? "bg-white/20" : "bg-muted")} />
          ) : user ? (
            <>
              <Button
                size="sm"
                className={cn("ml-1", overlay && "bg-white text-black hover:bg-white/90")}
                asChild
              >
                <Link to="/post">
                  <Plus className="h-3.5 w-3.5" /> Report
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("relative", overlay ? "text-white hover:bg-white/10 hover:text-white" : "")}
                asChild
              >
                <Link to="/dashboard?tab=notifications" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
                    </span>
                  )}
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 overflow-hidden rounded-full border text-[11px] font-semibold",
                      overlay ? "border-white/30 bg-white/15 text-white hover:bg-white/25" : "border-border/80 bg-secondary",
                    )}
                    aria-label="Account menu"
                  >
                    {(user.user_metadata?.full_name || user.email || "U").charAt(0).toUpperCase()}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2.5 py-2">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {user.user_metadata?.full_name || "SFIT member"}
                    </p>
                    <p className="truncate text-[12px] text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>Dashboard</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/post")}>Report an item</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              size="sm"
              className={cn("ml-2", overlay && "bg-white text-black hover:bg-white/90")}
              asChild
            >
              <Link to="/auth">Sign in</Link>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className={cn("ml-0.5", overlay && "text-white hover:bg-white/10 hover:text-white")}
            onClick={toggleTheme}
            title="Toggle theme"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className={overlay ? "text-white hover:bg-white/10 hover:text-white" : ""}
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={overlay ? "text-white hover:bg-white/10 hover:text-white" : ""}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid overflow-hidden border-t border-border/70 bg-background/95 backdrop-blur-xl transition-all duration-300 ease-apple md:hidden",
          mobileOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0">
          <div className="flex flex-col gap-1 p-4">
            {user && (
              <div className="mb-2 border-b border-border/70 pb-3">
                <p className="text-sm font-medium text-foreground">
                  {user.user_metadata?.full_name || "CampusFind user"}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            )}
            <Button variant="ghost" className="justify-start" asChild onClick={closeMobile}>
              <Link to="/">Home</Link>
            </Button>
            <Button variant="ghost" className="justify-start" asChild onClick={closeMobile}>
              <Link to="/items">Browse</Link>
            </Button>
            <Button variant="ghost" className="justify-start" asChild onClick={closeMobile}>
              <Link to="/faq">FAQ</Link>
            </Button>
            {user ? (
              <>
                <Button variant="ghost" className="justify-between" asChild onClick={closeMobile}>
                  <Link to="/dashboard">
                    <span>Dashboard</span>
                    {unreadCount > 0 && (
                      <span className="inline-flex h-5 items-center justify-center rounded-full bg-destructive px-2 text-[10px] font-semibold text-destructive-foreground">
                        {unreadCount} new
                      </span>
                    )}
                  </Link>
                </Button>
                <Button className="mt-1" asChild onClick={closeMobile}>
                  <Link to="/post"><Plus className="h-4 w-4" /> Report item</Link>
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start text-muted-foreground"
                  onClick={() => {
                    signOut();
                    closeMobile();
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </Button>
              </>
            ) : (
              <Button className="mt-1" asChild onClick={closeMobile}>
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

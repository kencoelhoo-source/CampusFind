import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrompt } from "@/contexts/AuthPromptContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Bell, LogOut, Sun, Moon, Plus } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/common/Logo";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/items", label: "Browse" },
  { to: "/faq", label: "FAQ" },
];

export function Navbar() {
  const { user, loading, signOut } = useAuth();
  const { openAuthPrompt } = useAuthPrompt();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [scrolled, setScrolled] = useState(false);

  const navLinksRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const [indicator, setIndicator] = useState<{
    x: number;
    y: number;
    width: number;
    opacity: number;
  }>({
    x: 0,
    y: 0,
    width: 0,
    opacity: 0,
  });

  const updateUnderline = useCallback(() => {
    if (!navLinksRef.current) return;
    const activeEl = navLinksRef.current.querySelector<HTMLElement>('[data-active="true"]');
    const target = activeEl?.querySelector<HTMLElement>('[data-nav-target]');

    if (target && navLinksRef.current) {
      const navRect = navLinksRef.current.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      if (targetRect.width > 0) {
        setIndicator({
          x: targetRect.left - navRect.left,
          y: targetRect.bottom - navRect.top + 6,
          width: targetRect.width,
          opacity: 1,
        });
        return;
      }
    }
    setIndicator((prev) => ({ ...prev, opacity: 0 }));
  }, []);

  useLayoutEffect(() => {
    updateUnderline();
  }, [pathname, search, updateUnderline]);

  useEffect(() => {
    const timer = setTimeout(() => {
      isFirstRender.current = false;
    }, 60);

    const onResize = () => updateUnderline();
    window.addEventListener("resize", onResize);

    if (document.fonts?.ready) {
      document.fonts.ready.then(updateUnderline);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [updateUnderline]);

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

  const overlay = pathname === "/" && !scrolled;

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
    setScrolled(window.scrollY > 28);
  }, [pathname]);

  const muted = overlay ? "text-white/75 hover:text-white" : "text-muted-foreground hover:text-foreground";
  const active = overlay ? "bg-white/15 text-white" : "bg-secondary text-foreground";

  const [signOutOpen, setSignOutOpen] = useState(false);

  const accountMenu = user ? (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "avatar-trigger h-8 w-8 overflow-hidden rounded-full border text-[11px] font-semibold active:scale-100",
              "outline-none ring-0 ring-offset-0 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 select-none",
              "transition-colors duration-150",
              overlay
                ? "border-white/30 bg-white/15 text-white hover:bg-white/25 data-[state=open]:bg-white/25 data-[state=open]:border-white/40"
                : "border-border/80 bg-secondary text-foreground hover:bg-secondary/80 data-[state=open]:bg-secondary/80 data-[state=open]:border-border",
            )}
            aria-label="Account menu"
          >
            {(user.user_metadata?.full_name || user.email || "U").charAt(0).toUpperCase()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
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
          <DropdownMenuItem
            onClick={() => setSignOutOpen(true)}
            className="text-red-500 focus:text-red-500 dark:text-red-400 dark:focus:text-red-400 focus:bg-red-500/10"
          >
            <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent className="menu-surface max-w-[22rem] rounded-[1.75rem] border-border/60 p-6 sm:rounded-[1.75rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl tracking-tight">Leave your account?</AlertDialogTitle>
            <AlertDialogDescription>
              You can still browse the board. Sign in again anytime with Google.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 flex flex-col gap-2.5 divide-y-0 sm:space-x-0">
            <AlertDialogCancel className="h-11 rounded-full border border-white/15 border-t-white/15 bg-white/5 font-medium text-foreground hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-11 rounded-full border-0 !bg-destructive font-medium !text-white hover:!bg-destructive/90"
              onClick={async () => {
                await signOut();
                setSignOutOpen(false);
                navigate("/");
              }}
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  ) : null;

  const getNavLinkClass = (isActive: boolean) =>
    cn(
      "relative py-1 text-[14.5px] font-medium tracking-tight transition-colors duration-200",
      overlay
        ? isActive
          ? "text-[#F5F2EA]"
          : "text-[#F5F2EA]/75 hover:text-[#F5F2EA]"
        : isActive
          ? "text-neutral-900 dark:text-white"
          : "text-neutral-600 hover:text-neutral-900 dark:text-white/75 dark:hover:text-white",
    );

  const getUnderlineClass = () =>
    cn(
      "absolute h-[2px] rounded-full pointer-events-none transition-colors duration-200",
      overlay ? "bg-[#B8A56A]" : "bg-primary",
    );

  return (
    <nav
      className={cn(
        "fixed top-0 z-50 w-full transition-[background-color,backdrop-filter] duration-300 ease-apple",
        overlay ? "nav-overlay" : "glass-nav",
      )}
    >
      <div className="container flex h-14 md:h-[68px] items-center justify-between">
        <Logo inverted={overlay} />

        {/* Desktop Navigation (Consistent layout, zero layout shifts, identical sizing on scroll) */}
        <div className="hidden items-center gap-7 lg:gap-8 md:flex">
          <div ref={navLinksRef} className="relative flex items-center gap-7 lg:gap-8">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => getNavLinkClass(isActive)}
              >
                {({ isActive }) => (
                  <span
                    data-active={isActive ? "true" : "false"}
                    className="relative inline-flex items-center"
                  >
                    <span data-nav-target>{item.label}</span>
                  </span>
                )}
              </NavLink>
            ))}

            {user && (
              <NavLink
                to="/dashboard"
                className={({ isActive }) => getNavLinkClass(isActive)}
              >
                {({ isActive }) => (
                  <span
                    data-active={isActive ? "true" : "false"}
                    className="relative inline-flex items-center"
                  >
                    <span data-nav-target>Dashboard</span>
                  </span>
                )}
              </NavLink>
            )}

            {/* + Report */}
            {user ? (
              <NavLink
                to="/post"
                className={({ isActive }) => getNavLinkClass(isActive)}
              >
                {({ isActive }) => (
                  <span
                    data-active={isActive ? "true" : "false"}
                    className="inline-flex items-center"
                  >
                    <span className="mr-1 select-none font-normal opacity-70">+</span>
                    <span className="relative inline-flex items-center">
                      <span data-nav-target>Report</span>
                    </span>
                  </span>
                )}
              </NavLink>
            ) : (
              <button
                type="button"
                onClick={() => openAuthPrompt({ actionType: "report", redirectUrl: "/post" })}
                className={getNavLinkClass(pathname === "/post")}
              >
                <span
                  data-active={pathname === "/post" ? "true" : "false"}
                  className="inline-flex items-center"
                >
                  <span className="mr-1 select-none font-normal opacity-70">+</span>
                  <span className="relative inline-flex items-center">
                    <span data-nav-target>Report</span>
                  </span>
                </span>
              </button>
            )}

            {/* Single Continuous Sliding Underline Indicator */}
            <motion.span
              className={getUnderlineClass()}
              style={{
                left: 0,
                top: indicator.y,
              }}
              initial={false}
              animate={{
                x: indicator.x,
                width: indicator.width,
                opacity: indicator.opacity,
              }}
              transition={
                isFirstRender.current
                  ? { duration: 0 }
                  : {
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                      mass: 0.8,
                    }
              }
            />
          </div>

          {/* User Profile or Sign In */}
          {loading ? (
            <div className="h-[36px] w-20 animate-pulse rounded-[18px] bg-muted/60" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "relative h-8 w-8 transition-colors duration-200",
                  overlay
                    ? "text-[#F5F2EA]/80 hover:bg-white/10 hover:text-white"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-black/5 dark:text-white/75 dark:hover:text-white dark:hover:bg-white/10",
                )}
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
              {accountMenu}
            </div>
          ) : (
            <Link
              to="/auth"
              className={cn(
                "inline-flex h-[36px] items-center justify-center rounded-[18px] px-5 text-[14px] font-medium transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
                overlay
                  ? "bg-[#F7F6F2] text-[#171717] hover:bg-white"
                  : "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-[#F7F6F2] dark:text-[#171717] dark:hover:bg-white",
              )}
            >
              Sign in
            </Link>
          )}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className={cn(
              "p-1.5 transition-colors duration-200",
              overlay
                ? "text-[#F5F2EA]/65 hover:text-[#F5F2EA]"
                : "text-neutral-600 hover:text-neutral-900 dark:text-white/75 dark:hover:text-white",
            )}
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="h-[15px] w-[15px]" /> : <Sun className="h-[15px] w-[15px]" />}
          </button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {user && (
            <Button
              variant="ghost"
              size="icon"
              className={cn("relative h-8 w-8 shrink-0 active:scale-100", overlay ? "text-white hover:bg-white/10 hover:text-white" : "")}
              asChild
            >
              <Link to="/dashboard?tab=notifications" aria-label="Notifications">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
                )}
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 shrink-0 active:scale-100", overlay ? "text-white hover:bg-white/10 hover:text-white" : "")}
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          {loading ? (
            <div className={cn("h-8 w-8 shrink-0 rounded-full", overlay ? "bg-white/20" : "bg-muted")} />
          ) : user ? (
            accountMenu
          ) : (
            <Button
              size="sm"
              className={cn("ml-1 h-8 px-3", overlay && "bg-white text-black hover:bg-white/90")}
              asChild
            >
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Search, Plus, Bell, Menu, X, LogOut, User, Sun, Moon } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b glass">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-hero">
            <Search className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            CampusFind
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" size="sm" className="text-[13px] font-medium text-muted-foreground hover:text-foreground" asChild>
            <Link to="/">Home</Link>
          </Button>
          <Button variant="ghost" size="sm" className="text-[13px] font-medium text-muted-foreground hover:text-foreground" asChild>
            <Link to="/items">Browse</Link>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" size="sm" className="text-[13px] font-medium text-muted-foreground hover:text-foreground" asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button size="sm" className="ml-1 h-8 rounded-full bg-gradient-hero px-4 text-[13px] font-medium text-white shadow-none hover:opacity-90" asChild>
                <Link to="/post">
                  <Plus className="mr-1 h-3.5 w-3.5" /> Report
                </Link>
              </Button>
              <Button variant="ghost" size="icon" className="ml-1 h-8 w-8 text-muted-foreground hover:text-foreground" asChild>
                <Link to="/dashboard?tab=notifications">
                  <Bell className="h-4 w-4" />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl p-1">
                  <div className="px-3 py-2 text-[13px] font-medium text-muted-foreground">
                    {user.user_metadata?.full_name || user.email || "Logged in"}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="rounded-lg text-[13px]">
                    <LogOut className="mr-2 h-3.5 w-3.5" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button size="sm" className="ml-1 h-8 rounded-full bg-foreground px-4 text-[13px] font-medium text-background hover:opacity-90" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="ml-1 h-8 w-8 text-muted-foreground hover:text-foreground" onClick={toggleTheme} title="Toggle theme">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
        </div>

        {/* Mobile buttons */}
        <div className="flex items-center gap-1 md:hidden">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={toggleTheme}>
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t bg-card p-4 md:hidden animate-fade-in">
          <div className="flex flex-col gap-1">
            {user && (
              <div className="mb-2 border-b pb-3 px-3">
                <p className="text-sm font-medium text-foreground">
                  {user.user_metadata?.full_name || "CampusFind User"}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            )}
            
            <Button variant="ghost" className="justify-start text-[14px]" asChild onClick={() => setMobileOpen(false)}>
              <Link to="/">Home</Link>
            </Button>
            <Button variant="ghost" className="justify-start text-[14px]" asChild onClick={() => setMobileOpen(false)}>
              <Link to="/items">Browse Items</Link>
            </Button>
            {user ? (
              <>
                <Button variant="ghost" className="justify-start text-[14px]" asChild onClick={() => setMobileOpen(false)}>
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
                <Button className="mt-1 rounded-full bg-gradient-hero text-white" asChild onClick={() => setMobileOpen(false)}>
                  <Link to="/post"><Plus className="mr-1 h-4 w-4" /> Report Item</Link>
                </Button>
                <Button variant="ghost" className="justify-start text-[14px] text-muted-foreground" onClick={() => { signOut(); setMobileOpen(false); }}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </Button>
              </>
            ) : (
              <Button className="mt-1 rounded-full bg-foreground text-background" asChild onClick={() => setMobileOpen(false)}>
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

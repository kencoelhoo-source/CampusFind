import React, { useState, useRef } from "react";
import { Search, ArrowRight, X } from "lucide-react";

interface GooeySearchBarProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
  placeholder?: string;
}

export function GooeySearchBar({
  onSearch,
  initialQuery = "",
  placeholder = 'Try "black wallet" or "ID card"',
}: GooeySearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Active (popped out) when hovered, focused, or when there is text
  const active = isFocused || isHovered || query.trim().length > 0;

  // Instant response on hover, subtle 60ms grace period on exit to prevent gap flickering
  const handleMouseEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    leaveTimerRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 60);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSearch(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  // Shared butter-smooth spring transition: slow, viscous honey/liquid gooey stretch and calm jelly bounce
  const springTransition = "transform 820ms cubic-bezier(0.28, 1.18, 0.4, 1), width 820ms cubic-bezier(0.28, 1.18, 0.4, 1)";

  return (
    <div
      className="relative z-20 w-full max-w-[480px] select-none py-1.5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ─── SVG Filter for Gooey / Metaball Liquid Physics ─── */}
      <svg
        className="pointer-events-none absolute h-0 w-0"
        style={{ position: "absolute", width: 0, height: 0 }}
        aria-hidden="true"
      >
        <defs>
          <filter id="gooey-merger" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  
                      0 1 0 0 0  
                      0 0 1 0 0  
                      0 0 0 20 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* ─── Unified Track: Layer 1 & Layer 2 Share Exact Dimensions ─── */}
      <div className="relative h-14 w-full">
        {/* Layer 1: Liquid SVG Gooey Background (Filtered) */}
        <div
          className="pointer-events-none absolute inset-0 filter drop-shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
          style={{ filter: "url(#gooey-merger)" }}
        >
          {/* Main Big Drop (Seamless Capsule) */}
          <div className="h-14 w-full rounded-full bg-white" />

          {/* Satellite Droplet (Pops out instantly with organic spring overshoot) */}
          <div
            className="absolute top-0 h-14 rounded-full bg-white will-change-transform"
            style={{
              left: "100%",
              width: active ? "116px" : "56px",
              transform: active ? "translate3d(32px, 0, 0)" : "translate3d(-56px, 0, 0)",
              transition: springTransition,
            }}
          />
        </div>

        {/* Layer 2: 100% Crisp Foreground (Outside Filter, Identical Coordinates) */}
        <div className="relative z-10 flex h-14 w-full items-center">
          {/* Main Input Field */}
          <div className="relative flex h-14 flex-1 items-center pl-5 pr-4">
            <Search className="h-5 w-5 shrink-0 text-black/45" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="h-full w-full bg-transparent pl-3 pr-2 text-[16px] font-medium text-black placeholder:text-black/45 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/8 text-black/60 transition-all hover:bg-black/15 hover:text-black active:scale-95"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" strokeWidth={2.2} />
              </button>
            )}
          </div>

          {/* Action Button inside Satellite Droplet: Moves synchronously with liquid layer */}
          <div
            className="absolute top-0 h-14 will-change-transform"
            style={{
              left: "100%",
              width: active ? "116px" : "56px",
              transform: active ? "translate3d(32px, 0, 0)" : "translate3d(-56px, 0, 0)",
              transition: springTransition,
            }}
          >
            <button
              type="button"
              onClick={handleSubmit}
              className="flex h-14 w-full items-center justify-center rounded-full text-[15px] font-semibold text-black transition-opacity hover:opacity-80 active:scale-[0.97] focus:outline-none"
            >
              {active ? (
                <span className="flex items-center gap-1.5">
                  <span>Search</span>
                  <ArrowRight className="h-4 w-4 opacity-70" />
                </span>
              ) : (
                <ArrowRight className="h-4 w-4 text-black/50" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

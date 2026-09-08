import React, { useState, useRef, useEffect } from "react";
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
  const [isPeeking, setIsPeeking] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches,
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 640px)");
    setIsDesktop(media.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    // On touch/mobile devices, perform a gentle intro peek animation so the gooey effect is immediately visible
    const isTouch = window.matchMedia("(hover: none)").matches;
    if (isTouch) {
      const peekTimer = setTimeout(() => {
        setIsPeeking(true);
        const resetTimer = setTimeout(() => setIsPeeking(false), 900);
        return () => clearTimeout(resetTimer);
      }, 700);
      return () => clearTimeout(peekTimer);
    }
  }, []);

  // Active (popped out) when hovered, focused, peeking on mobile, or when there is text
  const active = isFocused || isHovered || isPeeking || query.trim().length > 0;

  // Instant response on hover for mouse devices, ignore on touchscreens to prevent sticky hover
  const handleMouseEnter = () => {
    if (typeof window !== "undefined" && !window.matchMedia("(hover: hover)").matches) {
      return;
    }
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

  const ease = "780ms cubic-bezier(0.22, 1, 0.36, 1)";
  const springTransition = `width ${ease}, left ${ease}`;
  const dropletWidth = active ? 116 : 56;
  const dropletLeft = active ? "calc(100% - 116px)" : "calc(100% - 56px)";
  const capsuleWidth = active ? "calc(100% - 134px)" : "100%";

  if (!isDesktop) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
        className="relative z-20 w-full"
      >
        <div className="flex h-12 items-center rounded-full bg-white pl-3.5 pr-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
          <Search className="h-4 w-4 shrink-0 text-black/45" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search"
            className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-[16px] font-medium text-black placeholder:text-black/40 focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="mr-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-black/50"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" strokeWidth={2.2} />
            </button>
          ) : null}
          <button
            type="submit"
            aria-label="Search"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white"
          >
            <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>
      </form>
    );
  }

  return (
    <div
      className="relative z-20 w-full max-w-[500px] select-none py-1.5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ─── SVG Filter for Gooey / Metaball Liquid Physics ─── */}
      <svg
        className="pointer-events-none absolute -left-[9999px] -top-[9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <filter id="gooey-merger" x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  
                      0 1 0 0 0  
                      0 0 1 0 0  
                      0 0 0 19 -8"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* ─── Unified Track: Layer 1 & Layer 2 Share Exact Dimensions ─── */}
      <div className="relative h-14 w-full">
        {/* Layer 1: Liquid SVG Gooey Background (Filtered, with separate drop shadow container) */}
        <div className="pointer-events-none absolute inset-0 drop-shadow-[0_10px_28px_rgba(0,0,0,0.28)]">
          <div
            className="relative h-full w-full"
            style={{ filter: "url(#gooey-merger)" }}
          >
            {/* Main Big Drop (Seamless Capsule) */}
            <div
              className="h-14 rounded-full bg-white"
              style={{
                width: capsuleWidth,
                transition: springTransition,
              }}
            />

            <div
              className="absolute top-0 h-14 rounded-full bg-white"
              style={{
                left: dropletLeft,
                width: `${dropletWidth}px`,
                transition: springTransition,
              }}
            />
          </div>
        </div>

        {/* Layer 2: 100% Crisp Foreground (Outside Filter, Identical Coordinates) */}
        <div className="relative z-10 flex h-14 w-full items-center">
          {/* Main Input Field */}
          <div
            onClick={() => {
              setIsPeeking(false);
              inputRef.current?.focus();
            }}
            className="relative flex h-14 cursor-text items-center pl-4 sm:pl-5 pr-2 sm:pr-4"
            style={{
              width: capsuleWidth,
              transition: springTransition,
            }}
          >
            <Search className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-black/45" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                setIsPeeking(false);
                setIsFocused(true);
              }}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="h-full min-w-0 w-full bg-transparent pl-2.5 sm:pl-3 pr-2 text-[16px] font-medium text-black placeholder:text-black/45 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
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

          <div
            className="absolute top-0 h-14"
            style={{
              left: dropletLeft,
              width: `${dropletWidth}px`,
              transition: springTransition,
            }}
          >
            <button
              type="button"
              onClick={handleSubmit}
              aria-label="Search"
              className="flex h-14 w-full items-center justify-center gap-1.5 rounded-full font-semibold text-black focus:outline-none"
            >
              <span
                className="overflow-hidden whitespace-nowrap text-[15px]"
                style={{
                  maxWidth: active ? 64 : 0,
                  opacity: active ? 1 : 0,
                  transition: `max-width ${ease}, opacity 280ms ease`,
                }}
              >
                Search
              </span>
              <ArrowRight
                className="h-4 w-4 shrink-0 opacity-70"
                strokeWidth={2.2}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

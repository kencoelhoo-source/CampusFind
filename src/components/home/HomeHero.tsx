import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  FileText,
  Gem,
  Key,
  Laptop,
  Package,
  Plus,
  Search,
  Shirt,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrompt } from "@/contexts/AuthPromptContext";
import { GooeySearchBar } from "@/features/items/components/GooeySearchBar";
import { GlowAction } from "@/components/common/GlowAction";
import type { ItemWithImage } from "@/features/items/types";
import heroCampus from "@/assets/hero-campus.jpg";
import heroMobile from "@/assets/hero-mobile.jpg";

// All motion lives in index.css (.hero-*) and only animates transform/opacity, so it runs
// on the compositor instead of the main thread. No JS animation loops here.

const SEARCH_SUGGESTIONS = [
  "black Casio calculator",
  "blue Milton bottle",
  "ID card near the library",
  "bike keys",
  "AirPods case",
];

const SUBLINE = "The lost & found board for SFIT. Anyone can browse — sign in with your SFIT Google account to post or claim.";

/** Stagger delay for a .hero-rise / .hero-line element. */
const delay = (ms: number) => ({ "--hero-delay": `${ms}ms` }) as CSSProperties;

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  electronics: Laptop,
  clothing: Shirt,
  documents: FileText,
  keys: Key,
  wallet: Wallet,
  jewelry: Gem,
  books: BookOpen,
  other: Package,
};

const STATUS_STYLE: Record<string, { label: string; text: string; tile: string }> = {
  found: { label: "Found", text: "text-emerald-600", tile: "bg-emerald-50 text-emerald-600" },
  lost: { label: "Lost", text: "text-rose-600", tile: "bg-rose-50 text-rose-600" },
  returned: { label: "Returned", text: "text-sky-600", tile: "bg-sky-50 text-sky-600" },
  claimed: { label: "Claimed", text: "text-amber-600", tile: "bg-amber-50 text-amber-600" },
};

/** Cascade so the three cards don't sit in a rigid column. */
const CARD_OFFSETS = ["0px", "44px", "16px"];

function timeAgo(dateStr: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(dateStr).getTime()) / 60000));
  if (Number.isNaN(minutes)) return "";
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** The newest real listings, styled as phone notifications. Renders nothing on an empty board. */
function BoardPreview({ items }: { items: ItemWithImage[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cards = items.filter((item) => item.status in STATUS_STYLE).slice(0, 3);

  // Stop the idle float once the hero is scrolled away.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      container.dataset.offscreen = entry.isIntersecting ? "false" : "true";
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [cards.length]);

  if (cards.length === 0) return null;

  return (
    <div ref={containerRef} className="hero-preview w-full max-w-[420px]">
      <div className="flex flex-col gap-3.5">
        {cards.map((item, index) => {
          const status = STATUS_STYLE[item.status];
          const Icon = CATEGORY_ICONS[item.category] ?? Package;
          return (
            <div key={item.id} className="hero-rise" style={{ ...delay(520 + index * 120), marginLeft: CARD_OFFSETS[index] }}>
              <Link
                to={`/items/${item.id}`}
                className="hero-float flex w-[340px] items-center gap-3.5 rounded-[22px] bg-white/95 p-3 pr-4 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)] ring-1 ring-black/5 transition-[background-color,box-shadow] duration-300 hover:bg-white hover:shadow-[0_28px_70px_-22px_rgba(0,0,0,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                style={{ "--float-delay": `${index * -2.1}s` } as CSSProperties}
              >
                <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px]", status.tile)}>
                  {item.image_url ? (
                    <img src={item.image_url} alt="" decoding="async" className="h-full w-full object-cover" />
                  ) : (
                    <Icon className="h-5 w-5" strokeWidth={1.9} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className={cn("text-[11px] font-semibold uppercase tracking-[0.1em]", status.text)}>{status.label}</span>
                    <span className="shrink-0 text-[11.5px] text-neutral-400">{timeAgo(item.created_at)}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[15px] font-semibold tracking-tight text-neutral-950">{item.title}</span>
                  {item.location && <span className="block truncate text-[13px] text-neutral-500">{item.location}</span>}
                </span>
              </Link>
            </div>
          );
        })}
      </div>
      <div className="hero-rise mt-5" style={{ ...delay(900), marginLeft: CARD_OFFSETS[1] }}>
        <Link
          to="/items"
          className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-white/85 transition-colors hover:text-white"
        >
          See the whole board
          <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-apple group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** One headline line that slides up from behind a mask. */
function RevealLine({ children, delayMs }: { children: ReactNode; delayMs: number }) {
  return (
    <span className="-mb-[0.18em] block overflow-hidden pb-[0.18em]">
      <span className="hero-line block" style={delay(delayMs)}>
        {children}
      </span>
    </span>
  );
}

/**
 * Desktop search. Its state (typed text, rotating hint) lives here so typing or the
 * hint changing re-renders only this form, not the whole hero.
 */
function HeroSearch({ onSearch }: { onSearch: (query: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  useEffect(() => {
    if (query || prefersReducedMotion()) return;
    const timer = window.setInterval(
      () => setSuggestionIndex((index) => (index + 1) % SEARCH_SUGGESTIONS.length),
      2800,
    );
    return () => window.clearInterval(timer);
  }, [query]);

  // "/" jumps to the search, like most search-first sites.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      const input = inputRef.current;
      if (!input || input.offsetParent === null) return;
      event.preventDefault();
      input.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        if (!query.trim()) inputRef.current?.focus();
        else onSearch(query);
      }}
      className="relative flex h-[60px] w-full items-center rounded-full bg-white pl-6 pr-2 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.6)] ring-white/30 transition-shadow duration-300 focus-within:ring-4"
    >
      <Search className="h-[19px] w-[19px] shrink-0 text-neutral-900" strokeWidth={2.2} aria-hidden />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Search lost and found"
        autoComplete="off"
        className="h-full w-full border-0 bg-transparent pl-3.5 pr-2 text-[16px] text-neutral-950 outline-none ring-0 focus:outline-none focus:ring-0"
      />
      {!query && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-[58px] right-24 flex items-center gap-1 overflow-hidden text-[16px] text-neutral-500"
        >
          Try
          <span key={suggestionIndex} className="hero-hint truncate">
            “{SEARCH_SUGGESTIONS[suggestionIndex]}”
          </span>
        </span>
      )}
      {!query && (
        <kbd
          aria-hidden
          className="mr-2 hidden shrink-0 rounded-md border border-neutral-300 px-1.5 py-0.5 font-sans text-[11px] font-medium text-neutral-500 lg:block"
        >
          /
        </kbd>
      )}
      <button
        type="submit"
        aria-label="Search items"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white transition-transform duration-300 ease-apple hover:scale-105 active:scale-95"
      >
        <ArrowRight className="h-[18px] w-[18px]" />
      </button>
    </form>
  );
}

export function HomeHero({ recentItems }: { recentItems: ItemWithImage[] }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openAuthPrompt } = useAuthPrompt();

  const startPost = (type?: "lost" | "found") => {
    const redirectUrl = type ? `/post?type=${type}` : "/post";
    if (user) navigate(redirectUrl);
    else openAuthPrompt({ actionType: type ?? "report", redirectUrl });
  };

  const runSearch = (value: string) => {
    const trimmed = value.trim();
    if (trimmed) navigate(`/items?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-[#161412]">
      {/* Background photograph (unchanged). Shade only where text sits so the rest stays vivid. */}
      <div className="hero-parallax absolute inset-0">
        <div className="hero-photo absolute inset-0">
          <picture>
            <source media="(max-width: 767px)" srcSet={heroMobile} />
            <img
              src={heroCampus}
              alt="A backpack and keys left on a campus bench"
              decoding="async"
              className="h-full w-full object-cover object-center md:object-[center_65%]"
            />
          </picture>
          {/* Mobile: clear sky, dark base behind the text */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10 md:hidden" />
          {/* Desktop: dark on the text side, clear on the right; light top band for the navbar */}
          <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-black/80 via-black/45 to-black/0 md:block" />
          <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-44 bg-gradient-to-b from-black/50 to-transparent md:block" />
        </div>
      </div>

      {/* ─── Mobile ─── */}
      <div className="container relative z-10 flex min-h-[100svh] flex-col justify-end pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-20 md:hidden">
        <h1 className="font-['Inter_Tight',sans-serif] text-[2.6rem] font-semibold leading-[0.98] tracking-[-0.035em] text-white min-[380px]:text-[2.9rem] sm:text-[3.4rem]">
          <RevealLine delayMs={80}>Left behind.</RevealLine>
          <RevealLine delayMs={190}>
            Brought <span className="text-[#9CC8FF]">back.</span>
          </RevealLine>
        </h1>
        <p className="hero-rise mt-4 max-w-md text-[15.5px] leading-relaxed text-white/85" style={delay(300)}>
          {SUBLINE}
        </p>

        <div className="hero-rise mt-7" style={delay(380)}>
          <GooeySearchBar onSearch={runSearch} placeholder="Search for lost items..." />
        </div>

        <div className="hero-rise mt-4 flex w-full" style={delay(460)}>
          <GlowAction className="w-full" onClick={() => startPost()}>
            <Plus className="mr-2 h-[1.1rem] w-[1.1rem] opacity-90" />
            Report an item
          </GlowAction>
        </div>
      </div>

      {/* ─── Desktop ─── */}
      <div className="container relative z-10 hidden min-h-[100svh] items-center pb-16 pt-28 md:flex">
        <div className="grid w-full items-center gap-10 lg:grid-cols-12">
          <div className="w-full max-w-[720px] lg:col-span-7">
            <h1 className="font-['Inter_Tight',sans-serif] text-[clamp(4.25rem,7.4vw,7rem)] font-semibold leading-[0.92] tracking-[-0.045em] text-white">
              <RevealLine delayMs={80}>Left behind.</RevealLine>
              <RevealLine delayMs={190}>
                Brought <span className="text-[#9CC8FF]">back.</span>
              </RevealLine>
            </h1>

            <p className="hero-rise mt-7 max-w-[470px] text-[18px] leading-[1.6] text-white/85" style={delay(300)}>
              {SUBLINE}
            </p>

            <div className="hero-rise mt-10 max-w-[560px]" style={delay(380)}>
              <HeroSearch onSearch={runSearch} />
            </div>

            <div className="hero-rise mt-5 flex flex-wrap items-center gap-3" style={delay(460)}>
              {(
                [
                  { type: "lost", label: "I lost something" },
                  { type: "found", label: "I found something" },
                ] as const
              ).map((action) => (
                <button
                  key={action.type}
                  type="button"
                  onClick={() => startPost(action.type)}
                  className={cn(
                    "group inline-flex h-11 items-center gap-2 rounded-full border border-white/35 px-5 text-[14.5px] font-medium text-white",
                    "transition-[background-color,color,border-color] duration-300 ease-apple",
                    "hover:border-white hover:bg-white hover:text-neutral-950",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                  )}
                >
                  {action.label}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-apple group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Right: newest real listings */}
          <div className="hidden lg:col-span-5 lg:flex lg:justify-end">
            <BoardPreview items={recentItems} />
          </div>
        </div>
      </div>
    </section>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GooeySearchBar } from "@/features/items/components/GooeySearchBar";
import { GlowAction } from "@/components/common/GlowAction";
import { ItemCard } from "@/features/items/components/ItemCard";
import { PosterSkeleton } from "@/components/common/Skeletons";
import {
  Search,
  ArrowRight,
  ArrowUpRight,
  Laptop,
  Shirt,
  FileText,
  Key,
  Wallet,
  Gem,
  BookOpen,
  Package,
  ShieldCheck,
  MapPin,
  EyeOff,
} from "lucide-react";
import heroCampus from "@/assets/hero-campus.jpg";
import heroMobile from "@/assets/hero-mobile.jpg";
import ctaBgLight from "@/assets/0e34447f-6cc2-4ef0-8be0-4a23b0f02120.png";
import ctaBgDark from "@/assets/4abc0fac-82b8-4587-8c55-bccbcba4bc9b.png";
import ctaBgLightMobile from "@/assets/6e21cf92-d91b-4fd1-b357-b1cf6e45b408.png";
import ctaBgDarkMobile from "@/assets/4bf80ec4-dde3-47a2-a02e-61d8c9a319f6.png";
import { fetchHomeStats, fetchRecentItems } from "@/features/items/services/itemsApi";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORIES } from "@/constants";
import { FAQS } from "@/data/faqs";

const categoryIcons = {
  Laptop,
  Shirt,
  FileText,
  Key,
  Wallet,
  Gem,
  BookOpen,
  Package,
} as const;

const categoryDetails: Record<string, { desc: string; color: string }> = {
  electronics: { desc: "Laptops, chargers, earbuds", color: "text-sky-500 dark:text-sky-400" },
  clothing: { desc: "Jackets, hoodies, caps", color: "text-amber-500 dark:text-amber-400" },
  documents: { desc: "IDs, cards, licenses", color: "text-emerald-500 dark:text-emerald-400" },
  keys: { desc: "Room keys, bike keys", color: "text-violet-500 dark:text-violet-400" },
  wallet: { desc: "Wallets, purses, pouches", color: "text-rose-500 dark:text-rose-400" },
  jewelry: { desc: "Watches, rings, chains", color: "text-pink-500 dark:text-pink-400" },
  books: { desc: "Textbooks, notes, binders", color: "text-indigo-500 dark:text-indigo-400" },
  other: { desc: "Bottles, umbrellas, miscellaneous", color: "text-teal-500 dark:text-teal-400" },
};

const steps = [
  {
    title: "Post it",
    colorClass: "text-[#FACC15] dark:text-[#FEF08A]",
    body: (
      <>
        <span className="text-[#FACC15] dark:text-[#FEF08A]">Lost or found</span>, same form. Title, place, <span className="text-[#FACC15] dark:text-[#FEF08A]">a photo</span> if you have one.
      </>
    ),
  },
  {
    title: "Describe it",
    colorClass: "text-[#4ADE80] dark:text-[#A7F3D0]",
    body: (
      <>
        The owner sends <span className="text-[#4ADE80] dark:text-[#A7F3D0]">one note</span>: a mark, a color, what’s inside. That’s <span className="text-[#4ADE80] dark:text-[#A7F3D0]">the claim</span>.
      </>
    ),
  },
  {
    title: "Hand it back",
    colorClass: "text-[#0EA5E9] dark:text-[#93C5FD]",
    body: (
      <>
        Confirm <span className="text-[#0EA5E9] dark:text-[#93C5FD]">proof of ownership</span>, coordinate a safe handover on campus, and mark it <span className="text-[#0EA5E9] dark:text-[#93C5FD]">resolved</span>.
      </>
    ),
  },
];

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["home"],
    queryFn: async () => {
      const [items, stats] = await Promise.all([fetchRecentItems(), fetchHomeStats()]);
      return { items, stats };
    },
  });

  const handleSearch = () => {
    if (search.trim()) {
      navigate(`/items?q=${encodeURIComponent(search.trim())}`);
    } else {
      navigate("/items");
    }
  };

  const items = data?.items || [];
  const stats = data?.stats || { total: 0, lost: 0, found: 0 };

  return (
    <div>
      {/* ─── Hero ─── */}
      <section className="relative min-h-[100svh] overflow-hidden">
        <div className="absolute inset-0">
          <picture>
            <source media="(max-width: 767px)" srcSet={heroMobile} />
            <img
              src={heroCampus}
              alt="A backpack and keys left on a campus bench"
              className="h-full w-full object-cover object-center md:object-[center_65%]"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/25" />
        </div>

        <div className="container relative z-10 flex min-h-[100svh] flex-col justify-end pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-20 md:pb-24 md:pt-28">
          <p className="animate-fade-in text-[11px] font-medium uppercase tracking-[0.16em] text-white/70 sm:text-[13px] sm:tracking-[0.22em] md:text-[14px]">
            SFIT Lost & Found
          </p>
          <h1 className="mt-3 max-w-3xl animate-fade-in font-display text-[1.9rem] font-semibold leading-[1.08] tracking-tight text-white min-[380px]:text-[2.25rem] sm:mt-4 sm:text-[2.7rem] md:mt-5 md:text-[4.5rem]">
            Left behind.
            <br />
            <span className="text-white/72">Brought back.</span>
          </h1>
          <p
            className="mt-3 hidden max-w-lg animate-fade-in text-[16px] leading-relaxed text-white/75 min-[400px]:block sm:mt-4 md:mt-6 md:text-[19px]"
            style={{ animationDelay: "0.08s" }}
          >
            The campus board for SFIT. Browse without an account. Sign in with college Google to post or claim.
          </p>

          <div className="mt-6 animate-fade-in sm:mt-8 md:mt-10" style={{ animationDelay: "0.16s" }}>
            <GooeySearchBar
              onSearch={(q) => {
                if (q.trim()) {
                  navigate(`/items?q=${encodeURIComponent(q.trim())}`);
                } else {
                  navigate("/items");
                }
              }}
              placeholder={'Try "black wallet" or "ID card"'}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 animate-fade-in sm:mt-6 md:hidden" style={{ animationDelay: "0.24s" }}>
            <Button
              variant="outline"
              className="h-10 rounded-full border-white/25 bg-white/10 px-3 text-[13px] text-white backdrop-blur-md"
              asChild
            >
              <Link to={user ? "/post?type=lost" : "/auth"}>Lost</Link>
            </Button>
            <Button
              variant="outline"
              className="h-10 rounded-full border-white/25 bg-white/10 px-3 text-[13px] text-white backdrop-blur-md"
              asChild
            >
              <Link to={user ? "/post?type=found" : "/auth"}>Found</Link>
            </Button>
          </div>
          <div className="mt-6 hidden animate-fade-in gap-3 md:flex" style={{ animationDelay: "0.24s" }}>
            <GlowAction to={user ? "/post?type=lost" : "/auth"}>I lost something</GlowAction>
            <GlowAction to={user ? "/post?type=found" : "/auth"}>I found something</GlowAction>
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="py-8 md:py-28">
        <div className="container">
          <div className="rounded-2xl border border-border/50 bg-card/40 px-2 py-3.5 backdrop-blur-sm sm:rounded-3xl sm:p-8 md:p-12">
            <div className="grid grid-cols-3 divide-x divide-border/40">
              {[
                { value: stats.total, short: "Board", label: "On the board", sub: "Active community reports" },
                { value: stats.lost, short: "Lost", label: "Still lost", sub: "Awaiting recovery on campus" },
                { value: stats.found, short: "Found", label: "Waiting to return", sub: "Safely secured by finders" },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center justify-center px-2 py-1 text-center animate-count-up md:p-6"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <span className="font-display text-[1.65rem] font-semibold tracking-tight text-foreground sm:text-5xl md:text-7xl">
                    {stat.value}
                  </span>
                  <p className="mt-0.5 text-[11px] font-medium text-muted-foreground md:mt-3 md:text-[16px] md:font-semibold md:text-foreground">
                    <span className="md:hidden">{stat.short}</span>
                    <span className="hidden md:inline">{stat.label}</span>
                  </p>
                  <p className="mt-1 hidden text-[13px] text-muted-foreground md:block">
                    {stat.sub}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Hairline Divider ─── */}
      <div className="container">
        <div className="border-t border-border/40" />
      </div>

      {/* ─── Steps ─── */}
      <section className="container py-24 md:py-32">
        <p className="text-[14px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          From lost to returned.
        </p>
        <h2 className="mt-6 max-w-xl font-display text-[2rem] font-semibold tracking-tight md:text-[3.5rem] md:leading-[1.08]">
          A simple way back.
        </h2>
        <div className="tile mt-12 grid divide-y divide-border/40 md:mt-16 md:grid-cols-3 md:divide-x md:divide-y-0">
          {steps.map((step) => (
            <div
              key={step.title}
              className="flex flex-col justify-center p-6 sm:min-h-[180px] md:p-8"
            >
              <h3 className={`font-display text-xl font-bold tracking-tight md:text-2xl ${step.colorClass}`}>
                {step.title}
              </h3>
              <p className="mt-3 text-[15px] font-bold leading-relaxed text-foreground md:text-[17px]">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Hairline Divider ─── */}
      <div className="container">
        <div className="border-t border-border/40" />
      </div>

      {/* ─── Built for one campus ─── */}
      <section className="container py-24 md:py-36">
        <p className="text-[14px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Built for one campus.
        </p>
        <h2 className="mt-6 max-w-4xl font-display text-[2.5rem] font-semibold leading-[1.06] tracking-tight sm:text-5xl md:text-[4.25rem] lg:text-[4.75rem]">
          Lost between lectures.{" "}
          <span className="text-muted-foreground/50">
            Found by someone in the same hall.
          </span>
        </h2>
      </section>

      {/* ─── Hairline Divider ─── */}
      <div className="container">
        <div className="border-t border-border/40" />
      </div>

      {/* ─── Categories ─── */}
      <section className="container py-24 md:py-32">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[14px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Find it on the board.
            </p>
            <h2 className="mt-6 font-display text-[2rem] font-semibold tracking-tight md:text-[3.5rem] md:leading-[1.08]">
              Start with what you lost.
            </h2>
          </div>
          <Link to="/items" className="hidden items-center text-[15px] text-primary md:inline-flex">
            All listings <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="tile mt-12 overflow-hidden md:mt-16">
          <div className="grid grid-cols-2 gap-px bg-border/40 md:grid-cols-4">
            {CATEGORIES.map((cat) => {
              const Icon = categoryIcons[cat.icon as keyof typeof categoryIcons] ?? Package;
              const details = categoryDetails[cat.value] ?? { desc: "Browse items", color: "text-primary bg-primary/10" };
              const featured = cat.value === "electronics" || cat.value === "wallet";
              const wide = cat.value === "books" || cat.value === "other";
              return (
                <Link
                  key={cat.value}
                  to={`/items?category=${cat.value}`}
                  className={`group relative flex flex-col justify-between bg-card p-6 transition-all duration-300 ease-apple hover:bg-secondary/40 sm:p-7 md:p-8 ${
                    featured
                      ? "min-h-[190px] md:col-span-2 md:min-h-[220px]"
                      : wide
                      ? "min-h-[160px] md:col-span-2 md:min-h-[180px]"
                      : "min-h-[160px] md:min-h-[180px]"
                  }`}
                >
                  {/* Top: Floating Icon + hover arrow */}
                  <div className="flex items-start justify-between">
                    <Icon
                      className={`h-8 w-8 transition-colors duration-300 sm:h-9 sm:w-9 md:h-10 md:w-10 ${details.color}`}
                      strokeWidth={1.65}
                    />
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/40 transition-colors duration-300 group-hover:text-foreground">
                      <ArrowUpRight className="h-4 w-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    </div>
                  </div>

                  {/* Bottom: Title & Context Subtitle (Intact, zero layout movement) */}
                  <div className="mt-8">
                    <h3 className="font-display text-[18px] font-bold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary sm:text-[19px] md:text-[21px]">
                      {cat.label}
                    </h3>
                    <p className="mt-1 text-[13px] font-medium text-muted-foreground sm:text-[14px]">
                      {details.desc}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Hairline Divider ─── */}
      <div className="container">
        <div className="border-t border-border/40" />
      </div>

      {/* ─── The board ─── */}
      <section className="container py-24 md:py-32">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[14px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              The board.
            </p>
            <h2 className="mt-6 font-display text-[2rem] font-semibold tracking-tight md:text-[3.5rem] md:leading-[1.08]">
              Recent items
            </h2>
          </div>
          <Link to="/items" className="inline-flex items-center text-[15px] text-primary">
            View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 md:mt-16 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <PosterSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="tile mt-12 px-6 py-16 text-center md:mt-16">
            <p className="font-display text-2xl font-semibold tracking-tight">The board is quiet.</p>
            <p className="mx-auto mt-4 max-w-md text-[17px] leading-relaxed text-muted-foreground">
              You can still search. Sign in with your SFIT Google account when you're ready to post.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Button asChild>
                <Link to={user ? "/post" : "/auth"}>{user ? "Report an item" : "Sign in to post"}</Link>
              </Button>
              <Button variant="secondary" className="border border-border/70" asChild>
                <Link to="/items">Browse anyway</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 md:mt-16 lg:grid-cols-4">
            {items.map((item, i) => (
              <div key={item.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                <ItemCard {...item} image_url={item.image_url} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Hairline Divider ─── */}
      <div className="container">
        <div className="border-t border-border/40" />
      </div>

      {/* ─── Trust pillars (Apple-style Bento Feature Cards) ─── */}
      <section className="container py-24 md:py-32">
        <p className="text-[14px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Not the internet. Your campus.
        </p>
        <h2 className="mt-6 max-w-2xl font-display text-[2rem] font-semibold tracking-tight md:text-[3.5rem] md:leading-[1.08]">
          A closed campus makes returns easier.
        </h2>
        <div className="mt-12 grid gap-6 md:mt-16 md:grid-cols-3">
          {[
            {
              id: "google-only",
              icon: ShieldCheck,
              iconColor: "text-rose-500 dark:text-rose-400",
              body: (
                <>
                  Sign-in is locked to <span className="font-bold text-rose-500 dark:text-rose-400">@student.sfit.ac.in</span> and <span className="font-bold text-rose-500 dark:text-rose-400">@sfit.ac.in</span>. No public internet crowd.
                </>
              ),
            },
            {
              id: "private-contact",
              icon: EyeOff,
              iconColor: "text-emerald-500 dark:text-emerald-400",
              body: (
                <>
                  The board shows a <span className="font-bold text-emerald-500 dark:text-emerald-400">name</span>, not your inbox. Claims are only visible to the <span className="font-bold text-emerald-500 dark:text-emerald-400">two people</span> involved.
                </>
              ),
            },
            {
              id: "public-meet",
              icon: MapPin,
              iconColor: "text-violet-500 dark:text-violet-400",
              body: (
                <>
                  Library, canteen, quadrangle. Describe it, then collect it <span className="font-bold text-violet-500 dark:text-violet-400">in person</span>.
                </>
              ),
            },
          ].map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border border-border/50 bg-card/40 p-8 backdrop-blur-sm transition-all duration-300 ease-apple hover:border-border hover:bg-card/60 md:p-10"
            >
              <item.icon className={`h-8 w-8 ${item.iconColor}`} strokeWidth={1.8} />
              <p className="mt-6 font-display text-[19px] font-medium leading-[1.38] tracking-tight text-foreground/90 sm:text-[20px] md:text-[22px]">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Hairline Divider ─── */}
      <div className="container">
        <div className="border-t border-border/40" />
      </div>

      {/* ─── FAQ ─── */}
      <section className="container grid gap-10 py-24 md:grid-cols-2 md:gap-16 md:py-32">
        <div>
          <h2 className="font-display text-[2rem] font-semibold tracking-tight md:text-[3.5rem] md:leading-[1.08]">
            Questions, answered.
          </h2>
          <p className="mt-6 text-[17px] leading-relaxed text-muted-foreground md:text-[19px]">
            Browse as a guest. Posting and claiming needs an SFIT account.
          </p>
          <Link to="/faq" className="mt-8 inline-flex items-center text-[15px] text-primary">
            All FAQs <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="tile px-5">
          <Accordion type="single" collapsible>
            {FAQS.slice(0, 4).map((item, index) => (
              <AccordionItem key={item.q} value={`home-${index}`}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ─── Hairline Divider ─── */}
      <div className="container">
        <div className="border-t border-border/40" />
      </div>

      {/* ─── CTA footer (Light/Dark SFIT Campus Illustration) ─── */}
      <section className="relative overflow-hidden pt-14 pb-14 text-center min-h-[80svh] min-[400px]:min-h-[85svh] flex flex-col justify-start sm:min-h-0 sm:py-32 md:py-44">
        <div className="absolute inset-0 z-0">
          <picture className="block h-full w-full dark:hidden">
            <source media="(max-width: 767px)" srcSet={ctaBgLightMobile} />
            <img
              src={ctaBgLight}
              alt="SFIT campus illustration"
              className="h-full w-full object-cover object-bottom md:object-center"
            />
          </picture>
          <picture className="hidden h-full w-full dark:block">
            <source media="(max-width: 767px)" srcSet={ctaBgDarkMobile} />
            <img
              src={ctaBgDark}
              alt="SFIT campus illustration"
              className="h-full w-full object-cover object-bottom md:object-center"
            />
          </picture>
        </div>

        <div className="container relative z-10">
          <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-foreground/70 dark:text-white/70 sm:text-[14px] sm:tracking-[0.24em]">
            SFIT campus
          </p>
          <h2 className="mt-4 font-display text-[2.15rem] font-semibold leading-[1.08] tracking-tight text-foreground min-[375px]:text-[2.45rem] min-[420px]:text-[2.75rem] sm:mt-6 sm:text-5xl md:text-[4.5rem] lg:text-[5rem] dark:text-white">
            Built only for <span className="text-primary">SFIT.</span>
          </h2>
          <p className="mx-auto mt-3.5 max-w-sm text-[15px] font-medium leading-relaxed text-foreground/75 min-[375px]:text-[16px] sm:mt-5 sm:max-w-xl sm:text-[20px] md:text-[22px] dark:text-white/80">
            Post, claim, and return on campus. College Google accounts only.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:mt-8 sm:gap-2.5">
            <span className="inline-flex items-center rounded-full border border-border/70 bg-white/85 px-3.5 py-1.5 text-[12.5px] font-medium text-foreground shadow-xs backdrop-blur-md dark:border-white/15 dark:bg-neutral-900/60 dark:text-white sm:px-4 sm:text-[14px]">
              @student.sfit.ac.in
            </span>
            <span className="inline-flex items-center rounded-full border border-border/70 bg-white/85 px-3.5 py-1.5 text-[12.5px] font-medium text-foreground shadow-xs backdrop-blur-md dark:border-white/15 dark:bg-neutral-900/60 dark:text-white sm:px-4 sm:text-[14px]">
              @sfit.ac.in
            </span>
          </div>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 min-[440px]:flex-row sm:mt-10 sm:gap-3.5">
            <Button
              className="h-11 w-full max-w-[220px] rounded-full bg-white px-7 text-[14.5px] font-medium text-slate-900 shadow-md transition-all duration-200 hover:bg-slate-100 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 min-[440px]:h-12 min-[440px]:w-auto sm:h-13 sm:text-[16px]"
              asChild
            >
              <Link to={user ? "/dashboard" : "/auth"} className="inline-flex items-center justify-center gap-2.5">
                {!user && (
                  <svg className="h-4 w-4 shrink-0 sm:h-4.5 sm:w-4.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                <span>{user ? "Go to dashboard" : "Sign in with Google"}</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-11 w-full max-w-[220px] rounded-full border-border/80 bg-white/85 px-7 text-[14.5px] font-medium text-foreground backdrop-blur-md transition-all duration-200 hover:bg-white dark:border-white/25 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 min-[440px]:h-12 min-[440px]:w-auto sm:h-13 sm:text-[16px]"
              asChild
            >
              <Link to="/items" className="inline-flex items-center justify-center">
                Browse the board
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

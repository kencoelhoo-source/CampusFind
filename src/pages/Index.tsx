import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuthPrompt } from "@/contexts/AuthPromptContext";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GooeySearchBar } from "@/features/items/components/GooeySearchBar";
import { GlowAction } from "@/components/common/GlowAction";
import { ItemCard } from "@/features/items/components/ItemCard";
import { PosterSkeleton } from "@/components/common/Skeletons";
import {
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
  Plus,
} from "lucide-react";
import heroCampus from "@/assets/hero-campus.jpg";
import heroMobile from "@/assets/hero-mobile.jpg";
import ctaBgLight from "@/assets/d583a0b4-1ce2-4978-9e7f-a029494d6058.webp";
import ctaBgDark from "@/assets/4abc0fac-82b8-4587-8c55-bccbcba4bc9b.webp";
import ctaBgLightMobile from "@/assets/a7a160a9-01a1-4cfc-b8c6-b5b244c8c641.webp";
import ctaBgDarkMobile from "@/assets/d51212a2-1fa5-4bab-9fc8-ebd4cc54417f.webp";
import { fetchHomeStats, fetchRecentItems } from "@/features/items/services/itemsApi";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORIES } from "@/constants";
import { FAQS } from "@/data/faqs";
import { Footer } from "@/components/layout/Footer";

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

const stepAccent = {
  yellow: "text-[#E8B400] dark:text-[#FFD60A]",
  green: "text-[#34C759] dark:text-[#30D158]",
  blue: "text-[#007AFF] dark:text-[#64D2FF]",
} as const;

const trustAccent = {
  pink: "text-[#FF375F] dark:text-[#FF6482]",
  green: "text-[#34C759] dark:text-[#30D158]",
  purple: "text-[#AF52DE] dark:text-[#BF5AF2]",
} as const;

const steps = [
  {
    title: "Post it",
    colorClass: stepAccent.yellow,
    body: (
      <>
        <span className={stepAccent.yellow}>Lost or found</span>, same form. Title, place, <span className={stepAccent.yellow}>a photo</span> if you have one.
      </>
    ),
  },
  {
    title: "Describe it",
    colorClass: stepAccent.green,
    body: (
      <>
        The owner sends <span className={stepAccent.green}>one note</span>: a mark, a color, what’s inside. That’s <span className={stepAccent.green}>the claim</span>.
      </>
    ),
  },
  {
    title: "Hand it back",
    colorClass: stepAccent.blue,
    body: (
      <>
        Confirm <span className={stepAccent.blue}>proof of ownership</span>, coordinate a safe handover on campus, and mark it <span className={stepAccent.blue}>resolved</span>.
      </>
    ),
  },
];

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openAuthPrompt } = useAuthPrompt();
  const [mobileAction, setMobileAction] = useState<"lost" | "found">("lost");

  const handleMobileActionClick = (type: "lost" | "found") => {
    setMobileAction(type);
    if (user) {
      navigate(`/post?type=${type}`);
    } else {
      openAuthPrompt({ actionType: type, redirectUrl: `/post?type=${type}` });
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["home"],
    queryFn: async () => {
      const [items, stats] = await Promise.all([fetchRecentItems(), fetchHomeStats()]);
      return { items, stats };
    },
  });

  const items = data?.items || [];
  const stats = data?.stats || { totalActive: 0, totalResolved: 0, recentActivity: 0 };

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
                const trimmed = q.trim();
                if (!trimmed) return;
                navigate(`/items?q=${encodeURIComponent(trimmed)}`);
              }}
              placeholder="Search for lost items..."
            />
          </div>

          {/* Mobile CTA: Report an item */}
          <div className="mt-8 flex w-full animate-fade-in justify-start sm:w-auto md:hidden" style={{ animationDelay: "0.24s" }}>
            <GlowAction
              className="w-full sm:w-auto"
              onClick={() => {
                if (user) navigate("/post");
                else openAuthPrompt({ actionType: "report", redirectUrl: "/post" });
              }}
            >
              <Plus className="mr-2 h-[1.1rem] w-[1.1rem] opacity-90" />
              Report an item
            </GlowAction>
          </div>

          {/* Desktop CTA: Lost/Found split */}
          <div className="mt-6 hidden animate-fade-in gap-3 md:flex" style={{ animationDelay: "0.24s" }}>
            <GlowAction
              onClick={() => {
                if (user) navigate("/post?type=lost");
                else openAuthPrompt({ actionType: "lost", redirectUrl: "/post?type=lost" });
              }}
            >
              I lost something
            </GlowAction>
            <GlowAction
              onClick={() => {
                if (user) navigate("/post?type=found");
                else openAuthPrompt({ actionType: "found", redirectUrl: "/post?type=found" });
              }}
            >
              I found something
            </GlowAction>
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="py-8 md:py-28">
        <div className="container">
          <div className="rounded-2xl border border-border/50 bg-card/40 px-2 py-3.5 backdrop-blur-sm sm:rounded-3xl sm:p-8 md:p-12">
            <div className="grid grid-cols-3 divide-x divide-border/40">
              {[
                { value: stats.totalActive, short: "Active", label: "Active cases", sub: "Currently lost or found items" },
                { value: stats.totalResolved, short: "Resolved", label: "Resolved", sub: "Successfully returned to owners" },
                { value: stats.recentActivity, short: "Recent", label: "This week", sub: "Items posted in the last 7 days" },
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
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {/* Mobile CTA */}
              <Button
                className="w-full sm:w-auto md:hidden"
                onClick={() => {
                  if (user) navigate("/post");
                  else openAuthPrompt({ actionType: "report", redirectUrl: "/post" });
                }}
              >
                Report an item
              </Button>

              {/* Desktop CTAs */}
              <Button
                className="hidden w-full sm:w-auto md:inline-flex"
                onClick={() => {
                  if (user) navigate("/post?type=lost");
                  else openAuthPrompt({ actionType: "lost", redirectUrl: "/post?type=lost" });
                }}
              >
                I lost something
              </Button>
              <Button
                className="hidden w-full sm:w-auto md:inline-flex"
                onClick={() => {
                  if (user) navigate("/post?type=found");
                  else openAuthPrompt({ actionType: "found", redirectUrl: "/post?type=found" });
                }}
              >
                I found something
              </Button>

              <Button variant="secondary" className="w-full sm:w-auto border border-border/70" asChild>
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
              iconColor: trustAccent.pink,
              body: (
                <>
                  Sign-in is locked to <span className={`font-bold ${trustAccent.pink}`}>@student.sfit.ac.in</span> and <span className={`font-bold ${trustAccent.pink}`}>@sfit.ac.in</span>. No public internet crowd.
                </>
              ),
            },
            {
              id: "private-contact",
              icon: EyeOff,
              iconColor: trustAccent.green,
              body: (
                <>
                  The board shows a <span className={`font-bold ${trustAccent.green}`}>name</span>, not your inbox. Claims are only visible to the <span className={`font-bold ${trustAccent.green}`}>two people</span> involved.
                </>
              ),
            },
            {
              id: "public-meet",
              icon: MapPin,
              iconColor: trustAccent.purple,
              body: (
                <>
                  Library, canteen, security. Hand it over in a <span className={`font-bold ${trustAccent.purple}`}>public campus place</span> — never a private one.
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

      {/* ─── CTA + footer share one landscape ─── */}
      <section className="relative mt-8 flex min-h-[90svh] flex-col overflow-hidden text-center sm:mt-0 sm:min-h-[42rem] md:min-h-[46rem]">
        <div className="absolute inset-0 z-0">
          <picture className="block h-full w-full dark:hidden">
            <source media="(max-width: 767px)" srcSet={ctaBgLightMobile} />
            <img
              src={ctaBgLight}
              alt="App interface preview"
              className="h-full w-full object-cover object-center"
            />
          </picture>
          <picture className="hidden h-full w-full dark:block">
            <source media="(max-width: 767px)" srcSet={ctaBgDarkMobile} />
            <img
              src={ctaBgDark}
              alt="App interface preview mobile"
              className="h-full w-full object-cover object-center"
            />
          </picture>
        </div>

        <div className="container relative z-10 mx-auto flex flex-1 flex-col items-center justify-center px-4 pt-16 pb-8 translate-y-7 sm:translate-y-0 sm:pt-20 sm:pb-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-foreground/65 dark:text-white/65 sm:text-[12px] sm:tracking-[0.28em]">
            SFIT Campus
          </p>

          <h2 className="mt-3.5 max-w-2xl font-display text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.035em] text-foreground min-[375px]:text-[2.6rem] sm:mt-4 sm:text-5xl md:text-6xl lg:text-[4.25rem] dark:text-white">
            Built only for{" "}
            <span className="text-blue-700 dark:text-[#E8CC96]">
              SFIT.
            </span>
          </h2>

          <p className="mx-auto mt-3 max-w-md text-[15px] font-normal leading-relaxed text-foreground/80 sm:mt-4 sm:max-w-lg sm:text-[17px] md:text-[18px] dark:text-white/80">
            Post, claim, and recover lost belongings across campus.
          </p>

          <p className="mt-2 text-[12px] tracking-tight text-foreground/60 sm:text-[13px] dark:text-white/55">
            Sign in with your <span className="font-medium text-foreground/80 dark:text-white/75">@student.sfit.ac.in</span> or <span className="font-medium text-foreground/80 dark:text-white/75">@sfit.ac.in</span> account.
          </p>

          <div className="mt-7 flex flex-row items-center justify-center gap-3 sm:mt-8 sm:gap-4">
            <Button
              className="h-11 rounded-full bg-foreground px-6 text-[13.5px] font-medium text-background shadow-xs transition-all duration-200 hover:bg-foreground/90 active:scale-[0.98] dark:bg-white dark:text-neutral-950 dark:hover:bg-white/90 sm:h-12 sm:px-7 sm:text-[15px]"
              asChild
            >
              <Link to={user ? "/dashboard" : "/auth"}>
                <span className="sm:hidden">{user ? "Dashboard" : "Sign in"}</span>
                <span className="hidden sm:inline">{user ? "Go to Dashboard" : "Sign in with Google"}</span>
              </Link>
            </Button>

            <Button
              variant="outline"
              className="h-11 rounded-full border-foreground/20 bg-foreground/5 px-6 text-[13.5px] font-medium text-foreground backdrop-blur-md transition-all duration-200 hover:bg-foreground/10 active:scale-[0.98] dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:border-white/30 dark:hover:bg-white/15 sm:h-12 sm:px-7 sm:text-[15px]"
              asChild
            >
              <Link to="/items">
                <span className="sm:hidden">Browse items</span>
                <span className="hidden sm:inline">Browse listings</span>
              </Link>
            </Button>
          </div>
        </div>

        <Footer embedded />
      </section>
    </div>
  );
}

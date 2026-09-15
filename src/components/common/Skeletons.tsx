import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("quiet-skeleton", className)} style={style} />;
}

export function PosterSkeleton() {
  return (
    <div className="relative isolate aspect-[4/5] w-full overflow-hidden rounded-[1.75rem] border border-border/40 bg-card/30 p-4 sm:p-5 md:aspect-[3/4] flex flex-col justify-between">
      {/* Category pill placeholder */}
      <Bone className="h-6 w-20 rounded-full" />

      {/* Bottom info placeholder */}
      <div className="space-y-2.5">
        <Bone className="h-3 w-24 rounded-full" />
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <Bone className="h-5 w-4/5 rounded-full" />
            <Bone className="h-4 w-3/5 rounded-full" />
          </div>
          <Bone className="h-10 w-10 shrink-0 rounded-full" />
        </div>
        <Bone className="h-3 w-1/3 rounded-full" />
      </div>
    </div>
  );
}

export function ListRowSkeleton() {
  return (
    <div className="tile flex items-center overflow-hidden pr-4 sm:pr-5">
      <Bone className="w-[6.75rem] shrink-0 self-stretch rounded-none sm:w-[8.5rem] md:w-[9.5rem]" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-4 py-3.5 sm:px-5 sm:py-4">
        <Bone className="h-3 w-24 rounded-full" />
        <Bone className="h-5 w-44 rounded-full" />
        <Bone className="h-3 w-28 rounded-full" />
      </div>
      <Bone className="h-9 w-9 shrink-0 rounded-full hidden sm:block" />
    </div>
  );
}

export function DashRowSkeleton() {
  return (
    <div className="tile flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        <Bone className="h-[4.25rem] w-[4.25rem] shrink-0 rounded-xl sm:h-20 sm:w-20" />
        <div className="min-w-0 flex-1 space-y-2">
          <Bone className="h-4 w-2/5 max-w-[200px] rounded-full" />
          <Bone className="h-3 w-1/4 max-w-[120px] rounded-full" />
        </div>
      </div>
      <Bone className="h-8 w-20 shrink-0 rounded-full hidden sm:block" />
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="container py-6 md:py-10">
      <Bone className="h-4 w-16 rounded-full" />
      <div className="mt-6 grid items-start gap-8 md:mt-8 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:gap-12 lg:gap-16">
        <Bone className="aspect-[4/5] w-full rounded-[1.75rem]" />
        <div className="space-y-6 md:pt-4">
          <div className="space-y-3">
            <Bone className="h-4 w-24 rounded-full" />
            <Bone className="h-9 w-3/4 rounded-full sm:h-11" />
            <Bone className="h-4 w-full max-w-md rounded-full" />
            <Bone className="h-4 w-2/3 max-w-xs rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 py-5 border-y border-border/40">
            <Bone className="h-12 rounded-2xl" />
            <Bone className="h-12 rounded-2xl" />
            <Bone className="h-12 rounded-2xl" />
            <Bone className="h-12 rounded-2xl" />
          </div>
          <div className="flex gap-3">
            <Bone className="h-11 flex-1 rounded-full" />
            <Bone className="h-11 w-11 shrink-0 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="relative isolate min-h-[85vh] overflow-hidden">
      {/* Hero section */}
      <section className="container flex min-h-[62vh] flex-col items-center justify-center pt-16 pb-10 text-center md:pt-24 md:pb-16">
        <Bone className="h-7 w-44 rounded-full" />

        <div className="mt-6 space-y-3 w-full flex flex-col items-center">
          <Bone className="h-10 w-4/5 max-w-lg rounded-full sm:h-14" />
          <Bone className="h-9 w-3/5 max-w-sm rounded-full sm:h-12" />
        </div>

        <Bone className="mt-5 h-4 w-2/3 max-w-md rounded-full" />

        <div className="mt-8 w-full max-w-xl">
          <Bone className="h-12 w-full rounded-full sm:h-13" />
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Bone className="h-10 w-32 rounded-full sm:w-36" />
          <Bone className="h-10 w-32 rounded-full sm:w-36" />
        </div>
      </section>

      {/* Recent items grid */}
      <section className="container py-10 md:py-16">
        <div className="flex items-center justify-between pb-6">
          <Bone className="h-7 w-36 rounded-full" />
          <Bone className="h-4 w-20 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <PosterSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function ItemsPageSkeleton() {
  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <Bone className="h-8 w-36 rounded-full sm:h-10" />
          <Bone className="mt-2 h-4 w-52 rounded-full" />
        </div>
        <Bone className="h-9 w-24 rounded-full shrink-0" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <Bone className="h-10 flex-1 min-w-[200px] max-w-sm rounded-full" />
        <Bone className="h-9 w-20 rounded-full" />
        <Bone className="h-9 w-24 rounded-full" />
        <Bone className="h-9 w-24 rounded-full" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <PosterSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="container py-8 md:py-14">
      <div>
        <Bone className="h-3 w-16 rounded-full" />
        <Bone className="mt-2 h-9 w-44 rounded-full sm:h-10" />
      </div>

      <div className="mt-8">
        <Bone className="h-11 w-full max-w-md rounded-full" />
      </div>

      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <DashRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function PostPageSkeleton() {
  return (
    <div className="container max-w-2xl py-8 md:py-14">
      <div>
        <Bone className="h-8 w-44 rounded-full sm:h-10" />
        <Bone className="mt-2 h-4 w-64 rounded-full" />
      </div>

      <div className="mt-8 flex justify-center">
        <Bone className="h-11 w-64 rounded-full" />
      </div>

      <div className="mt-8 space-y-5">
        <Bone className="h-36 w-full rounded-2xl sm:h-40" />
        <div className="space-y-2">
          <Bone className="h-3 w-16 rounded-full" />
          <Bone className="h-11 w-full rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Bone className="h-3 w-20 rounded-full" />
            <Bone className="h-11 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Bone className="h-3 w-20 rounded-full" />
            <Bone className="h-11 w-full rounded-xl" />
          </div>
        </div>
        <div className="space-y-2">
          <Bone className="h-3 w-24 rounded-full" />
          <Bone className="h-24 w-full rounded-xl" />
        </div>
        <Bone className="mt-6 h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

export function DocPageSkeleton() {
  return (
    <div className="container max-w-2xl py-16 md:py-24">
      <Bone className="h-3 w-16 rounded-full" />
      <Bone className="mt-3 h-9 w-60 rounded-full sm:h-12" />
      <Bone className="mt-4 h-4 w-full max-w-lg rounded-full" />
      <div className="mt-10 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function RouteSkeleton() {
  const { pathname } = useLocation();

  if (pathname === "/") {
    return <HomeSkeleton />;
  }
  if (pathname === "/items") {
    return <ItemsPageSkeleton />;
  }
  if (pathname.startsWith("/items/")) {
    return <DetailSkeleton />;
  }
  if (pathname === "/dashboard") {
    return <DashboardSkeleton />;
  }
  if (pathname === "/post") {
    return <PostPageSkeleton />;
  }
  if (pathname === "/faq" || pathname === "/privacy" || pathname === "/terms") {
    return <DocPageSkeleton />;
  }

  return <HomeSkeleton />;
}

import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return <div className={cn("quiet-skeleton", className)} />;
}

export function PosterSkeleton() {
  return <Bone className="aspect-[4/5] rounded-[1.75rem] md:aspect-[3/4]" />;
}

export function ListRowSkeleton() {
  return (
    <div className="tile flex overflow-hidden">
      <Bone className="w-[6.75rem] shrink-0 self-stretch rounded-none sm:w-[8.5rem]" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-4 py-3.5">
        <Bone className="h-3 w-24 rounded-full" />
        <Bone className="h-5 w-36 rounded-full" />
        <Bone className="h-3 w-28 rounded-full" />
      </div>
    </div>
  );
}

export function DashRowSkeleton() {
  return (
    <div className="tile flex items-center gap-3 px-3 py-3 sm:px-4">
      <Bone className="h-[4.25rem] w-[4.25rem] shrink-0 rounded-xl sm:h-20 sm:w-20" />
      <div className="min-w-0 flex-1 space-y-2">
        <Bone className="h-4 w-2/5 rounded-full" />
        <Bone className="h-3 w-1/4 rounded-full" />
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="container py-6 md:py-10">
      <Bone className="h-3 w-16 rounded-full" />
      <div className="mt-6 grid items-start gap-8 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:gap-12">
        <Bone className="aspect-[4/5] rounded-[1.75rem]" />
        <div className="space-y-3 md:pt-8">
          <Bone className="h-3 w-28 rounded-full" />
          <Bone className="h-8 w-48 rounded-full" />
          <Bone className="mt-2 h-3 w-full max-w-sm rounded-full" />
          <Bone className="h-3 w-2/3 max-w-xs rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function RouteSkeleton() {
  return (
    <div className="container py-10">
      <Bone className="h-3 w-20 rounded-full" />
      <Bone className="mt-3 h-7 w-40 rounded-full" />
    </div>
  );
}

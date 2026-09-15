import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { ItemStatus } from "../types";
import { itemSituation } from "../utils/item-custody";

export interface ItemCardProps {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string | null;
  held_where?: string | null;
  held_at?: string | null;
  status: ItemStatus;
  date_occurred: string | null;
  image_url?: string | null;
  created_at: string;
  user_id?: string;
  poster_name?: string;
  layout?: "poster" | "list";
}

const STATUS_TONE: Record<ItemStatus, string> = {
  lost: "text-rose-300",
  found: "text-emerald-300",
  claimed: "text-amber-300",
  returned: "text-sky-300",
};

const STATUS_TONE_LIST: Record<ItemStatus, string> = {
  lost: "text-red-600 dark:text-red-500",
  found: "text-emerald-600 dark:text-emerald-400",
  claimed: "text-amber-700 dark:text-amber-400",
  returned: "text-sky-700 dark:text-sky-400",
};

export function ItemCard({
  id,
  title,
  description,
  category,
  location,
  held_where,
  held_at,
  status,
  date_occurred,
  image_url,
  created_at,
  user_id,
  poster_name,
  layout = "poster",
}: ItemCardProps) {
  const { user } = useAuth();
  const dateLabel = format(new Date(date_occurred || created_at), "d MMM");
  const who = poster_name ? (user?.id === user_id ? "You" : poster_name) : null;
  const situation = itemSituation({
    status,
    location,
    held_where,
    held_at,
    isOwner: Boolean(user && user_id && user.id === user_id),
    holderName: poster_name,
  });

  if (layout === "list") {
    return (
      <Link to={`/items/${id}`} className="group block">
        <article className="tile tile-hover flex overflow-hidden">
          <div className="relative w-[6.75rem] shrink-0 self-stretch bg-muted sm:w-[8.5rem] md:w-[9.5rem]">
            {image_url ? (
              <img src={image_url} alt={title} className="absolute inset-0 h-full w-full object-cover object-center" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-600 to-neutral-900" />
            )}
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4">
            <div className="min-w-0 flex-1">
              <p className={cn("text-[12px] font-medium tracking-wide", STATUS_TONE_LIST[status])}>
                {situation}
              </p>
              <h3 className="mt-1 truncate font-display text-[1.2rem] font-semibold leading-tight tracking-tight sm:text-[1.3rem]">
                {title}
              </h3>
              {description && (
                <p className="mt-1 line-clamp-1 text-[13px] leading-snug text-muted-foreground">{description}</p>
              )}
              <p className="mt-2 text-[12px] text-muted-foreground">
                {[who, dateLabel].filter(Boolean).join(" · ")}
              </p>
            </div>
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground"
            >
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link to={`/items/${id}`} className="group block">
      <article className="relative isolate aspect-[4/5] w-full overflow-hidden rounded-[1.75rem] ring-1 ring-black/[0.06] transition-shadow duration-500 ease-apple dark:ring-white/[0.08] group-hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.55)] md:aspect-[3/4]">
        {image_url ? (
          <img
            src={image_url}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-apple group-hover:scale-[1.05]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-700 to-neutral-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10" />

        <span className="absolute left-3.5 top-3.5 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-medium capitalize tracking-wide text-white/90 backdrop-blur-md transition-colors duration-300 group-hover:bg-black/50">
          {category}
        </span>

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <p className={cn("text-[12px] font-medium tracking-wide", STATUS_TONE[status])}>{situation}</p>

          <div className="mt-1.5 flex items-end justify-between gap-3">
            <h3 className="min-w-0 flex-1 line-clamp-2 font-display text-[1.3rem] font-semibold leading-[1.15] tracking-tight text-white sm:text-[1.45rem]">
              {title}
            </h3>
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black shadow-sm"
            >
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>

          {description && (
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-white/70">{description}</p>
          )}
          <p className="mt-3 text-[12px] text-white/50">
            {[who, dateLabel].filter(Boolean).join(" · ")}
          </p>
        </div>
      </article>
    </Link>
  );
}

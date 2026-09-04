import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { STATUS_COLORS } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { ItemStatus } from "../types";

export interface ItemCardProps {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string | null;
  status: ItemStatus;
  date_occurred: string | null;
  image_url?: string | null;
  created_at: string;
  user_id?: string;
  poster_name?: string;
}

const STATUS_DOT: Record<ItemStatus, string> = {
  lost: "bg-rose-500",
  found: "bg-emerald-400",
  claimed: "bg-amber-400",
  returned: "bg-sky-400",
};

export function ItemCard({
  id,
  title,
  description,
  category,
  location,
  status,
  date_occurred,
  image_url,
  created_at,
  user_id,
  poster_name,
}: ItemCardProps) {
  const { user } = useAuth();
  const statusStyle = STATUS_COLORS[status];

  return (
    <Link to={`/items/${id}`} className="group block">
      <Card className="tile tile-hover overflow-hidden">
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
          {image_url ? (
            <img
              src={image_url}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-700 ease-apple group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-secondary">
              <span className="font-display text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {category}
              </span>
            </div>
          )}
          <div className="absolute left-3 top-3 z-10 pointer-events-none">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium shadow-sm backdrop-blur-md border tracking-wide",
                image_url
                  ? "bg-black/50 text-white border-white/15"
                  : "bg-background/90 text-foreground border-border/80"
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_DOT[status] || "bg-primary")} />
              <span>{statusStyle?.label || status}</span>
            </span>
          </div>
        </div>
        <CardContent className="p-4">
          <h3 className="line-clamp-1 text-[15px] font-semibold leading-tight tracking-tight text-foreground">
            {title}
          </h3>
          {poster_name && (
            <p className="mt-1 text-[12px] text-muted-foreground">
              Posted by {user?.id === user_id ? "you" : poster_name}
            </p>
          )}
          {description && (
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {date_occurred ? format(new Date(date_occurred), "MMM d, yyyy") : format(new Date(created_at), "MMM d, yyyy")}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { STATUS_COLORS } from "@/lib/constants";
import { useAuth } from "@/lib/auth";

interface ItemCardProps {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string | null;
  status: "lost" | "found" | "claimed" | "returned";
  date_occurred: string | null;
  image_url?: string | null;
  created_at: string;
  user_id?: string;
  poster_name?: string;
}

export function ItemCard({ id, title, description, category, location, status, date_occurred, image_url, created_at, user_id, poster_name }: ItemCardProps) {
  const { user } = useAuth();
  const statusStyle = STATUS_COLORS[status];

  return (
    <Link to={`/items/${id}`} className="group block">
      <Card className="overflow-hidden rounded-2xl border-0 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {image_url ? (
            <img src={image_url} alt={title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <span className="text-4xl">📦</span>
            </div>
          )}
          <div className="absolute left-3 top-3">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.label}
            </span>
          </div>
        </div>
        <CardContent className="p-4">
          <h3 className="text-[15px] font-semibold leading-tight text-foreground line-clamp-1">
            {title}
          </h3>
          {poster_name && (
            <p className="mt-1 text-[12px] font-medium text-primary">
              Posted by {user?.id === user_id ? "You" : poster_name}
            </p>
          )}
          {description && (
            <p className="mt-1.5 text-[13px] text-muted-foreground line-clamp-2 leading-relaxed">{description}</p>
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
          <div className="mt-2.5">
            <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground capitalize">
              {category}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { CATEGORIES, LOCATIONS, STATUS_STYLES, CATEGORY_STYLES } from "@/constants";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface SearchFiltersProps {
  keyword: string;
  onKeywordChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  location: string;
  onLocationChange: (v: string) => void;
  compact?: boolean;
}

export function SearchFilters({
  keyword,
  onKeywordChange,
  status,
  onStatusChange,
  category,
  onCategoryChange,
  location,
  onLocationChange,
  compact = false,
}: SearchFiltersProps) {
  const [showFilters, setShowFilters] = useState(!compact);

  const statusStyle = status !== "all" ? STATUS_STYLES[status] : null;
  const categoryStyle = category !== "all" ? CATEGORY_STYLES[category] : null;
  const locationActive = location !== "all";

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 sm:left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60 transition-colors" />
          <Input
            placeholder="Search titles, colors, brands, locations, or notes..."
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            className="h-10 sm:h-11 pl-10 sm:pl-11 pr-9 sm:pr-10 text-[12.5px] sm:text-[13.5px] placeholder:text-[12px] sm:placeholder:text-[13px] tracking-tight placeholder:text-muted-foreground/65 outline-none focus:outline-none focus:ring-0"
          />
          {keyword && (
            <button
              type="button"
              onClick={() => onKeywordChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-muted-foreground/15 text-muted-foreground hover:bg-muted-foreground/25 hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" strokeWidth={2.5} />
            </button>
          )}
        </div>
        {compact && (
          <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 sm:flex sm:flex-wrap sm:items-center animate-fade-in">
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger
              className={cn(
                "h-10 sm:h-11 w-full sm:w-[140px] px-2.5 sm:px-4 text-[12px] sm:text-[14px] transition-colors",
                statusStyle
                  ? cn(statusStyle.border, statusStyle.bg, statusStyle.text, "font-semibold shadow-sm")
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <SelectValue placeholder="Status">
                {status === "all" ? (
                  <>
                    <span className="sm:hidden">Status</span>
                    <span className="hidden sm:inline">All status</span>
                  </>
                ) : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="found">Found</SelectItem>
              <SelectItem value="claimed">Claimed</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
            </SelectContent>
          </Select>

          <Select value={category} onValueChange={onCategoryChange}>
            <SelectTrigger
              className={cn(
                "h-10 sm:h-11 w-full sm:w-[160px] px-2.5 sm:px-4 text-[12px] sm:text-[14px] transition-colors",
                categoryStyle
                  ? cn(categoryStyle.border, categoryStyle.bg, categoryStyle.text, "font-semibold shadow-sm")
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <SelectValue placeholder="Category">
                {category === "all" ? (
                  <>
                    <span className="sm:hidden">Categories</span>
                    <span className="hidden sm:inline">All categories</span>
                  </>
                ) : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={location} onValueChange={onLocationChange}>
            <SelectTrigger
              className={cn(
                "h-10 sm:h-11 w-full sm:w-[170px] px-2.5 sm:px-4 text-[12px] sm:text-[14px] transition-colors",
                locationActive
                  ? "border-foreground/30 bg-secondary/80 text-foreground dark:border-white/20 dark:bg-white/[0.08] dark:text-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <SelectValue placeholder="Location">
                {location === "all" ? (
                  <>
                    <span className="sm:hidden">Locations</span>
                    <span className="hidden sm:inline">All locations</span>
                  </>
                ) : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {LOCATIONS.map((loc) => (
                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

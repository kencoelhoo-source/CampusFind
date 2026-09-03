import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ItemCard } from "@/features/items/components/ItemCard";
import { SearchFilters } from "@/features/items/components/SearchFilters";
import { LayoutGrid, List, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchBrowseItems } from "@/features/items/services/itemsApi";
import { filtersFromSearchParams, filtersToSearchParams } from "@/features/items/utils/item-filters";
import { cn } from "@/lib/utils";

export default function Items() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamString = searchParams.toString();
  const initialFilters = filtersFromSearchParams(searchParams);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [keyword, setKeyword] = useState(initialFilters.keyword);
  const [status, setStatus] = useState(initialFilters.status);
  const [category, setCategory] = useState(initialFilters.category);
  const [location, setLocation] = useState(initialFilters.location);

  useEffect(() => {
    const nextFilters = filtersFromSearchParams(searchParams);
    setKeyword((current) => (current === nextFilters.keyword ? current : nextFilters.keyword));
    setStatus((current) => (current === nextFilters.status ? current : nextFilters.status));
    setCategory((current) => (current === nextFilters.category ? current : nextFilters.category));
    setLocation((current) => (current === nextFilters.location ? current : nextFilters.location));
  }, [searchParamString, searchParams]);

  useEffect(() => {
    const nextParams = filtersToSearchParams({ keyword, status, category, location });
    const nextParamString = nextParams.toString();

    if (nextParamString !== searchParamString) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [keyword, status, category, location, searchParamString, setSearchParams]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["browse-items", { keyword, status, category, location }],
    queryFn: () => fetchBrowseItems({ keyword, status, category, location }),
    placeholderData: [],
  });

  return (
    <div className="container py-12 md:py-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Board</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Browse items</h1>
        </div>
        <div className="flex rounded-full bg-muted p-1">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className={cn(viewMode === "grid" && "bg-card shadow-card")}
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className={cn(viewMode === "list" && "bg-card shadow-card")}
            onClick={() => setViewMode("list")}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-8">
        <SearchFilters
          keyword={keyword} onKeywordChange={setKeyword}
          status={status} onStatusChange={setStatus}
          category={category} onCategoryChange={setCategory}
          location={location} onLocationChange={setLocation}
        />
      </div>

      {/* Active Search & Filter Tags Bar */}
      {(keyword.trim() || status !== "all" || category !== "all" || location !== "all") && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card/40 p-4 text-[13px] sm:text-[14px]">
          <div className="flex flex-wrap items-center gap-2">
            {keyword.trim() && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-medium text-foreground">
                Query: <span className="font-semibold text-primary">"{keyword.trim()}"</span>
                <button
                  type="button"
                  onClick={() => setKeyword("")}
                  className="rounded-full p-0.5 hover:bg-primary/20 hover:text-primary"
                  aria-label="Remove keyword"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {status !== "all" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/70 px-3 py-1 text-muted-foreground">
                Status: <span className="font-medium capitalize text-foreground">{status}</span>
                <button
                  type="button"
                  onClick={() => setStatus("all")}
                  className="rounded-full p-0.5 hover:text-foreground"
                  aria-label="Remove status filter"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {category !== "all" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/70 px-3 py-1 text-muted-foreground">
                Category: <span className="font-medium capitalize text-foreground">{category}</span>
                <button
                  type="button"
                  onClick={() => setCategory("all")}
                  className="rounded-full p-0.5 hover:text-foreground"
                  aria-label="Remove category filter"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {location !== "all" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/70 px-3 py-1 text-muted-foreground">
                Location: <span className="font-medium text-foreground">{location}</span>
                <button
                  type="button"
                  onClick={() => setLocation("all")}
                  className="rounded-full p-0.5 hover:text-foreground"
                  aria-label="Remove location filter"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            <span className="pl-1 text-xs font-medium text-muted-foreground">
              ({items.length} {items.length === 1 ? "result" : "results"})
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setKeyword("");
              setStatus("all");
              setCategory("all");
              setLocation("all");
            }}
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Reset all
          </button>
        </div>
      )}

      {isLoading ? (
        <div className={`mt-8 grid gap-5 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col overflow-hidden rounded-3xl border border-border/40 bg-card p-3 shadow-card">
              <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-muted/60" />
              <div className="space-y-2.5 p-3">
                <div className="h-4 w-3/4 animate-pulse rounded-md bg-muted/80" />
                <div className="h-3 w-1/2 animate-pulse rounded-md bg-muted/50" />
                <div className="mt-3 flex gap-2 pt-1">
                  <div className="h-5 w-14 animate-pulse rounded-full bg-muted/60" />
                  <div className="h-5 w-20 animate-pulse rounded-full bg-muted/40" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-16 rounded-3xl border border-dashed border-border/60 bg-card/20 p-12 text-center backdrop-blur-sm sm:p-16">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            <Search className="h-6 w-6 opacity-60" />
          </div>
          <p className="mt-4 font-display text-2xl font-semibold tracking-tight text-foreground">
            Nothing matches your search.
          </p>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            {keyword.trim()
              ? `We couldn't find any items matching "${keyword.trim()}". Try searching broader terms, colors, or checking your spelling.`
              : "No items match the currently selected filters."}
          </p>
          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              onClick={() => {
                setKeyword("");
                setStatus("all");
                setCategory("all");
                setLocation("all");
              }}
            >
              Reset all filters
            </Button>
          </div>
        </div>
      ) : (
        <div className={`mt-8 grid gap-5 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1 md:grid-cols-2"}`}>
          {items.map((item, i) => (
            <div key={item.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
              <ItemCard {...item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

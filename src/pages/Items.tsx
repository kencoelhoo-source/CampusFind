import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ItemCard } from "@/features/items/components/ItemCard";
import { ListRowSkeleton, PosterSkeleton } from "@/components/common/Skeletons";
import { SearchFilters } from "@/features/items/components/SearchFilters";
import { LayoutGrid, List, Search, X } from "lucide-react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { fetchBrowseItems } from "@/features/items/services/itemsApi";
import { filtersFromSearchParams, filtersToSearchParams } from "@/features/items/utils/item-filters";
import { STATUS_STYLES, CATEGORY_STYLES } from "@/constants";
import { cn } from "@/lib/utils";

export default function Items() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamString = searchParams.toString();
  const initialFilters = filtersFromSearchParams(searchParams);
  const [viewMode, setViewMode] = useState<"grid" | "list">(
    () => (searchParams.get("view") === "list" ? "list" : "grid"),
  );

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
    if (viewMode === "list") nextParams.set("view", "list");
    const nextParamString = nextParams.toString();

    if (nextParamString !== searchParamString) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [keyword, status, category, location, viewMode, searchParamString, setSearchParams]);

  const { data: items = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["browse-items", { keyword, status, category, location }],
    queryFn: () => fetchBrowseItems({ keyword, status, category, location }),
    placeholderData: (previous) => previous,
  });

  const hasActiveFilters = Boolean(
    keyword.trim() || status !== "all" || category !== "all" || location !== "all"
  );

  return (
    <div className="container py-12 md:py-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Board</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Browse items</h1>
        </div>
        <SegmentedControl<"grid" | "list">
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: "grid", label: "Grid view", icon: <LayoutGrid className="h-4 w-4" /> },
            { value: "list", label: "List view", icon: <List className="h-4 w-4" /> },
          ]}
        />
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
      {hasActiveFilters && (
        <div className="mt-3.5 inline-flex w-fit max-w-full flex-wrap items-center gap-2 sm:gap-2.5 rounded-2xl border border-border/50 bg-card/50 p-2 sm:px-3.5 sm:py-2 text-[12.5px] sm:text-[13px] animate-fade-in">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {keyword.trim() && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 font-medium text-foreground">
                <span className="text-muted-foreground">Search:</span>
                <span className="font-semibold text-primary">"{keyword.trim()}"</span>
                <button
                  type="button"
                  onClick={() => setKeyword("")}
                  className="rounded-full p-0.5 hover:bg-primary/20 hover:text-primary transition-colors"
                  aria-label="Remove keyword"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {status !== "all" && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors",
                  STATUS_STYLES[status]
                    ? cn(STATUS_STYLES[status].border, STATUS_STYLES[status].bg, STATUS_STYLES[status].text)
                    : "border-border/70 bg-secondary/80 text-foreground",
                )}
              >
                <span className="opacity-75">Status:</span>
                <span className="font-semibold capitalize">{status}</span>
                <button
                  type="button"
                  onClick={() => setStatus("all")}
                  className="rounded-full p-0.5 opacity-70 hover:opacity-100 transition-opacity"
                  aria-label="Remove status filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {category !== "all" && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors",
                  CATEGORY_STYLES[category]
                    ? cn(CATEGORY_STYLES[category].border, CATEGORY_STYLES[category].bg, CATEGORY_STYLES[category].text)
                    : "border-border/70 bg-secondary/80 text-foreground",
                )}
              >
                <span className="opacity-75">Category:</span>
                <span className="font-semibold capitalize">{category}</span>
                <button
                  type="button"
                  onClick={() => setCategory("all")}
                  className="rounded-full p-0.5 opacity-70 hover:opacity-100 transition-opacity"
                  aria-label="Remove category filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {location !== "all" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-secondary/80 px-2.5 py-1 text-[12px] font-medium text-foreground dark:border-border/60 dark:bg-secondary/50 transition-colors">
                <span className="opacity-75">Location:</span>
                <span className="font-semibold">{location}</span>
                <button
                  type="button"
                  onClick={() => setLocation("all")}
                  className="rounded-full p-0.5 opacity-70 hover:opacity-100 transition-opacity"
                  aria-label="Remove location filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <span className="text-[12px] text-muted-foreground font-medium pl-0.5">
              ({items.length} {items.length === 1 ? "result" : "results"})
            </span>
          </div>

          <span className="hidden sm:block h-3.5 w-px bg-border/80 mx-0.5" />

          <button
            type="button"
            onClick={() => {
              setKeyword("");
              setStatus("all");
              setCategory("all");
              setLocation("all");
            }}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded-lg hover:bg-secondary/80 active:scale-95"
          >
            <X className="h-3.5 w-3.5" />
            <span>Reset all</span>
          </button>
        </div>
      )}

      {isError ? (
        <div className="mt-16 rounded-3xl border border-dashed border-border/60 bg-card/20 p-12 text-center">
          <p className="font-display text-2xl font-semibold tracking-tight">Couldn’t load the board</p>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-muted-foreground">
            {error instanceof Error ? error.message : "Please try again."}
          </p>
          <button
            type="button"
            className="mt-6 text-[14px] font-medium underline underline-offset-4"
            onClick={() => void refetch()}
          >
            Try again
          </button>
        </div>
      ) : isLoading ? (
        <div className={`mt-8 grid gap-4 sm:gap-5 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1 xl:grid-cols-2"}`}>
          {Array.from({ length: 4 }).map((_, i) =>
            viewMode === "grid" ? <PosterSkeleton key={i} /> : <ListRowSkeleton key={i} />,
          )}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-16 rounded-3xl border border-dashed border-border/60 bg-card/20 p-12 text-center backdrop-blur-sm sm:p-16">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <Search className="h-10 w-10 sm:h-11 sm:w-11 text-sky-500 dark:text-sky-400 drop-shadow-[0_2px_10px_rgba(14,165,233,0.25)]" strokeWidth={1.6} />
          </div>
          <p className="mt-4 font-display text-2xl font-semibold tracking-tight text-foreground">
            {hasActiveFilters ? "Nothing matches your search." : "No items listed yet."}
          </p>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            {hasActiveFilters
              ? keyword.trim()
                ? `We couldn't find any items matching "${keyword.trim()}". Try searching broader terms, colors, or checking your spelling.`
                : "No items match the currently selected filters."
              : "There are currently no lost or found items posted on the board."}
          </p>
        </div>
      ) : (
        <div className={`mt-8 grid gap-4 sm:gap-5 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1 xl:grid-cols-2"}`}>
          {items.map((item, i) => (
            <div key={`${item.id}-${viewMode}`} className="animate-fade-in" style={{ animationDelay: `${Math.min(i, 8) * 0.03}s` }}>
              <ItemCard {...item} layout={viewMode === "list" ? "list" : "poster"} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

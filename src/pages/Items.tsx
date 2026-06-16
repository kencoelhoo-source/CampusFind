import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ItemCard } from "@/components/ItemCard";
import { SearchFilters } from "@/components/SearchFilters";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchBrowseItems } from "@/lib/item-data";
import { filtersFromSearchParams, filtersToSearchParams } from "@/lib/item-filters";

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
    <div className="container py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Browse Items</h1>
        <div className="flex gap-1">
          <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" onClick={() => setViewMode("grid")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" onClick={() => setViewMode("list")}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <SearchFilters
          keyword={keyword} onKeywordChange={setKeyword}
          status={status} onStatusChange={setStatus}
          category={category} onCategoryChange={setCategory}
          location={location} onLocationChange={setLocation}
        />
      </div>

      {isLoading ? (
        <div className={`mt-6 grid gap-4 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-4xl">🔍</p>
          <p className="mt-4 text-lg text-muted-foreground">No items found matching your filters.</p>
        </div>
      ) : (
        <div className={`mt-6 grid gap-4 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}>
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

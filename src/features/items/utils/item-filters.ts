export interface BrowseFiltersState {
  keyword: string;
  status: string;
  category: string;
  location: string;
}

export const defaultBrowseFilters: BrowseFiltersState = {
  keyword: "",
  status: "all",
  category: "all",
  location: "all",
};

export function filtersFromSearchParams(searchParams: URLSearchParams): BrowseFiltersState {
  return {
    keyword: searchParams.get("q")?.trim() || defaultBrowseFilters.keyword,
    status: searchParams.get("status") || defaultBrowseFilters.status,
    category: searchParams.get("category") || defaultBrowseFilters.category,
    location: searchParams.get("location") || defaultBrowseFilters.location,
  };
}

export function filtersToSearchParams(filters: BrowseFiltersState) {
  const searchParams = new URLSearchParams();

  if (filters.keyword.trim()) {
    searchParams.set("q", filters.keyword.trim());
  }

  if (filters.status !== defaultBrowseFilters.status) {
    searchParams.set("status", filters.status);
  }

  if (filters.category !== defaultBrowseFilters.category) {
    searchParams.set("category", filters.category);
  }

  if (filters.location !== defaultBrowseFilters.location) {
    searchParams.set("location", filters.location);
  }

  return searchParams;
}

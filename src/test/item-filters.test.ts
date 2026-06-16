import { describe, expect, it } from "vitest";
import { defaultBrowseFilters, filtersFromSearchParams, filtersToSearchParams } from "@/lib/item-filters";

describe("item filters", () => {
  it("reads defaults from an empty query string", () => {
    const filters = filtersFromSearchParams(new URLSearchParams());

    expect(filters).toEqual(defaultBrowseFilters);
  });

  it("trims keywords and preserves explicit filters", () => {
    const filters = filtersFromSearchParams(
      new URLSearchParams("q=%20airpods%20&status=found&category=electronics&location=Main+Library"),
    );

    expect(filters).toEqual({
      keyword: "airpods",
      status: "found",
      category: "electronics",
      location: "Main Library",
    });
  });

  it("omits default values when serializing filters", () => {
    const params = filtersToSearchParams({
      keyword: "wallet",
      status: "all",
      category: "all",
      location: "all",
    });

    expect(params.toString()).toBe("q=wallet");
  });

  it("serializes all active filters", () => {
    const params = filtersToSearchParams({
      keyword: "id card",
      status: "lost",
      category: "documents",
      location: "Admin Building",
    });

    expect(params.toString()).toBe("q=id+card&status=lost&category=documents&location=Admin+Building");
  });
});

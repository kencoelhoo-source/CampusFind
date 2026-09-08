import { describe, expect, it } from "vitest";
import { rankItemsByQuery, scoreItemMatch } from "@/features/items/utils/search-engine";

describe("Campus Search Engine", () => {
  const sampleItems = [
    {
      id: "1",
      title: "Blue Water Bottle",
      description: "Milton steel flask left on 3rd floor near canteen table",
      location: "Canteen",
      category: "other",
      created_at: "2026-09-01T10:00:00Z",
    },
    {
      id: "2",
      title: "Lost Wallet",
      description: "Black leather wallet with student ID card and bus pass inside",
      location: "Library",
      category: "wallet",
      created_at: "2026-09-02T11:00:00Z",
    },
    {
      id: "3",
      title: "Casio fx-991EX Calculator",
      description: "Black scientific calculator with sticker on the back",
      location: "Lab Block",
      category: "electronics",
      created_at: "2026-09-03T12:00:00Z",
    },
    {
      id: "4",
      title: "Bunch of Keys",
      description: "Two Godrej keys with a blue Honda keychain",
      location: "Parking Lot",
      category: "keys",
      created_at: "2026-09-03T14:00:00Z",
    },
  ];

  it("finds items when search terms span across title, description, and location", () => {
    // "black wallet library" spans Title ('Wallet'), Description ('Black'), Location ('Library')
    const results = rankItemsByQuery(sampleItems, "black wallet library");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("2");
  });

  it("handles simple plurals and stems (keys vs key, bottles vs bottle)", () => {
    const results = rankItemsByQuery(sampleItems, "key");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("4");
  });

  it("expands campus synonyms (calc/casio -> calculator, flask -> bottle)", () => {
    const results = rankItemsByQuery(sampleItems, "calc");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("3");
  });

  it("tolerates minor typos (e.g. 'calcultor', 'canten')", () => {
    const results = rankItemsByQuery(sampleItems, "calcultor");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("3");
  });

  it("ranks the most detailed and complete match highest", () => {
    const results = rankItemsByQuery(sampleItems, "milton canteen");
    expect(results[0].id).toBe("1");
  });

  it("accurately finds item by exact title 'Book', color 'Yellow', and poster 'Ken Coelho'", () => {
    const items = [
      ...sampleItems,
      {
        id: "5",
        title: "Book",
        description: "Yellow",
        location: "Canteen",
        category: "books",
        poster_name: "Ken Coelho",
        created_at: "2026-09-04T10:00:00Z",
      },
    ];

    // Search for exact title "Book"
    const bookResults = rankItemsByQuery(items, "Book");
    expect(bookResults.length).toBeGreaterThan(0);
    expect(bookResults[0].id).toBe("5");

    // Search for exact color "Yellow"
    const yellowResults = rankItemsByQuery(items, "Yellow");
    expect(yellowResults.length).toBeGreaterThan(0);
    expect(yellowResults[0].id).toBe("5");

    // Search for poster "Ken Coelho"
    const posterResults = rankItemsByQuery(items, "Ken Coelho");
    expect(posterResults.length).toBeGreaterThan(0);
    expect(posterResults[0].id).toBe("5");

    // Search for combined query "Yellow Book Canteen"
    const combinedResults = rankItemsByQuery(items, "Yellow Book Canteen");
    expect(combinedResults.length).toBeGreaterThan(0);
    expect(combinedResults[0].id).toBe("5");
  });
});

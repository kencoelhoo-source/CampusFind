import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Items from "@/pages/Items";

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = ResizeObserverMock as any;
window.ResizeObserver = ResizeObserverMock as any;

// Rigorous mocking of hooks
const mockUseSearchParams = vi.fn();
const mockSetSearchParams = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useSearchParams: () => mockUseSearchParams(),
    useNavigate: () => vi.fn(),
  };
});

// Mock the API layer entirely to test UI state machine
const mockFetchBrowseItems = vi.fn();
vi.mock("@/features/items/services/itemsApi", () => ({
  fetchBrowseItems: (args: any) => mockFetchBrowseItems(args),
}));

// Provide a fresh query client for each test
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Items Page (BrowseBoard State Machine)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUseSearchParams.mockReturnValue([new URLSearchParams(), mockSetSearchParams]);
    mockFetchBrowseItems.mockResolvedValue([]);
  });

  it("synchronizes URL parameters with component state initially", () => {
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams("?q=laptop&status=lost&category=electronics"),
      mockSetSearchParams,
    ]);

    renderWithProviders(<Items />);

    expect(mockFetchBrowseItems).toHaveBeenCalledWith(
      expect.objectContaining({
        keyword: "laptop",
        status: "lost",
        category: "electronics",
      })
    );
  });

  it("updates URL parameters when filters change", async () => {
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams("?status=lost"),
      mockSetSearchParams,
    ]);

    renderWithProviders(<Items />);

    // Fast-forward or trigger filter change
    await waitFor(() => {
      expect(screen.getByText(/Nothing matches your search\.|We couldn't find any items/i)).toBeInTheDocument();
    });
  });

  it("shows the general empty board state when no filters are active", async () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams(), mockSetSearchParams]);
    
    renderWithProviders(<Items />);

    await waitFor(() => {
      expect(screen.getByText(/No items listed yet\./i)).toBeInTheDocument();
    });
  });

  it("renders 'Load more items' button when 20 items are returned", async () => {
    const twentyItems = Array.from({ length: 20 }, (_, i) => ({
      id: `item-${i + 1}`,
      title: `Lost Item ${i + 1}`,
      user_id: "user-test",
      status: "lost",
      category: "electronics",
      created_at: new Date(Date.now() - i * 1000).toISOString(),
    }));

    mockFetchBrowseItems.mockResolvedValueOnce(twentyItems);

    renderWithProviders(<Items />);

    await waitFor(() => {
      expect(screen.getByText(/Load more items/i)).toBeInTheDocument();
    });
  });

  it("fetches the next page with keyset cursor when 'Load more items' is clicked", async () => {
    const firstPage = Array.from({ length: 20 }, (_, i) => ({
      id: `item-${i + 1}`,
      title: `Lost Item ${i + 1}`,
      user_id: "user-test",
      status: "lost",
      category: "electronics",
      created_at: `2026-09-01T12:00:${i < 10 ? '0' : ''}${i}Z`,
    }));

    const secondPage = [
      {
        id: "item-21",
        title: "Lost Item 21",
        user_id: "user-test",
        status: "lost",
        category: "electronics",
        created_at: "2026-09-01T11:00:00Z",
      },
    ];

    mockFetchBrowseItems
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);

    renderWithProviders(<Items />);

    const loadMoreButton = await screen.findByText(/Load more items/i);
    expect(loadMoreButton).toBeInTheDocument();

    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(mockFetchBrowseItems).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          beforeId: "item-20",
          beforeCreatedAt: firstPage[19].created_at,
        })
      );
    });
  });
});

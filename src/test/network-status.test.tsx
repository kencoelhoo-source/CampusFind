import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { NetworkStatusNotifier } from "@/components/common/NetworkStatusNotifier";
import { toast } from "sonner";

vi.mock("sonner", () => {
  const toastMock = Object.assign(vi.fn(), {
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
    loading: vi.fn(),
    promise: vi.fn(),
    custom: vi.fn(),
    dismiss: vi.fn(),
  });
  return {
    toast: toastMock,
    Toaster: vi.fn(),
  };
});

describe("NetworkStatusNotifier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without mounting visible DOM elements", () => {
    const { container } = render(<NetworkStatusNotifier />);
    expect(container.firstChild).toBeNull();
  });

  it("fires a warning toast when the browser goes offline", () => {
    render(<NetworkStatusNotifier />);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(toast.warning).toHaveBeenCalledWith(
      "You are currently offline",
      expect.objectContaining({
        description: expect.stringContaining("Network connection lost"),
      }),
    );
  });

  it("fires a success toast when reconnection occurs after an offline period", () => {
    render(<NetworkStatusNotifier />);

    // Go offline first
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(toast.warning).toHaveBeenCalledTimes(1);

    // Reconnect
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(toast.success).toHaveBeenCalledWith(
      "Connection restored",
      expect.objectContaining({
        description: expect.stringContaining("back online"),
      }),
    );
  });

  it("does not fire an online toast if there was no prior offline event", () => {
    render(<NetworkStatusNotifier />);

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(toast.success).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

function SafeChild() {
  return <div>Application content loaded successfully</div>;
}

function BrokenChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Simulated unexpected rendering crash");
  }
  return <div>Component recovered</div>;
}

describe("ErrorBoundary Component", () => {
  it("renders children without issue when no errors occur", () => {
    render(
      <ErrorBoundary>
        <SafeChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Application content loaded successfully")).toBeInTheDocument();
  });

  it("catches render errors and displays the recovery card instead of crashing", () => {
    // Suppress console.error output during deliberate crash test
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BrokenChild shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(/CampusFind encountered an unexpected issue/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /home/i })).toBeInTheDocument();

    spy.mockRestore();
  });

  it("supports custom fallback components", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div>Custom failure view</div>}>
        <BrokenChild shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Custom failure view")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();

    spy.mockRestore();
  });
});

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error("ErrorBoundary caught an unhandled exception:", error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="container flex min-h-[70vh] flex-col items-center justify-center py-16 px-4 text-center">
          <div className="menu-surface max-w-md w-full rounded-3xl border border-border/70 p-8 shadow-card-hover animate-scale-in">
            <div className="mx-auto mb-4 flex items-center justify-center">
              <AlertCircle className="h-11 w-11 text-rose-500 dark:text-rose-400 drop-shadow-[0_2px_10px_rgba(244,63,94,0.25)]" strokeWidth={1.6} />
            </div>

            <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-foreground">
              Something went wrong
            </h1>
            <p className="mt-2.5 text-[14px] leading-relaxed text-muted-foreground">
              CampusFind encountered an unexpected issue while rendering this section. Your account and data remain completely safe.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mt-4 max-h-32 overflow-auto rounded-xl bg-muted/60 p-3 text-left font-mono text-[11px] text-muted-foreground">
                {this.state.error.message}
              </div>
            )}

            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <Button
                variant="default"
                size="sm"
                className="w-full sm:w-auto h-10 px-5"
                onClick={this.handleReset}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try again
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto h-10 px-5"
                onClick={this.handleGoHome}
              >
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

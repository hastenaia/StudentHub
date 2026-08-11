"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production, wire this up to your error-tracking service.
    console.error("ErrorBoundary caught an error:", error, info);
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-[300px] w-full flex-col items-center justify-center gap-3 rounded-lg border border-red-100 bg-red-50 p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-red-500" />
          <h2 className="text-lg font-semibold text-brand-dark">Something went wrong</h2>
          <p className="max-w-sm text-sm text-gray-500">
            This part of the page failed to load. You can try again, or refresh the page.
          </p>
          <Button variant="outline" onClick={this.reset}>
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

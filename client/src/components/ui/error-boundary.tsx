import React, {Component, ErrorInfo} from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return {hasError: true, error};
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md m-4">
          <h2 className="text-lg font-bold text-red-700 mb-2">
            Something went wrong
          </h2>
          <details className="text-sm">
            <summary className="cursor-pointer mb-2">
              Show error details
            </summary>
            <pre className="p-2 bg-red-100 rounded overflow-auto whitespace-pre-wrap">
              {this.state.error?.message || "Unknown error"}
              {this.state.error?.stack && (
                <div className="mt-2 text-xs">{this.state.error.stack}</div>
              )}
            </pre>
          </details>
          <button
            className="mt-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

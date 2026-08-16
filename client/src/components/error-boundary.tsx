import React, {Component, ErrorInfo, ReactNode} from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private prevErrorHandler:
    | ((
        event: Event | string,
        source?: string,
        lineno?: number,
        colno?: number,
        error?: Error
      ) => boolean | void)
    | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {hasError: false, error: null};
  }

  static getDerivedStateFromError(error: Error): State {
    return {hasError: true, error};
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error);
    console.error("Component stack:", errorInfo.componentStack);
  }

  componentDidMount() {
    // Store previous error handler
    this.prevErrorHandler = window.onerror;

    window.onerror = (event, source, lineno, colno, error) => {
      console.error("Global error caught:", event, error);
      this.setState({
        hasError: true,
        error:
          error ||
          new Error(typeof event === "string" ? event : "Unknown error")
      });

      // Call previous handler if exists
      if (this.prevErrorHandler) {
        return this.prevErrorHandler(event, source, lineno, colno, error);
      }
      return false;
    };
  }

  componentWillUnmount() {
    // Restore previous error handler
    window.onerror = this.prevErrorHandler;
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
          <h2 className="text-xl font-semibold mb-4">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

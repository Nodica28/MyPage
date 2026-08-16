import {ReactNode} from "react";
import {useAuth} from "@/hooks/use-auth";
import {Loader2} from "lucide-react";
import {Redirect, useLocation} from "wouter";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({children}: ProtectedRouteProps) {
  const {user, loading} = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-48px)] w-full">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading page...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Preserve the current location (including query params) for redirect after login
    const redirectUrl = encodeURIComponent(location + window.location.search);
    return <Redirect to={`/auth?redirect=${redirectUrl}`} />;
  }

  return <div className="w-full h-full">{children}</div>;
}

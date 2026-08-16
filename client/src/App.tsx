import {QueryClientProvider} from "@tanstack/react-query";
import {queryClient} from "./lib/queryClient";
import {Toaster} from "@/components/ui/toaster";
import {AuthProvider} from "@/hooks/use-auth";
import {ThemeProvider} from "@/components/ThemeProvider";
import {DynamicThemeProvider} from "@/components/DynamicThemeProvider";
import {Switch, Route} from "wouter";
import {ProtectedRoute} from "./lib/protected-route";
import {LayoutProvider, useLayout} from "./context/layout-context";
import React, {useEffect, Suspense} from "react";
import {Loader2} from "lucide-react";
import * as Sentry from "@sentry/react";

// Lazy load all page components for better code splitting
const AuthPage = React.lazy(() => import("@/pages/auth-page"));
const NotFound = React.lazy(() => import("@/pages/not-found"));
const Settings = React.lazy(() => import("@/pages/settings"));
const SuperAdmin = React.lazy(() => import("@/pages/super-admin"));
const AdminDashboard = React.lazy(() => import("@/pages/admin-dashboard"));
const HeadshotGenerator = React.lazy(
  () => import("@/pages/headshot-generator")
);
const AIHeadshots = React.lazy(() => import("@/pages/ai-headshots"));
const BrandAssetsPage = React.lazy(() => import("@/pages/brand-assets"));
const PublicBadgeProfile = React.lazy(
  () => import("@/pages/public-badge-profile")
);
const EmbedCard = React.lazy(() => import("@/pages/embed-card"));
const Register = React.lazy(() => import("@/pages/register"));
const JoinCompany = React.lazy(() => import("@/pages/join-company"));
const BadgeProfile = React.lazy(() => import("@/pages/badge-profile"));
const StartPage = React.lazy(() => import("@/pages/start"));
const ProfileSetup = React.lazy(() => import("@/pages/profile-setup"));
const LeadsPage = React.lazy(() => import("@/pages/leads"));
const LogoutPage = React.lazy(() => import("@/pages/logout"));
const SupportPage = React.lazy(() => import("@/pages/support"));

// Loading fallback component
function PageLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-48px)] w-full">
      <div className="flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading page...</p>
      </div>
    </div>
  );
}

// Lazy route wrapper with error boundary
function LazyRoute({children}: {children: React.ReactNode}) {
  return <Suspense fallback={<PageLoadingFallback />}>{children}</Suspense>;
}

function PublicRoute({children}: {children: React.ReactNode}) {
  const {setHideSidebar, setHideHeader} = useLayout();

  useEffect(() => {
    setHideSidebar(true);
    setHideHeader(true);
    return () => {
      setHideSidebar(false);
      setHideHeader(false);
    };
  }, [setHideSidebar, setHideHeader]);

  return <>{children}</>;
}

function Router() {
  return (
    <Sentry.Profiler name="router" updateProps={{}}>
      <Switch>
        {/* Auth and onboarding routes - no layout */}
        <Route path="/auth">
          <PublicRoute>
            <LazyRoute>
              <AuthPage />
            </LazyRoute>
          </PublicRoute>
        </Route>

        <Route path="/logout">
          <PublicRoute>
            <LazyRoute>
              <LogoutPage />
            </LazyRoute>
          </PublicRoute>
        </Route>

        <Route path="/register">
          <PublicRoute>
            <LazyRoute>
              <Register />
            </LazyRoute>
          </PublicRoute>
        </Route>

        <Route path="/start">
          <PublicRoute>
            <LazyRoute>
              <StartPage />
            </LazyRoute>
          </PublicRoute>
        </Route>

        <Route path="/profile/setup">
          <ProtectedRoute>
            <PublicRoute>
              <LazyRoute>
                <ProfileSetup />
              </LazyRoute>
            </PublicRoute>
          </ProtectedRoute>
        </Route>

        <Route path="/join-company">
          <ProtectedRoute>
            <LazyRoute>
              <JoinCompany />
            </LazyRoute>
          </ProtectedRoute>
        </Route>

        {/* Protected application routes */}
        <Route path="/settings">
          <ProtectedRoute>
            <LazyRoute>
              <Settings />
            </LazyRoute>
          </ProtectedRoute>
        </Route>

        <Route path="/super-admin">
          <ProtectedRoute>
            <LazyRoute>
              <SuperAdmin />
            </LazyRoute>
          </ProtectedRoute>
        </Route>

        <Route path="/admin">
          <ProtectedRoute>
            <LazyRoute>
              <AdminDashboard />
            </LazyRoute>
          </ProtectedRoute>
        </Route>

        <Route path="/headshots">
          <ProtectedRoute>
            <LazyRoute>
              <AIHeadshots />
            </LazyRoute>
          </ProtectedRoute>
        </Route>

        <Route path="/headshot-generator">
          <ProtectedRoute>
            <LazyRoute>
              <HeadshotGenerator />
            </LazyRoute>
          </ProtectedRoute>
        </Route>

        <Route path="/badge-profile">
          <ProtectedRoute>
            <LazyRoute>
              <BadgeProfile />
            </LazyRoute>
          </ProtectedRoute>
        </Route>

        <Route path="/brand-assets">
          <ProtectedRoute>
            <LazyRoute>
              <BrandAssetsPage />
            </LazyRoute>
          </ProtectedRoute>
        </Route>

        <Route path="/leads">
          <ProtectedRoute>
            <LazyRoute>
              <LeadsPage />
            </LazyRoute>
          </ProtectedRoute>
        </Route>

        <Route path="/support">
          <LazyRoute>
            <SupportPage />
          </LazyRoute>
        </Route>

        {/* Embeddable contact card */}
        <Route path="/embed/:publicPath">
          <PublicRoute>
            <LazyRoute>
              <EmbedCard />
            </LazyRoute>
          </PublicRoute>
        </Route>

        {/* Badge profile route - single segment public paths */}
        <Route path="/:publicPath">
          <PublicRoute>
            <LazyRoute>
              <PublicBadgeProfile />
            </LazyRoute>
          </PublicRoute>
        </Route>

        <Route path="/">
          <ProtectedRoute>
            <LazyRoute>
              <BadgeProfile />
            </LazyRoute>
          </ProtectedRoute>
        </Route>

        {/* 404 catch-all */}
        <Route>
          <LazyRoute>
            <NotFound />
          </LazyRoute>
        </Route>
      </Switch>
    </Sentry.Profiler>
  );
}

function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={({resetError}) => (
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Something went wrong!
          </h2>
          <p className="text-gray-600 mb-4">
            We've been notified and are working to fix this issue.
          </p>
          <button
            onClick={resetError}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try again
          </button>
        </div>
      )}
    >
      <Sentry.Profiler name="app" updateProps={{}}>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <DynamicThemeProvider>
                <LayoutProvider>
                  <Router />
                  <Toaster />
                </LayoutProvider>
              </DynamicThemeProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </Sentry.Profiler>
    </Sentry.ErrorBoundary>
  );
}

export default App;

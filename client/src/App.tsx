import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "./pages/not-found";
import HomePage from "./pages/home-page";
import AuthPage from "./pages/auth-page";
import ProfilePage from "./pages/profile-page";
import WhiskyPage from "./pages/whisky-page";
import WhiskyConcierge from "./pages/whisky-concierge";
import ReviewPage from "./pages/review-page";
import LiveSessionPage from "./pages/live-session-page";
import SessionsPage from "./pages/sessions-page";
import RecommendationsPage from "./pages/recommendations-page";
import TastingGroups from "./pages/TastingGroups";
import NewTastingGroup from "./pages/NewTastingGroup";
import GoLivePage from "./pages/go-live-page";
import RewardsProgramPage from "./pages/rewards-program";
import Navbar from "./components/navbar";
import { UserStatusBar } from "./components/user-status-bar";
import { useAuth } from "./hooks/use-auth";
import { FloatingChatButton } from "@/components/ui/floating-chat";
import { memo } from "react";

// Memoize the Router component to prevent unnecessary re-renders
const Router = memo(function Router() {
  const { user, isLoading } = useAuth();

  // Don't render routes until auth state is determined
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="container mx-auto px-4 py-8 flex-grow">
          <div className="animate-pulse">Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      {user && <UserStatusBar />}
      <main className="container mx-auto px-4 py-8 flex-grow">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/whisky/:id" component={WhiskyPage} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/profile/:id" component={ProfilePage} />
          <Route path="/rewards" component={RewardsProgramPage} />
          <ProtectedRoute path="/concierge" component={WhiskyConcierge} />
          <ProtectedRoute path="/review" component={ReviewPage} />
          <ProtectedRoute path="/review/:id" component={ReviewPage} />
          <Route path="/sessions" component={SessionsPage} />
          <ProtectedRoute path="/sessions/:id" component={LiveSessionPage} />
          <ProtectedRoute path="/recommendations" component={RecommendationsPage} />
          <ProtectedRoute path="/groups" component={TastingGroups} />
          <ProtectedRoute path="/groups/new" component={NewTastingGroup} />
          <ProtectedRoute 
            path="/live" 
            component={GoLivePage} 
            requiredLevel={3}
          />
          <Route component={NotFound} />
        </Switch>
      </main>
      <FloatingChatButton />
    </div>
  );
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
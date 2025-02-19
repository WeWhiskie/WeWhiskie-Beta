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
import ReviewPage from "./pages/review-page";
import SharePage from "./pages/share-page";
import LiveSessionPage from "./pages/live-session-page";
import SessionsPage from "./pages/sessions-page";
import RecommendationsPage from "./pages/recommendations-page";
import Navbar from "./components/navbar";

function Router() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/whisky/:id" component={WhiskyPage} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/profile/:id" component={ProfilePage} />
          <Route path="/reviews/:id" component={SharePage} />
          <Route path="/review" component={ReviewPage} />
          <Route path="/review/:id" component={ReviewPage} />
          <Route path="/sessions" component={SessionsPage} />
          <ProtectedRoute path="/sessions/:id" component={LiveSessionPage} />
          <ProtectedRoute path="/recommendations" component={RecommendationsPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

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
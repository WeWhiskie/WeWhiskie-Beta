import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProtectedRouteProps {
  path: string;
  component: () => React.JSX.Element;
  requiredLevel?: number;
}

export function ProtectedRoute({
  path,
  component: Component,
  requiredLevel = 1,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  const userLevel = user.level || 1;
  if (userLevel < requiredLevel) {
    return (
      <Route path={path}>
        <div className="container mx-auto py-8">
          <Alert variant="destructive">
            <AlertDescription>
              This feature requires level {requiredLevel} to access. You are currently level {userLevel}.
              Continue participating in tastings and writing reviews to level up!
            </AlertDescription>
          </Alert>
        </div>
      </Route>
    );
  }

  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}
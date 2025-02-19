import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProtectedRouteProps {
  path: string;
  component: () => React.JSX.Element;
  expertOnly?: boolean;
}

export function ProtectedRoute({
  path,
  component: Component,
  expertOnly = false,
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

  if (expertOnly && !user.isExpert) {
    return (
      <Route path={path}>
        <div className="container mx-auto py-8">
          <Alert variant="destructive">
            <AlertDescription>
              This page is only accessible to expert users. Please contact support if you believe this is an error.
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function GoLivePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState(false);

  // Only experts can go live
  if (!user?.isExpert) {
    return <Redirect to="/" />;
  }

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest<{ id: number }>("POST", "/api/sessions", {
        title: `Live Tasting with ${user.username}`,
        description: "Join me for a live whisky tasting session!",
        status: "live",
        scheduledFor: new Date().toISOString(),
        hostId: user.id,
      });
      return response;
    },
  });

  const handleStartStream = async () => {
    try {
      setIsInitializing(true);
      // Request camera/mic permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Create the live session
      const session = await createSessionMutation.mutateAsync();

      // Navigate to the live session page
      setLocation(`/sessions/${session.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start stream",
        variant: "destructive",
      });
      setIsInitializing(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Start a Live Tasting Session</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>New Live Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <p className="text-muted-foreground">
                Start a new live tasting session and connect with whisky enthusiasts in real-time.
              </p>
              <Button 
                className="w-full" 
                onClick={handleStartStream}
                disabled={isInitializing || createSessionMutation.isPending}
              >
                <Video className="w-4 h-4 mr-2" />
                {isInitializing ? "Initializing..." : "Start Streaming"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scheduled Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <p className="text-muted-foreground">
                View and manage your upcoming scheduled tasting sessions.
              </p>
              <Button variant="outline" className="w-full" onClick={() => setLocation("/sessions")}>
                <Users className="w-4 h-4 mr-2" />
                View Schedule
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
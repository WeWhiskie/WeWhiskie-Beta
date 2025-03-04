import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Users, Loader2, Star } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { TastingSession } from "@shared/schema";

const REQUIRED_LEVEL_FOR_HOSTING = 3; // Require level 3 to host sessions

export default function GoLivePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState(false);
  const queryClient = useQueryClient();

  // Show loading state while checking auth
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return <Redirect to="/auth" />;
  }

  const userLevel = user.level || 1;

  // Show level requirement message if user level is too low
  if (userLevel < REQUIRED_LEVEL_FOR_HOSTING) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Level {REQUIRED_LEVEL_FOR_HOSTING} Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <p className="text-muted-foreground">
                Hosting live tasting sessions becomes available at level {REQUIRED_LEVEL_FOR_HOSTING}.
                You're currently level {userLevel}!
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="w-4 h-4" />
                <span>
                  Keep participating in tastings and writing reviews to level up!
                </span>
              </div>
              <Button variant="outline" onClick={() => setLocation("/sessions")}>
                <Users className="w-4 h-4 mr-2" />
                Join Other Sessions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const data = {
        title: `Live Tasting with ${user.username}`,
        description: "Join me for a live whisky tasting session!",
        status: "live",
        scheduledFor: new Date().toISOString(),
        hostId: user.id,
        duration: 3600, // 1 hour default duration
        price: null,
        whiskyId: null,
        maxParticipants: null,
        groupId: null
      };

      const response = await apiRequest("POST", "/api/sessions", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create session');
      }
      return await response.json() as TastingSession;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Session Created",
        description: "Redirecting to live session...",
      });
      setLocation(`/sessions/${session.id}`);
      setIsInitializing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create session",
        variant: "destructive",
      });
      setIsInitializing(false);
    }
  });

  const handleStartStream = async () => {
    try {
      setIsInitializing(true);
      console.log("Initializing stream...");

      // Request camera/mic permissions first
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log("Got media stream:", stream.getTracks().map(t => t.kind));

      // Stop the test stream after permissions are granted
      stream.getTracks().forEach(track => track.stop());

      console.log("Creating session...");
      await createSessionMutation.mutateAsync();
    } catch (error) {
      console.error("Stream error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start stream. Please check your camera and microphone permissions.",
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
                {isInitializing ? "Initializing Stream..." : 
                 createSessionMutation.isPending ? "Creating Session..." : 
                 "Start Live Session"}
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
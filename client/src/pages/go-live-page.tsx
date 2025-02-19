import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { TastingSession } from "@shared/schema";

export default function GoLivePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState(false);
  const queryClient = useQueryClient();

  // Only experts can go live
  if (!user?.isExpert) {
    return <Redirect to="/" />;
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
      const session = await response.json() as TastingSession;
      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    },
  });

  const handleStartStream = async () => {
    try {
      setIsInitializing(true);

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

      // Create the live session
      const session = await createSessionMutation.mutateAsync();

      if (session.id) {
        // Release the test stream
        stream.getTracks().forEach(track => track.stop());

        // Navigate to the live session page
        setLocation(`/sessions/${session.id}`);
      } else {
        throw new Error("Failed to create session");
      }
    } catch (error) {
      console.error("Stream error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start stream. Please check your camera and microphone permissions.",
        variant: "destructive",
      });
    } finally {
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
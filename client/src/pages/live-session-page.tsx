import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWebRTC } from "@/hooks/use-webrtc";
import { VideoStream } from "@/components/live-session/video-stream";
import { ChatBox } from "@/components/live-session/chat-box";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import type { TastingSession, User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ChatMessage {
  id: number;
  userId: number;
  username: string;
  message: string;
  timestamp: Date;
}

export default function LiveSessionPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const sessionId = parseInt(id || "0");
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<User[]>([]);
  const [wsConnection, setWsConnection] = useState<{ cleanup: () => void } | null>(null);

  const { 
    stream, 
    error: streamError, 
    isConnecting,
    isReconnecting,
    connectionState,
    connectToSocket,
    sendMessage,
    peerConnection 
  } = useWebRTC(false);

  const { data: session, isLoading: isLoadingSession } = useQuery<TastingSession>({
    queryKey: ["/api/sessions", sessionId],
    enabled: !!sessionId,
  });

  const isHost = session?.hostId === user?.id;

  const endSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/sessions/${sessionId}/end`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Session ended",
        description: "The live session has been ended successfully.",
      });
      setLocation("/sessions");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to end the session. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Initialize WebSocket connection
  useEffect(() => {
    if (!session || !user) return;

    const cleanup = connectToSocket(sessionId, user.id);
    setWsConnection({ cleanup });

    return () => {
      wsConnection?.cleanup();
    };
  }, [session, user, sessionId, connectToSocket]);

  const handleSendMessage = useCallback((message: string) => {
    if (!user) return;

    const newMessage = {
      id: Date.now(),
      userId: user.id,
      username: user.username,
      message,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);

    sendMessage('chat', { 
      userId: user.id, 
      message 
    });
  }, [user, sendMessage]);

  if (isLoadingSession) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <div>Session not found</div>;
  }

  return (
    <div className="container mx-auto py-6 grid lg:grid-cols-[1fr,350px] gap-6">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{session.title}</h2>
                <p className="text-muted-foreground">{session.description}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <VideoStream 
              stream={stream} 
              isLoading={isConnecting || isReconnecting}
              isHost={isHost}
              participantCount={participants.length}
              peerConnection={peerConnection}
              className="rounded-lg overflow-hidden"
            />
            {streamError && (
              <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <p>Error accessing stream: {streamError.message}</p>
              </div>
            )}
            {connectionState !== 'connected' && !isConnecting && (
              <div className="mt-4 p-4 bg-warning/10 text-warning rounded-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <p>Connection status: {connectionState}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {isHost && (
          <Card className="p-4">
            <Button
              variant="destructive"
              onClick={() => endSessionMutation.mutate()}
              disabled={endSessionMutation.isPending}
              className="w-full"
            >
              {endSessionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ending Session...
                </>
              ) : (
                "End Session"
              )}
            </Button>
          </Card>
        )}
      </div>
      <div className="h-[calc(100vh-8rem)]">
        <ChatBox 
          messages={messages} 
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}
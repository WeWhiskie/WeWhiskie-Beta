import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWebRTC } from "@/hooks/use-webrtc";
import { VideoStream } from "@/components/live-session/video-stream";
import { ChatBox } from "@/components/live-session/chat-box";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, Wifi, WifiOff } from "lucide-react";
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

  const { data: session, isLoading: isLoadingSession } = useQuery<TastingSession>({
    queryKey: ["/api/sessions", sessionId],
    enabled: !!sessionId,
  });

  const isHost = session?.hostId === user?.id;

  const { 
    stream, 
    error: streamError, 
    isConnecting,
    isReconnecting,
    connectionState,
    connectToSocket,
    sendMessage,
    peerConnection,
    cleanup 
  } = useWebRTC(isHost);

  const endSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/sessions/${sessionId}/end`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to end session');
      }
      return response.json();
    },
    onSuccess: () => {
      cleanup();
      toast({
        title: "Session ended",
        description: "The live session has been ended successfully.",
      });
      setLocation("/sessions");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to end the session. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Initialize WebSocket connection when session and user are available
  useEffect(() => {
    if (!session || !user || !sessionId) return;

    const cleanupFn = connectToSocket(sessionId, user.id);

    // Cleanup on unmount
    return () => {
      cleanupFn();
      cleanup();
    };
  }, [session, user, sessionId, connectToSocket, cleanup]);

  // Handle received WebSocket messages for chat
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

  // Loading state
  if (isLoadingSession) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Session Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This session may have ended or been removed.
            </p>
            <Button onClick={() => setLocation("/sessions")}>
              Return to Sessions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'text-green-500';
      case 'connecting':
      case 'new':
        return 'text-yellow-500';
      case 'disconnected':
      case 'failed':
      case 'closed':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

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
              <div className="flex items-center gap-2">
                {connectionState === 'connected' ? (
                  <Wifi className={getConnectionStatusColor()} />
                ) : (
                  <WifiOff className={getConnectionStatusColor()} />
                )}
                <span className={`text-sm ${getConnectionStatusColor()}`}>
                  {connectionState.charAt(0).toUpperCase() + connectionState.slice(1)}
                </span>
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
                <div>
                  <p className="font-semibold">Stream Error</p>
                  <p className="text-sm">{streamError.message}</p>
                  {isHost && (
                    <p className="text-sm mt-2">
                      Please check your camera and microphone permissions.
                    </p>
                  )}
                </div>
              </div>
            )}
            {(isConnecting || isReconnecting) && (
              <div className="mt-4 p-4 bg-yellow-500/10 text-yellow-500 rounded-lg flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p>{isReconnecting ? "Reconnecting..." : "Connecting..."}</p>
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
          disabled={connectionState !== 'connected'}
        />
      </div>
    </div>
  );
}
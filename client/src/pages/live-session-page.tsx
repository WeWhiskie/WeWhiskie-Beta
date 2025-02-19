import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWebRTC } from "@/hooks/use-webrtc";
import { VideoStream } from "@/components/live-session/video-stream";
import { ChatBox } from "@/components/live-session/chat-box";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Loader2, Users } from "lucide-react";
import type { TastingSession, User } from "@shared/schema";

interface ChatMessage {
  id: number;
  userId: number;
  username: string;
  message: string;
  timestamp: Date;
}

export default function LiveSessionPage() {
  const { id } = useParams();
  const sessionId = parseInt(id || "0");
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<User[]>([]);

  const { data: session, isLoading: isLoadingSession } = useQuery<TastingSession>({
    queryKey: ["/api/sessions", sessionId],
    enabled: !!sessionId,
  });

  const isHost = session?.hostId === user?.id;
  const { stream, error, isConnecting, connectToSocket, sendMessage } = useWebRTC(isHost);

  useEffect(() => {
    if (session && user) {
      const cleanup = connectToSocket(sessionId, user.id);
      return cleanup;
    }
  }, [session, user, sessionId]);

  const handleSendMessage = (message: string) => {
    if (user) {
      const newMessage = {
        id: Date.now(),
        userId: user.id,
        username: user.username,
        message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, newMessage]);
      // Fix: Add userId to the payload to match WebRTCPayload type
      sendMessage("chat", { userId: user.id, message });
    }
  };

  if (isLoadingSession || isConnecting) {
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
    <div className="grid lg:grid-cols-[1fr,300px] gap-6">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{session.title}</h2>
                <p className="text-muted-foreground">{session.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{participants.length}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <VideoStream stream={stream} isLoading={!stream && !error} />
            {error && (
              <p className="text-destructive mt-2">
                Error accessing camera: {error.message}
              </p>
            )}
          </CardContent>
        </Card>

        {isHost && (
          <Card className="p-4">
            <Button
              variant="destructive"
              onClick={async () => {
                // TODO: Implement end session functionality
                // Update session status to 'ended'
                // Close all WebRTC connections
                // Redirect to session list
              }}
            >
              End Session
            </Button>
          </Card>
        )}
      </div>

      <div className="h-[calc(100vh-8rem)]">
        <ChatBox messages={messages} onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
}
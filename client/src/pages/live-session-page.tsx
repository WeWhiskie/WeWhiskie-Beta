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
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<User[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const { data: session, isLoading: isLoadingSession } = useQuery<TastingSession>({
    queryKey: ["/api/sessions", sessionId],
    enabled: !!sessionId,
  });

  const isHost = session?.hostId === user?.id;

  // Initialize WebSocket connection
  useEffect(() => {
    if (!session || !user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // Join the session room
      ws.send(JSON.stringify({
        type: 'join-session',
        payload: { userId: user.id, sessionId }
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'chat':
          const { userId, username, message } = data.payload;
          setMessages(prev => [...prev, {
            id: Date.now(),
            userId,
            username,
            message,
            timestamp: new Date()
          }]);
          break;
        case 'user-joined':
        case 'user-left':
          // Update participants list
          const { participants: newParticipants } = data.payload;
          setParticipants(newParticipants);
          break;
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [session, user, sessionId]);

  // Initialize media stream for host
  useEffect(() => {
    if (!isHost) return;

    const initStream = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setStream(mediaStream);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to access media devices'));
        toast({
          title: "Stream Error",
          description: "Failed to access camera or microphone",
          variant: "destructive"
        });
      }
    };

    initStream();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isHost, toast]);

  const handleSendMessage = (message: string) => {
    if (!user) return;

    const newMessage = {
      id: Date.now(),
      userId: user.id,
      username: user.username,
      message,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);

    // Send message through WebSocket
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'chat',
        payload: { userId: user.id, message }
      }));
    }
  };

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
              onClick={() => {
                if (stream) {
                  stream.getTracks().forEach(track => track.stop());
                }
                // TODO: Update session status to ended
                window.location.href = '/sessions';
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
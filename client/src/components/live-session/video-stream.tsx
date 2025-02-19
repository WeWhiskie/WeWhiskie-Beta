import { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Mic, 
  MicOff,
  Camera, 
  CameraOff,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoStreamProps {
  stream: MediaStream | null;
  isLoading?: boolean;
  isHost?: boolean;
  participantCount?: number;
  onToggleAudio?: () => void;
  onToggleVideo?: () => void;
  className?: string;
}

export function VideoStream({ 
  stream, 
  isLoading,
  isHost,
  participantCount = 0,
  onToggleAudio,
  onToggleVideo,
  className
}: VideoStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleToggleAudio = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
      onToggleAudio?.();
    }
  };

  const handleToggleVideo = () => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
      onToggleVideo?.();
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="w-full aspect-video rounded-lg" />;
  }

  return (
    <Card className={cn("relative group overflow-hidden", className)}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full aspect-video object-cover"
        onClick={handleToggleFullscreen}
      />

      {/* Overlay controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isHost && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleAudio}
                  className="text-white hover:bg-white/20"
                >
                  {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleVideo}
                  className="text-white hover:bg-white/20"
                >
                  {isVideoEnabled ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <Heart className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <MessageCircle className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Participant count */}
      <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 rounded-full flex items-center gap-2 text-white">
        <Users className="h-4 w-4" />
        <span className="text-sm">{participantCount}</span>
      </div>
    </Card>
  );
}
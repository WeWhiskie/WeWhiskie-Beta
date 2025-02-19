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
  Users,
  Settings,
  Maximize2,
  Signal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VideoStreamProps {
  stream: MediaStream | null;
  isLoading?: boolean;
  isHost?: boolean;
  participantCount?: number;
  peerConnection?: RTCPeerConnection | null;
  onToggleAudio?: () => void;
  onToggleVideo?: () => void;
  onQualityChange?: (quality: string) => void;
  className?: string;
}

const QUALITY_OPTIONS = [
  { value: '1080p', label: '1080p HD' },
  { value: '720p', label: '720p HD' },
  { value: '480p', label: '480p' },
  { value: '360p', label: '360p' },
];

type StreamStats = {
  bytesReceived: number;
  timestamp: number;
  packetsLost: number;
};

export function VideoStream({ 
  stream, 
  isLoading,
  isHost,
  participantCount = 0,
  peerConnection,
  onToggleAudio,
  onToggleVideo,
  onQualityChange,
  className
}: VideoStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentQuality, setCurrentQuality] = useState('1080p');
  const [connectionQuality, setConnectionQuality] = useState<number>(100);
  const [showControls, setShowControls] = useState(false);
  const [stats, setStats] = useState<{
    bitrate: number;
    packetsLost: number;
    roundTripTime: number;
  }>({
    bitrate: 0,
    packetsLost: 0,
    roundTripTime: 0,
  });

  const statsMapRef = useRef<Map<string, StreamStats>>(new Map());

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (peerConnection) {
      interval = setInterval(async () => {
        try {
          const stats = await peerConnection.getStats();
          let totalBitrate = 0;
          let totalPacketsLost = 0;
          let roundTripTime = 0;
          let statCount = 0;

          stats.forEach(stat => {
            if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
              const bytesReceived = stat.bytesReceived;
              const timestamp = stat.timestamp;
              const packetsLost = stat.packetsLost || 0;
              const previousStats = statsMapRef.current.get(stat.id);

              if (previousStats) {
                const timeDiff = timestamp - previousStats.timestamp;
                const bitrate = 8 * (bytesReceived - previousStats.bytesReceived) / timeDiff;
                totalBitrate += bitrate;
                totalPacketsLost += packetsLost - previousStats.packetsLost;
              }

              statsMapRef.current.set(stat.id, {
                bytesReceived,
                timestamp,
                packetsLost
              });
              statCount++;
            } else if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
              roundTripTime = stat.currentRoundTripTime ? stat.currentRoundTripTime * 1000 : 0;
            }
          });

          if (statCount > 0) {
            const avgBitrate = totalBitrate / statCount;
            setStats({
              bitrate: avgBitrate,
              packetsLost: totalPacketsLost,
              roundTripTime,
            });

            const quality = calculateConnectionQuality(avgBitrate, totalPacketsLost, roundTripTime);
            setConnectionQuality(quality);
          }
        } catch (error) {
          console.error('Error getting WebRTC stats:', error);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [peerConnection]);

  const calculateConnectionQuality = (bitrate: number, packetsLost: number, rtt: number): number => {
    const expectedBitrate = 5000000; // 5 Mbps for HD video
    const maxPacketLoss = 100;
    const maxRTT = 300; // 300ms

    const bitrateScore = Math.min((bitrate / expectedBitrate) * 100, 100);
    const packetLossScore = 100 - Math.min((packetsLost / maxPacketLoss) * 100, 100);
    const rttScore = 100 - Math.min((rtt / maxRTT) * 100, 100);

    return Math.round((bitrateScore * 0.3) + (packetLossScore * 0.4) + (rttScore * 0.3));
  };

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

  const handleQualityChange = (quality: string) => {
    setCurrentQuality(quality);
    onQualityChange?.(quality);
  };

  if (isLoading) {
    return <Skeleton className="w-full aspect-video rounded-lg" />;
  }

  return (
    <Card 
      className={cn(
        "relative group overflow-hidden",
        showControls ? "cursor-default" : "cursor-pointer",
        className
      )}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full aspect-video object-cover"
        onClick={handleToggleFullscreen}
      />

      <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 rounded-full flex items-center gap-2 text-white">
        <Signal className={cn(
          "h-4 w-4",
          connectionQuality > 75 ? "text-green-500" :
          connectionQuality > 50 ? "text-yellow-500" : "text-red-500"
        )} />
        <span className="text-sm">
          {currentQuality} ({Math.round(stats.bitrate / 1000)} kbps)
        </span>
      </div>

      <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 rounded-full flex items-center gap-2 text-white">
        <Users className="h-4 w-4" />
        <span className="text-sm">{participantCount}</span>
      </div>

      {isHost && showControls && (
        <div className="absolute top-16 left-4 px-3 py-2 bg-black/60 rounded-lg text-xs text-white space-y-1">
          <div>Packets Lost: {stats.packetsLost}</div>
          <div>RTT: {Math.round(stats.roundTripTime)}ms</div>
        </div>
      )}

      <div className={cn(
        "absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0"
      )}>
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
                <Select
                  value={currentQuality}
                  onValueChange={handleQualityChange}
                >
                  <SelectTrigger className="w-[90px] h-9 bg-black/60 border-0 text-white">
                    <SelectValue placeholder="Quality" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALITY_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={handleToggleFullscreen}>
              <Maximize2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
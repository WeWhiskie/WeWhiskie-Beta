import { useState, useEffect, useRef } from "react";
import Lottie from "lottie-react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import defaultAnimation from "./animations/talking.json";
import type { ConciergePersonality } from "@shared/schema";

interface AvatarComponentProps {
  personality: ConciergePersonality | null;
  isListening: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  customAvatarUrl?: string;
}

export function AvatarComponent({
  personality,
  isListening,
  onStartListening,
  onStopListening,
  isMuted,
  onToggleMute,
  customAvatarUrl,
}: AvatarComponentProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const lottieRef = useRef(null);

  // Check microphone permissions on mount
  useEffect(() => {
    const checkMicPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasMicPermission(true);
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error("[AvatarComponent] Microphone access error:", err);
        setHasMicPermission(false);
      }
    };
    checkMicPermissions();
  }, []);

  // Handle avatar loading and URL changes
  useEffect(() => {
    if (customAvatarUrl) {
      setIsLoading(true);
      setAvatarError(false);

      // Preload image
      const img = new Image();
      img.src = customAvatarUrl;
      img.onload = () => setIsLoading(false);
      img.onerror = () => {
        setAvatarError(true);
        setIsLoading(false);
      };
    }
  }, [customAvatarUrl]);

  // Handle animation state
  useEffect(() => {
    setIsAnimating(isListening);
  }, [isListening]);

  const renderAvatar = () => {
    if (!customAvatarUrl || avatarError) {
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/10 rounded-full overflow-hidden">
            <Lottie
              ref={lottieRef}
              animationData={defaultAnimation}
              loop={isAnimating}
              autoplay={isAnimating}
              className="w-full h-full"
              onComplete={() => setIsAnimating(false)}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        <Avatar className="w-full h-full">
          <AvatarImage
            src={customAvatarUrl}
            alt={personality?.name || "AI Concierge"}
            className={cn(
              "w-full h-full object-cover rounded-full",
              isLoading ? "opacity-0" : "opacity-100",
              "transition-opacity duration-200"
            )}
          />
          <AvatarFallback className="text-2xl bg-primary/20">
            {personality?.name?.[0] || "AI"}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  };

  return (
    <div className="relative flex flex-col items-center space-y-4">
      <div className="relative w-32 h-32 rounded-full overflow-hidden shadow-lg">
        {renderAvatar()}
      </div>

      <div className="flex items-center gap-2 mt-4">
        <Button
          variant={isListening ? "destructive" : "outline"}
          size="icon"
          className={cn(
            "relative transition-all duration-200",
            !hasMicPermission && "opacity-50 cursor-not-allowed",
            isListening && "animate-pulse"
          )}
          onClick={() => {
            if (!hasMicPermission) return;
            isListening ? onStopListening() : onStartListening();
          }}
          disabled={!hasMicPermission}
          title={!hasMicPermission ? "Microphone access required" : (isListening ? "Stop listening" : "Start listening")}
        >
          {isListening ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="outline"
          size="icon"
          className={cn(
            "relative transition-all duration-200",
            isMuted && "bg-muted"
          )}
          onClick={onToggleMute}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {personality && (
        <div className="text-center animate-fade-in">
          <p className="text-sm font-medium">{personality.name}</p>
          <p className="text-xs text-muted-foreground">{personality.accent}</p>
        </div>
      )}
    </div>
  );
}
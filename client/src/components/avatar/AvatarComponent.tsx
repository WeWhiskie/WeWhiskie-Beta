import { useState, useEffect, useRef } from "react";
import Lottie from "lottie-react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  const lottieRef = useRef(null);

  useEffect(() => {
    console.log("[AvatarComponent] Mounting with personality:", personality?.name);
    console.log("[AvatarComponent] Custom avatar URL:", customAvatarUrl);
    return () => {
      console.log("[AvatarComponent] Unmounting");
    };
  }, [personality, customAvatarUrl]);

  useEffect(() => {
    if (isListening) {
      console.log("[AvatarComponent] Starting animation");
      setIsAnimating(true);
    } else {
      console.log("[AvatarComponent] Stopping animation");
      setIsAnimating(false);
    }
  }, [isListening]);

  const handleAvatarError = () => {
    console.error("[AvatarComponent] Failed to load avatar image:", customAvatarUrl);
    setAvatarError(true);
  };

  const renderAvatar = () => {
    if (!customAvatarUrl || avatarError) {
      return (
        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
          <Lottie
            ref={lottieRef}
            animationData={defaultAnimation}
            loop={isAnimating}
            autoplay={isAnimating}
            className="w-full h-full"
          />
        </div>
      );
    }

    return (
      <Avatar className="w-full h-full">
        <AvatarImage 
          src={customAvatarUrl} 
          alt={personality?.name || "AI Concierge"}
          onError={handleAvatarError}
        />
        <AvatarFallback className="text-2xl bg-primary/20">
          {personality?.name?.[0] || "AI"}
        </AvatarFallback>
      </Avatar>
    );
  };

  return (
    <div className="relative flex flex-col items-center space-y-4">
      <div className="relative w-32 h-32 rounded-full overflow-hidden">
        {renderAvatar()}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="relative"
          onClick={() => {
            console.log("[AvatarComponent] Toggling listening state:", !isListening);
            if (isListening) {
              onStopListening();
            } else {
              onStartListening();
            }
          }}
        >
          {isListening ? (
            <MicOff className="h-4 w-4 text-red-500" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          <span className="sr-only">
            {isListening ? "Stop listening" : "Start listening"}
          </span>
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="relative"
          onClick={() => {
            console.log("[AvatarComponent] Toggling mute state:", !isMuted);
            onToggleMute();
          }}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
          <span className="sr-only">
            {isMuted ? "Unmute" : "Mute"}
          </span>
        </Button>
      </div>

      {personality && (
        <div className="text-center">
          <p className="text-sm font-medium">{personality.name}</p>
          <p className="text-xs text-muted-foreground">{personality.accent}</p>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect, useRef } from "react";
import Lottie from "lottie-react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import defaultAnimation from "./animations/talking.json";
import type { ConciergePersonality } from "@shared/schema";

interface AvatarComponentProps {
  personality: ConciergePersonality | null;
  isSpeaking: boolean;
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
  const lottieRef = useRef(null);

  useEffect(() => {
    if (isListening) {
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
    }
  }, [isListening]);

  return (
    <div className="relative flex flex-col items-center space-y-4">
      <div className="relative w-32 h-32 rounded-full overflow-hidden bg-primary/10">
        {customAvatarUrl ? (
          <Avatar className="w-full h-full">
            <AvatarImage src={customAvatarUrl} alt={personality?.name || "AI Concierge"} />
            <AvatarFallback>{personality?.name?.[0] || "AI"}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="absolute inset-0">
            <Lottie
              ref={lottieRef}
              animationData={defaultAnimation}
              loop={isAnimating}
              autoplay={isAnimating}
              className="w-full h-full"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
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
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onToggleMute}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
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

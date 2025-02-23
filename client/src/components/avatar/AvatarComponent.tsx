import { useState, useEffect, useRef } from "react";
import Lottie from "lottie-react";
import { Button } from "@/components/ui/button";
import { MessageSquare, VolumeX, Volume2, StopCircle } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import defaultAnimation from "./animations/talking.json";
import type { ConciergePersonality } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

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
  const lottieRef = useRef<any>(null);
  const { toast } = useToast();

  // Check microphone permissions on mount
  useEffect(() => {
    const checkMicPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasMicPermission(true);
        // Clean up the stream after checking permissions
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.error("[AvatarComponent] Microphone access error:", err);
        setHasMicPermission(false);
        toast({
          title: "Microphone Access Required",
          description: "Please enable microphone access to use voice features.",
          variant: "destructive",
        });
      }
    };
    checkMicPermissions();
  }, [toast]);

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
        toast({
          title: "Avatar Load Error",
          description: "Failed to load avatar image. Using default animation.",
          variant: "destructive",
        });
      };
    }
  }, [customAvatarUrl, toast]);

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
    <div className="relative flex flex-col items-center space-y-3">
      <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden shadow-lg">
        {renderAvatar()}
        {isListening && (
          <div className="absolute inset-0 bg-red-500/10 animate-pulse rounded-full" />
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={isListening ? "destructive" : "outline"}
          size="icon"
          className={cn(
            "relative transition-all duration-200",
            !hasMicPermission && "opacity-50 cursor-not-allowed",
            isListening && "animate-pulse"
          )}
          onClick={() => {
            if (!hasMicPermission) {
              toast({
                title: "Microphone Access Required",
                description: "Please enable microphone access to use voice features.",
                variant: "destructive",
              });
              return;
            }
            isListening ? onStopListening() : onStartListening();
          }}
          disabled={!hasMicPermission}
          title={!hasMicPermission ? "Microphone access required" : isListening ? "Stop listening" : "Start listening"}
        >
          {isListening ? (
            <>
              <MessageSquare className="h-4 w-4 text-red-500" />
              <StopCircle className="h-3 w-3 absolute top-0.5 right-0.5" />
            </>
          ) : (
            <MessageSquare className="h-4 w-4" />
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
          <p className="text-sm font-medium truncate max-w-[200px]">{personality.name}</p>
          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{personality.accent}</p>
        </div>
      )}
    </div>
  );
}
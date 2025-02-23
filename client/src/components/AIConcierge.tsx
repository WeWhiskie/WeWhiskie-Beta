import React, { useState, useEffect, useRef } from "react";
import type { ConciergePersonality } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Mic, VolumeX, Volume2, User, Loader2 } from "lucide-react";
import { AvatarComponent } from "./avatar/AvatarComponent";
import "./AIConcierge.css";

interface AIConciergeProps {
  onMessage?: (message: string) => void;
  personality?: ConciergePersonality;
}

const AIConcierge: React.FC<AIConciergeProps> = ({ onMessage, personality }) => {
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [synthesis, setSynthesis] = useState<SpeechSynthesis | null>(null);
  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      setSynthesis(window.speechSynthesis);
    }
  }, []);

  // WebSocket connection check
  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(navigator.onLine);
    };

    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);
    checkConnection();

    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
    };
  }, []);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      toast({
        title: "Speech Recognition Unavailable",
        description: "Your browser doesn't support speech recognition. Please try Chrome or Edge.",
        variant: "destructive"
      });
      return;
    }

    try {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        toast({
          title: "Listening",
          description: "Speak now...",
        });
      };

      recognition.onresult = (event: any) => {
        const lastResult = event.results[event.results.length - 1];
        const text = lastResult[0].transcript;
        setTranscript(text);

        if (lastResult.isFinal && onMessage) {
          setIsProcessing(true);
          onMessage(text);

          // Keep listening for continuous conversation
          if (!lastResult[0].confidence) {
            toast({
              title: "Could not understand",
              description: "Please speak more clearly and try again",
              variant: "destructive"
            });
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);

        const errorMessages: Record<string, string> = {
          'network': 'Network error occurred. Please check your connection.',
          'no-speech': 'No speech detected. Please try again.',
          'not-allowed': 'Please allow microphone access in your browser settings.',
          'aborted': 'Listening stopped.',
          'audio-capture': 'No microphone was found. Ensure it is plugged in and allowed.',
          'service-not-allowed': 'Speech service not allowed. Please try again.',
        };

        toast({
          title: "Speech Recognition Error",
          description: errorMessages[event.error] || `Error: ${event.error}. Please try again.`,
          variant: "destructive"
        });
      };

      recognition.onend = () => {
        setIsListening(false);
        setIsProcessing(false);
      };

      recognitionRef.current = recognition;
    } catch (error) {
      console.error("Error initializing speech recognition:", error);
      toast({
        title: "Speech Recognition Error",
        description: "Failed to initialize speech recognition",
        variant: "destructive"
      });
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [toast, onMessage]);

  const toggleListening = async () => {
    if (!recognitionRef.current) return;

    if (!isConnected) {
      toast({
        title: "Connection Error",
        description: "Please check your internet connection before using voice features.",
        variant: "destructive"
      });
      return;
    }

    if (!isListening) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        try {
          recognitionRef.current.start();
        } catch (error) {
          if ((error as Error).message.includes('recognition has already started')) {
            recognitionRef.current.stop();
          } else {
            throw error;
          }
        }
      } catch (error) {
        console.error("Error accessing microphone:", error);
        toast({
          title: "Microphone Access Error",
          description: "Please allow microphone access in your browser settings.",
          variant: "destructive"
        });
      }
    } else {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Error stopping speech recognition:", error);
      }
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);

    if (synthesis) {
      synthesis.cancel();
      if (newVolume > 0) {
        const utterance = new SpeechSynthesisUtterance("Volume adjusted");
        utterance.volume = newVolume;
        synthesis.speak(utterance);
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    const newVolume = isMuted ? 1 : 0;
    setVolume(newVolume);
    if (synthesis) {
      synthesis.cancel();
    }
  };

  return (
    <div className="concierge-container">
      <AvatarComponent
        personality={personality || null}
        isListening={isListening}
        onStartListening={toggleListening}
        onStopListening={() => recognitionRef.current?.stop()}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        customAvatarUrl={personality?.avatarUrl}
      />

      {/* Speech Recognition Status */}
      {isProcessing && (
        <div className="processing-indicator">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Processing your request...</span>
        </div>
      )}

      {/* Real-time Transcript */}
      {transcript && (
        <div className="transcript-container">
          <p className="transcript-text">{transcript}</p>
        </div>
      )}

      {/* Volume Controls */}
      <div className="volume-control">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className="volume-button"
        >
          {isMuted ? <VolumeX /> : <Volume2 />}
        </Button>
        <Slider
          value={[volume]}
          max={1}
          step={0.1}
          className="w-24"
          onValueChange={handleVolumeChange}
        />
      </div>
    </div>
  );
};

export default AIConcierge;
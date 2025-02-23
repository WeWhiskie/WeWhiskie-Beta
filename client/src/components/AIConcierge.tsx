import React, { useState, useEffect, useRef } from "react";
import type { ConciergePersonality } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { AvatarComponent } from "./avatar/AvatarComponent";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Mic, VolumeX, Volume2 } from "lucide-react";
import "./AIConcierge.css";

interface AIConciergeProps {
  onMessage?: (message: string) => void;
  personality?: ConciergePersonality;
}

const AIConcierge: React.FC<AIConciergeProps> = ({ onMessage, personality = {
  name: "Highland Expert",
  accent: "Scottish Highland",
  catchphrase: "Slàinte mhath!",
  background: "Expert in Highland single malts",
  personality: "Warm and knowledgeable",
  avatarDescription: "Distinguished with a hint of Highland charm",
  voiceDescription: "Rich, warm Scottish accent",
  specialties: ["Highland whisky", "Scotch traditions", "Distillery processes"],
  avatarUrl: undefined
} }) => {
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(1);
  const [transcript, setTranscript] = useState("");
  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Check for browser support
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
          onMessage(text);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);

        const errorMessages: Record<string, string> = {
          'network': 'Network error occurred. Please check your connection.',
          'no-speech': 'No speech detected. Please try again.',
          'not-allowed': 'Microphone access denied. Please enable microphone access.',
          'aborted': 'Listening stopped.',
        };

        toast({
          title: "Speech Recognition Error",
          description: errorMessages[event.error] || `Error: ${event.error}. Please try again.`,
          variant: "destructive"
        });
      };

      recognition.onend = () => {
        setIsListening(false);
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

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (!isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        toast({
          title: "Speech Recognition Error",
          description: "Failed to start speech recognition. Please try again.",
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
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  return (
    <div className="concierge-container">
      <AvatarComponent
        personality={personality}
        isListening={isListening}
      />

      <div className="concierge-controls">
        <Button
          variant={isListening ? "destructive" : "default"}
          size="icon"
          className="mic-button"
          onClick={toggleListening}
        >
          <Mic className={isListening ? "animate-pulse" : ""} />
        </Button>

        <div className="volume-control">
          {volume === 0 ? <VolumeX /> : <Volume2 />}
          <Slider
            value={[volume]}
            max={1}
            step={0.1}
            className="w-24"
            onValueChange={handleVolumeChange}
          />
        </div>
      </div>

      {transcript && (
        <div className="transcript-container">
          <p className="ai-response">{transcript}</p>
        </div>
      )}

      <audio ref={audioRef} />
    </div>
  );
};

export default AIConcierge;
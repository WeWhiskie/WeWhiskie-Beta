import React, { useState, useEffect, useRef } from "react";
import type { ConciergePersonality } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Mic, VolumeX, Volume2, Loader2, Activity, StopCircle } from "lucide-react";
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
  const [aiResponse, setAiResponse] = useState("");
  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isProcessingMicPermission, setIsProcessingMicPermission] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.error("Audio Context initialization failed:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      setSynthesis(window.speechSynthesis);
    }
  }, []);

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
      recognition.lang = personality?.accent?.toLowerCase().includes('scottish') ? 'en-GB' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        toast({
          title: "Voice Recognition Active",
          description: "I'm listening... Speak clearly into your microphone.",
          className: "bg-green-100",
        });
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join(" ");

        setTranscript(transcript);

        if (event.results[event.results.length - 1].isFinal) {
          setIsProcessing(true);
          if (onMessage) {
            onMessage(transcript);
            setTimeout(() => {
              const mockResponse = "I understand you're interested in whisky. How can I help you today?";
              setAiResponse(mockResponse);
              speakResponse(mockResponse);
              setIsProcessing(false);
            }, 1000);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        setIsProcessingMicPermission(false);

        const errorMessages: Record<string, string> = {
          'network': 'Please check your internet connection and try again.',
          'no-speech': 'No speech detected. Please speak clearly into your microphone.',
          'not-allowed': 'Microphone access denied. Please click the camera icon in your browser\'s address bar to enable access.',
          'aborted': 'Voice recognition stopped. Click the microphone icon to start again.',
          'audio-capture': 'No microphone found. Please ensure your microphone is properly connected.',
          'service-not-allowed': 'Voice recognition service unavailable. Please try again in a moment.',
        };

        toast({
          title: "Voice Recognition Error",
          description: errorMessages[event.error] || `Error: ${event.error}. Please try again.`,
          variant: "destructive"
        });
      };

      recognition.onend = () => {
        if (isListening) {
          try {
            recognition.start();
          } catch (error) {
            console.error("Error restarting recognition:", error);
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    } catch (error) {
      console.error("Error initializing speech recognition:", error);
      toast({
        title: "Voice Recognition Error",
        description: "Failed to initialize voice recognition. Please refresh the page.",
        variant: "destructive"
      });
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [toast, onMessage, personality]);

  const speakResponse = (text: string) => {
    if (synthesis && !isMuted) {
      synthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = volume;

      const voices = synthesis.getVoices();
      const preferredVoice = voices.find(voice =>
        personality?.accent?.toLowerCase().includes('scottish')
          ? voice.lang.includes('en-GB')
          : voice.lang.includes('en-US')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      synthesis.speak(utterance);
    }
  };

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

    setIsProcessingMicPermission(true);

    if (!isListening) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
        }
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
          description: "Please allow microphone access in your browser settings (click the camera icon in the address bar).",
          variant: "destructive"
        });
      } finally {
        setIsProcessingMicPermission(false);
      }
    } else {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (error) {
        console.error("Error stopping speech recognition:", error);
      } finally {
        setIsProcessingMicPermission(false);
      }
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);

    if (synthesis && aiResponse) {
      synthesis.cancel();
      if (newVolume > 0) {
        speakResponse(aiResponse);
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    const newVolume = isMuted ? 1 : 0;
    setVolume(newVolume);
    if (synthesis) {
      synthesis.cancel();
      if (!isMuted && aiResponse) {
        speakResponse(aiResponse);
      }
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

      <div className="controls-container">
        <Button
          variant={isListening ? "destructive" : "secondary"}
          size="lg"
          onClick={toggleListening}
          className={`mic-button ${isListening ? 'listening' : ''}`}
          disabled={isProcessingMicPermission}
        >
          {isProcessingMicPermission ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : isListening ? (
            <>
              <Activity className="h-6 w-6 animate-pulse text-red-500" />
              <StopCircle className="h-4 w-4 absolute top-1 right-1" />
            </>
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>

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

      {isListening && (
        <div className="listening-indicator">
          <div className="waveform-animation">
            <span></span><span></span><span></span><span></span>
          </div>
          <p>Listening...</p>
        </div>
      )}

      {isProcessing && (
        <div className="processing-indicator">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Processing your request...</span>
        </div>
      )}

      {transcript && (
        <div className="transcript-container">
          <p className="transcript-text">{transcript}</p>
        </div>
      )}

      {aiResponse && (
        <div className="ai-response-container">
          <p className="ai-response">{aiResponse}</p>
        </div>
      )}
    </div>
  );
};

export default AIConcierge;
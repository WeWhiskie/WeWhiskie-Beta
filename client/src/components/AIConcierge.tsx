import React, { useState, useEffect, useRef } from "react";
import type { ConciergePersonality } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Mic, VolumeX, Volume2, Loader2, MessageSquare, StopCircle } from "lucide-react";
import { AvatarComponent } from "./avatar/AvatarComponent";
import "./AIConcierge.css";

interface AIConciergeProps {
  onMessage?: (message: string) => void;
  personality?: ConciergePersonality;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000; // 3 seconds
const RECONNECT_BACKOFF_MULTIPLIER = 1.5;
const NO_SPEECH_TIMEOUT = 15000; // 15 seconds

const AIConcierge: React.FC<AIConciergeProps> = ({ onMessage, personality }) => {
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [synthesis, setSynthesis] = useState<SpeechSynthesis | null>(null);
  const [aiResponse, setAiResponse] = useState("");
  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isProcessingMicPermission, setIsProcessingMicPermission] = useState(false);
  const [noSpeechTimeout, setNoSpeechTimeout] = useState<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageRef = useRef<string | null>(null);

  useEffect(() => {
    const connectWebSocket = () => {
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        toast({
          title: "Connection Error",
          description: "Failed to connect after multiple attempts. Please try again later.",
          variant: "destructive"
        });
        return;
      }

      if (isConnecting) return;

      setIsConnecting(true);

      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/ai-concierge`;
        console.log('Connecting to WebSocket URL:', wsUrl);

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('Connected to AI Concierge WebSocket');
          setIsConnected(true);
          setIsConnecting(false);
          setReconnectAttempts(0);

          // Send authentication information immediately after connection
          const authToken = localStorage.getItem('auth_token');
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'AUTHENTICATE',
              token: authToken,
              timestamp: Date.now()
            }));
          }

          // Resend last message if any
          if (lastMessageRef.current && ws.readyState === WebSocket.OPEN) {
            ws.send(lastMessageRef.current);
          }
        };

        ws.onmessage = (event) => {
          try {
            const response = JSON.parse(event.data);
            console.log('Received WebSocket message:', response);

            switch (response.type) {
              case 'AUTHENTICATED':
                console.log('Authentication successful');
                // Request personality data if available
                if (personality?.name && ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: 'GET_PERSONALITY',
                    name: personality.name
                  }));
                }
                break;

              case 'AUTH_ERROR':
                console.error('Authentication error:', response.error);
                toast({
                  title: "Authentication Error",
                  description: "Please sign in again to continue.",
                  variant: "destructive"
                });
                // Redirect to login
                window.location.href = '/auth';
                break;

              case 'AI_RESPONSE':
                setAiResponse(response.data.message);
                if (!isMuted) {
                  speakResponse(response.data.message);
                }
                setIsProcessing(false);
                break;

              case 'ERROR':
                console.error('AI Concierge error:', response.error);
                toast({
                  title: "AI Concierge Error",
                  description: response.error,
                  variant: "destructive"
                });
                break;
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        };

        ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event);
          setIsConnected(false);
          setIsConnecting(false);

          if (!event.wasClean) {
            const delay = RECONNECT_DELAY * Math.pow(RECONNECT_BACKOFF_MULTIPLIER, reconnectAttempts);
            setReconnectAttempts(prev => prev + 1);

            toast({
              title: "Connection Lost",
              description: event.code === 1006 
                ? "Connection lost unexpectedly. Reconnecting..." 
                : "Connection closed. Attempting to reconnect...",
              variant: "default"
            });

            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }

            reconnectTimeoutRef.current = setTimeout(() => {
              connectWebSocket();
            }, delay);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnecting(false);

          // Only show error toast if we've exceeded retry attempts
          if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS - 1) {
            toast({
              title: "Connection Error",
              description: "Unable to connect to the AI Concierge. Please check your internet connection.",
              variant: "destructive"
            });
          }
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        setIsConnecting(false);
        setReconnectAttempts(prev => prev + 1);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [personality, toast, isMuted, reconnectAttempts]);

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
        // Start silence timeout
        if (noSpeechTimeout) {
          clearTimeout(noSpeechTimeout);
        }
        setNoSpeechTimeout(setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
            toast({
              title: "No Speech Detected",
              description: "Listening stopped due to silence. Click to start again.",
              variant: "default"
            });
          }
        }, NO_SPEECH_TIMEOUT)); // 15 seconds of silence timeout

        toast({
          title: "Voice Recognition Active",
          description: "I'm listening... Speak clearly into your microphone.",
          className: "bg-green-100",
        });
      };

      recognition.onresult = (event: any) => {
        // Reset silence timeout on speech detection
        if (noSpeechTimeout) {
          clearTimeout(noSpeechTimeout);
        }
        setNoSpeechTimeout(setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
            toast({
              title: "No Speech Detected",
              description: "Listening stopped due to silence. Click to start again.",
              variant: "default"
            });
          }
        }, NO_SPEECH_TIMEOUT));

        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join(" ");

        setTranscript(transcript);

        if (event.results[event.results.length - 1].isFinal) {
          setIsProcessing(true);
          // Send transcript through WebSocket
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            lastMessageRef.current = JSON.stringify({
              type: 'SPEECH_INPUT',
              text: transcript
            });
            wsRef.current.send(lastMessageRef.current);
          } else {
            toast({
              title: "Connection Error",
              description: "Lost connection to AI Concierge. Reconnecting...",
              variant: "destructive"
            });
            setIsProcessing(false);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (noSpeechTimeout) {
          clearTimeout(noSpeechTimeout);
        }
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

        if (event.error !== 'no-speech') {
          toast({
            title: "Voice Recognition Error",
            description: errorMessages[event.error] || `Error: ${event.error}. Please try again.`,
            variant: "destructive"
          });
        }
      };

      recognition.onend = () => {
        if (noSpeechTimeout) {
          clearTimeout(noSpeechTimeout);
        }
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
      if (noSpeechTimeout) {
        clearTimeout(noSpeechTimeout);
      }
    };
  }, [toast, personality]);

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
        description: "Please wait for the AI Concierge to connect before using voice features.",
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
          description: "Please allow microphone access in your browser settings.",
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
        onStopListening={() => {
          if (noSpeechTimeout) {
            clearTimeout(noSpeechTimeout);
          }
          recognitionRef.current?.stop();
        }}
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
          disabled={isProcessingMicPermission || !isConnected}
        >
          {isProcessingMicPermission ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : isListening ? (
            <>
              <MessageSquare className="h-6 w-6 animate-pulse text-red-500" />
              <StopCircle className="h-4 w-4 absolute top-1 right-1" />
            </>
          ) : (
            <MessageSquare className="h-6 w-6" />
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
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, RefreshCcw, UserCircle2, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ConciergePersonality } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { AvatarComponent } from "@/components/avatar/AvatarComponent";

// Message interface for local state
interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: string[];
}

const TypingIndicator = () => (
  <div className="flex items-center gap-1 p-2">
    <motion.div
      className="w-2 h-2 bg-primary rounded-full"
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.2 }}
    />
    <motion.div
      className="w-2 h-2 bg-primary rounded-full"
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.3 }}
    />
    <motion.div
      className="w-2 h-2 bg-primary rounded-full"
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.4 }}
    />
  </div>
);

const TIMEOUT_DURATION = 30000; // 30 seconds timeout

const PERSONALITY_STYLES = [
  { id: "highland", name: "Highland Expert", accent: "Scottish Highland", description: "A seasoned expert from the Highland distilleries" },
  { id: "speyside", name: "Speyside Scholar", accent: "Speyside Scottish", description: "A master of Speyside's finest whiskies" },
  { id: "bourbon", name: "Bourbon Master", accent: "Kentucky American", description: "A Kentucky bourbon heritage expert" },
  { id: "islay", name: "Islay Sage", accent: "Islay Scottish", description: "A wise soul steeped in Islay's peated traditions" },
];

export default function WhiskyConcierge() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Component state
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [selectedStyle, setSelectedStyle] = useState("highland");
  const [currentPersonality, setCurrentPersonality] = useState<ConciergePersonality | null>(null);
  const [isPersonalityChanging, setIsPersonalityChanging] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [recognition, setRecognition] = useState<any>(null);

  // Debug logging for authentication
  useEffect(() => {
    console.log("Auth state:", { isAuthenticated: !!user, user });
  }, [user]);

  // Get concierge personality
  const { data: personalityData, refetch: refetchPersonality } = useQuery({
    queryKey: ["/api/whisky-concierge/personality", selectedStyle],
    enabled: !!user && !!selectedStyle, // Only fetch when user is authenticated
  });

  // Debug logging for personality data
  useEffect(() => {
    console.log("Personality data:", personalityData);
  }, [personalityData]);

  // Update personality when style changes
  useEffect(() => {
    if (personalityData && typeof personalityData === 'object') {
      setCurrentPersonality(personalityData as ConciergePersonality);
      console.log("Setting current personality:", personalityData);

      // Add welcome message
      setMessages(prev => {
        const welcomeMessage = {
          role: "assistant" as const,
          content: `${(personalityData as ConciergePersonality).catchphrase} I'm ${(personalityData as ConciergePersonality).name}, and I'm here to guide you through the world of whisky with my ${(personalityData as ConciergePersonality).accent} expertise.`,
          timestamp: new Date().toISOString(),
        };

        // Only add welcome message if it's different from the last message
        const lastMessage = prev[prev.length - 1];
        if (!lastMessage || lastMessage.content !== welcomeMessage.content) {
          return [...prev, welcomeMessage];
        }
        return prev;
      });
    }
  }, [personalityData]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      try {
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setQuery(transcript);
          handleSubmit(new Event('submit') as any);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          toast({
            title: "Speech Recognition Error",
            description: `Error: ${event.error}. Please try again.`,
            variant: "destructive",
          });
          setIsListening(false);
        };

        setRecognition(recognition);
      } catch (error) {
        console.error("Error initializing speech recognition:", error);
      }
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  const startListening = () => {
    if (recognition) {
      try {
        recognition.start();
        setIsListening(true);
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        toast({
          title: "Speech Recognition Error",
          description: "Failed to start speech recognition. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Speech Recognition Unavailable",
        description: "Your browser doesn't support speech recognition.",
        variant: "destructive",
      });
    }
  };

  const stopListening = () => {
    if (recognition) {
      try {
        recognition.stop();
        setIsListening(false);
      } catch (error) {
        console.error("Error stopping speech recognition:", error);
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isThinking || isPersonalityChanging) return;

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to chat with the concierge",
        variant: "destructive",
      });
      return;
    }

    setIsThinking(true);
    setRetryCount(0);

    try {
      const response = await fetch("/api/whisky-concierge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          query,
          personality: currentPersonality,
          requireVoice: !isMuted,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setMessages(prev => [
        ...prev,
        { role: "user", content: query, timestamp: new Date().toISOString() },
        { 
          role: "assistant", 
          content: data.answer,
          timestamp: new Date().toISOString(),
          citations: data.citations
        }
      ]);

      if (data.audioUrl && !isMuted) {
        const audio = new Audio(data.audioUrl);
        audioRef.current = audio;
        await audio.play();
      }

      setQuery("");
      setIsThinking(false);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      toast({
        title: "Error",
        description: "Failed to get response from the concierge. Please try again.",
        variant: "destructive",
      });
      setIsThinking(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
        <Alert>
          <MessageSquare className="h-4 w-4" />
          <AlertDescription>
            Please sign in to chat with our whisky concierge
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* Header with Personality Selection */}
      <div className="text-center p-4 space-y-4 border-b bg-background/95 sticky top-0 z-10">
        <h1 className="text-xl md:text-2xl font-semibold">Whisky Concierge</h1>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <Select
            value={selectedStyle}
            onValueChange={(value) => {
              setSelectedStyle(value);
              setCurrentPersonality(null);
              setIsPersonalityChanging(true);
              refetchPersonality().finally(() => setIsPersonalityChanging(false));
            }}
          >
            <SelectTrigger className="w-[200px] max-w-full">
              <SelectValue placeholder="Select personality" />
            </SelectTrigger>
            <SelectContent>
              {PERSONALITY_STYLES.map((style) => (
                <SelectItem key={style.id} value={style.id}>
                  <div className="flex flex-col">
                    <span>{style.name}</span>
                    <span className="text-xs text-muted-foreground">{style.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <AnimatePresence mode="wait">
          {currentPersonality && (
            <motion.div
              key={currentPersonality.name}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="relative max-w-xs mx-auto"
            >
              <AvatarComponent
                personality={currentPersonality}
                isListening={isListening}
                onStartListening={startListening}
                onStopListening={stopListening}
                isMuted={isMuted}
                onToggleMute={toggleMute}
                customAvatarUrl={currentPersonality.avatarUrl}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-2 sm:px-4">
        <div className="space-y-4 py-4 max-w-2xl mx-auto">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && currentPersonality && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 hidden sm:flex">
                  <UserCircle2 className="w-6 h-6 text-primary" />
                </div>
              )}
              <div
                className={`rounded-lg p-3 sm:p-4 max-w-[90%] sm:max-w-[85%] ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground ml-4"
                    : "bg-muted mr-4"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p className="font-semibold">Sources:</p>
                    <ul className="list-disc list-inside">
                      {msg.citations.map((citation, idx) => (
                        <li key={idx} className="truncate">
                          <a
                            href={citation}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {new URL(citation).hostname}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex items-start gap-2">
              <div className="bg-muted rounded-lg">
                <TypingIndicator />
              </div>
              {retryCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  Retry attempt {retryCount}/{maxRetries}...
                </span>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-2 sm:p-4 border-t mt-auto bg-background/95 sticky bottom-0">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-2xl mx-auto">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Ask ${currentPersonality?.name || 'your whisky concierge'}...`}
            disabled={isThinking || isPersonalityChanging}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={isThinking || !query.trim() || isPersonalityChanging}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
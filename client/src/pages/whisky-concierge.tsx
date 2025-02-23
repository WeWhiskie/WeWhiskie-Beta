import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, RefreshCcw, UserCircle2, MessageSquare, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
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

// Avatar component with voice controls
const Avatar = ({ 
  personality, 
  isListening, 
  onStartListening, 
  onStopListening,
  isMuted,
  onToggleMute,
  customAvatarUrl 
}: { 
  personality: ConciergePersonality;
  isListening: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  customAvatarUrl?: string;
}) => {
  return (
    <div className="relative flex flex-col items-center gap-2">
      <div className="relative w-24 h-24 rounded-full overflow-hidden bg-muted">
        {customAvatarUrl ? (
          <img
            src={customAvatarUrl}
            alt={personality.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <UserCircle2 className="w-16 h-16 text-primary" />
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-2">
        <Button
          variant="outline"
          size="icon"
          onClick={isListening ? onStopListening : onStartListening}
          className={`transition-colors ${isListening ? 'bg-primary text-primary-foreground' : ''}`}
        >
          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleMute}
          className={`transition-colors ${!isMuted ? 'bg-primary text-primary-foreground' : ''}`}
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      </div>
      <span className="text-sm font-medium">{personality.name}</span>
      <span className="text-xs text-muted-foreground">{personality.accent}</span>
    </div>
  );
};

const TIMEOUT_DURATION = 30000; // 30 seconds timeout

const PERSONALITY_STYLES = [
  { id: "highland", name: "Highland Expert", accent: "Scottish Highland", description: "A seasoned expert from the Highland distilleries" },
  { id: "speyside", name: "Speyside Scholar", accent: "Speyside Scottish", description: "A master of Speyside's finest whiskies" },
  { id: "bourbon", name: "Bourbon Master", accent: "Kentucky American", description: "A Kentucky bourbon heritage expert" },
  { id: "islay", name: "Islay Sage", accent: "Islay Scottish", description: "A wise soul steeped in Islay's peated traditions" },
];

export default function WhiskyConcierge() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [selectedStyle, setSelectedStyle] = useState("highland");
  const [currentPersonality, setCurrentPersonality] = useState<ConciergePersonality | null>(null);
  const [isPersonalityChanging, setIsPersonalityChanging] = useState(false);
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
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

      setRecognition(recognition);
    }
  }, []);

  // Get concierge personality
  const { data: personalityData, refetch: refetchPersonality } = useQuery({
    queryKey: ["/api/whisky-concierge/personality", selectedStyle],
    enabled: !!selectedStyle,
  });

  // Update personality when style changes
  useEffect(() => {
    if (personalityData && typeof personalityData === 'object') {
      setCurrentPersonality(personalityData as ConciergePersonality);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
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
      recognition.start();
      setIsListening(true);
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
      recognition.stop();
      setIsListening(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  // Generate new personality
  const generatePersonality = useMutation({
    mutationFn: async () => {
      setIsPersonalityChanging(true);
      const nameResponse = await fetch("/api/whisky-concierge/generate-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: selectedStyle }),
      });

      if (!nameResponse.ok) {
        throw new Error("Failed to generate name");
      }

      const { name } = await nameResponse.json();

      const personalityResponse = await fetch("/api/whisky-concierge/personality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, style: selectedStyle }),
      });

      if (!personalityResponse.ok) {
        throw new Error("Failed to generate personality");
      }

      const data = await personalityResponse.json();
      return data as ConciergePersonality;
    },
    onSuccess: (data) => {
      setCurrentPersonality(data);
      queryClient.invalidateQueries({ queryKey: ["/api/whisky-concierge/personality", selectedStyle] });
      toast({
        title: "New Personality Generated",
        description: `Meet ${data.name}, your new whisky concierge!`,
        duration: 3000,
      });
      setIsPersonalityChanging(false);
    },
    onError: (error) => {
      setIsPersonalityChanging(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate personality",
      });
    },
  });

  const conciergeQuery = useMutation({
    mutationFn: async (message: string) => {
      if (!user) {
        throw new Error("Please sign in to chat with the concierge");
      }

      if (!message.trim()) {
        throw new Error("Please enter a message");
      }

      setIsThinking(true);
      setRetryCount(0);

      // Set timeout
      const timeout = setTimeout(() => {
        setIsThinking(false);
        toast({
          variant: "destructive",
          title: "Response Timeout",
          description: "The concierge is taking longer than expected. Please try again.",
          duration: 5000,
        });
      }, TIMEOUT_DURATION);

      setTimeoutId(timeout);

      const payload = {
        query: message,
        conversationId: currentConversationId,
        personality: currentPersonality,
        requireVoice: !isMuted,
      };

      const makeRequest = async (attempt: number) => {
        try {
          const response = await fetch("/api/whisky-concierge", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            credentials: 'include',
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Unable to process request at this time.");
          }

          const data = await response.json();
          if (!data || !data.answer) {
            throw new Error("Invalid response from concierge");
          }
          return data;
        } catch (error: any) {
          if (attempt < maxRetries) {
            const delay = 1000 * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
            setRetryCount(attempt + 1);
            return makeRequest(attempt + 1);
          }
          throw error;
        }
      };

      try {
        const result = await makeRequest(0);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (result.audioUrl && !isMuted) {
          const audio = new Audio(result.audioUrl);
          audioRef.current = audio;
          await audio.play();
        }
        return result;
      } catch (error) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        throw error;
      }
    },
    onMutate: (message) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: message,
          timestamp: new Date().toISOString(),
        },
      ]);
      setQuery("");
      if (inputRef.current) {
        inputRef.current.focus();
      }
    },
    onSuccess: (data) => {
      setIsThinking(false);
      setRetryCount(0);
      setCurrentConversationId(data.conversationId);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          timestamp: new Date().toISOString(),
          citations: data.citations
        },
      ]);

      if (currentConversationId) {
        queryClient.invalidateQueries({ queryKey: ['/api/chat', currentConversationId] });
      }
    },
    onError: (error: Error) => {
      setIsThinking(false);
      console.error('Concierge query error:', error);
      toast({
        variant: "destructive",
        title: "Concierge Unavailable",
        description: error.message || "Failed to get response from concierge",
        duration: 5000,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isThinking || isPersonalityChanging) return;
    conciergeQuery.mutate(query);
  };

  const handleRetry = () => {
    if (messages.length > 0) {
      const lastUserMessage = messages.findLast(m => m.role === "user");
      if (lastUserMessage) {
        conciergeQuery.mutate(lastUserMessage.content);
      }
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
          <Button
            variant="outline"
            onClick={() => generatePersonality.mutate()}
            disabled={generatePersonality.isPending || isPersonalityChanging}
            className="w-full sm:w-auto"
          >
            {generatePersonality.isPending || isPersonalityChanging ? "Generating..." : "Generate New Personality"}
          </Button>
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
              {isAvatarLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
              <Avatar
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
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div
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
              </motion.div>
            ))}
          </AnimatePresence>
          {isThinking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-2 pl-2"
            >
              <div className="bg-muted rounded-lg">
                <TypingIndicator />
              </div>
              {retryCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  Retry attempt {retryCount}/{maxRetries}...
                </span>
              )}
            </motion.div>
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
          {isThinking && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleRetry}
              className="shrink-0"
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
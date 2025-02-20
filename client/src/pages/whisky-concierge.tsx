import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import type { Whisky } from "@shared/schema";

// Message interface
interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
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

export default function WhiskyConcierge() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [conciergeName, setConciergeName] = useState<string>("Whisky Pete");

  // Get user's collection
  const { data: collection } = useQuery({
    queryKey: ["/api/whiskies", "collection"],
    enabled: !!user?.id,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const conciergeQuery = useMutation({
    mutationFn: async (message: string) => {
      if (!message.trim()) {
        throw new Error("Please enter a message");
      }

      setIsThinking(true);
      setRetryCount(0);

      const payload = {
        query: message,
        context: {
          userId: user?.id,
          collectionIds: collection?.map((w: Whisky) => w.id) || []
        }
      };

      const makeRequest = async (attempt: number) => {
        try {
          const response = await fetch("/api/whisky-concierge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Unable to process request at this time.");
          }

          const data = await response.json();
          if (!data || (!data.answer && !data.recommendations)) {
            throw new Error("Invalid response from concierge");
          }
          return data;
        } catch (error: any) {
          if (attempt < maxRetries) {
            const delay = 5000 * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
            return makeRequest(attempt + 1);
          }
          throw error;
        }
      };

      return makeRequest(0);
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
      if (data.answer && typeof data.answer === 'string') {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.answer,
            timestamp: new Date().toISOString(),
          },
        ]);
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
    if (!query.trim() || isThinking) return;
    conciergeQuery.mutate(query);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center p-2 border-b">
        <h1 className="text-lg font-semibold">{conciergeName}</h1>
        <p className="text-xs text-muted-foreground">Your Personal Guide</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full px-2">
          <div className="space-y-2 py-2">
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
                    <div
                      className={`rounded-lg p-2 max-w-[85%] ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isThinking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start"
              >
                <div className="bg-muted rounded-lg">
                  <TypingIndicator />
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="p-2 border-t mt-auto">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about whisky..."
            disabled={isThinking}
            className="flex-1 h-8 text-sm"
          />
          <Button 
            type="submit" 
            disabled={isThinking || !query.trim()}
            size="sm"
            className="h-8 px-2"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

interface ConciergeResponse {
  answer?: string;
  recommendations?: Array<{
    whisky: Whisky;
    reason: string;
    confidence: number;
    educationalContent?: {
      history?: string;
      production?: string;
      tastingNotes?: string;
      pairingAdvice?: string;
    };
  }>;
  suggestedTopics?: string[];
}

const STORAGE_KEY = 'whiskyConcierge.name';
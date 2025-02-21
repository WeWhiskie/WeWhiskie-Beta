import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, RefreshCcw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage, ChatConversation } from "@shared/schema";
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

const TIMEOUT_DURATION = 30000; // 30 seconds timeout

export default function WhiskyConcierge() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Get user's collection
  const { data: collection = [] } = useQuery({
    queryKey: ["/api/whiskies", "collection"],
    enabled: !!user?.id,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Clear timeout on component unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

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

      // Set timeout for response
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
        conversationId: currentConversationId
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
          if (!data || !data.answer) {
            throw new Error("Invalid response from concierge");
          }
          return data;
        } catch (error: any) {
          if (attempt < maxRetries) {
            const delay = 1000 * Math.pow(2, attempt); // Exponential backoff
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

      // Invalidate chat history queries
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
    if (!query.trim() || isThinking) return;
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
      <div className="flex flex-col items-center justify-center h-full p-4">
        <p className="text-sm text-center text-muted-foreground">
          Please sign in to chat with our whisky concierge
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center p-4 border-b">
        <h1 className="text-2xl font-semibold">Whisky Concierge</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your personal whisky expert powered by advanced AI
        </p>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-4">
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
                    className={`rounded-lg p-4 max-w-[85%] ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <p className="font-semibold">Sources:</p>
                        <ul className="list-disc list-inside">
                          {msg.citations.map((citation, idx) => (
                            <li key={idx}>
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
              className="flex items-start gap-2"
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
      <div className="p-4 border-t mt-auto">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about whisky..."
            disabled={isThinking}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={isThinking || !query.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
          {isThinking && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleRetry}
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
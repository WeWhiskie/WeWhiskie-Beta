import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Book, Lightbulb, GraduationCap, Edit2, Wand2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Whisky } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Whisky-themed concierge names
const DEFAULT_NAMES = [
  "Whisky Pete",
  "The Malt Maven",
  "Dram Whisperer",
  "Captain Caskmaster",
  "Professor Peat",
  "Lady Ladyburn",
  "Sir Spiritsworth",
  "The Barrel Sage",
  "Highland Hannah",
  "Doctor Dram",
  "Scotch Scholar",
  "Master McBarley",
  "The Spirit Sage",
  "Cask Commander",
  "Islay Isabella",
  "Glen Guardian",
  "The Whisky Wizard",
  "Barrel Barry",
  "Peat Master Penny",
  "The Mash Maestro"
];

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
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

export default function WhiskyConcierge() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conciergeName, setConciergeName] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || "Whisky Pete";
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameStyle, setNameStyle] = useState<"funny" | "professional" | "casual">("casual");
  const [customName, setCustomName] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const [personality, setPersonality] = useState<any>(null);

  // Get user's collection
  const { data: collection } = useQuery<Whisky[]>({
    queryKey: ["/api/whiskies", "collection"],
    enabled: !!user?.id,
  });

  // Fetch personality when name changes
  useEffect(() => {
    const fetchPersonality = async () => {
      try {
        const response = await fetch(`/api/whisky-concierge/personality/${encodeURIComponent(conciergeName)}`);
        if (response.ok) {
          const data = await response.json();
          setPersonality(data);
        }
      } catch (error) {
        console.error('Error fetching personality:', error);
      }
    };
    fetchPersonality();
  }, [conciergeName]);

  // Persist name changes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, conciergeName);
  }, [conciergeName]);

  const conciergeQuery = useMutation({
    mutationFn: async (message: string) => {
      if (!message.trim()) {
        throw new Error("Please enter a message");
      }

      const payload = {
        query: message,
        context: {
          userId: user?.id,
          collectionIds: collection?.map((w) => w.id) || [],
          personality: personality
        }
      };

      console.log('Sending concierge query:', payload);

      const response = await fetch("/api/whisky-concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        // Handle specific error types
        if (error.code === 'RATE_LIMIT_EXCEEDED') {
          throw new Error("Our AI is a bit overwhelmed right now. Please try again in a few minutes.");
        } else if (error.code === 'INVALID_API_KEY') {
          throw new Error("There's a temporary issue with our AI service. We're working on it!");
        }
        throw new Error(error.message || "Failed to get response from concierge");
      }

      const data = await response.json();
      console.log('Received concierge response:', data);
      return data as ConciergeResponse;
    },
    onSuccess: (data) => {
      if (data.answer) {
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
      console.error('Concierge query error:', error);
      toast({
        variant: "destructive",
        title: "Concierge Unavailable",
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Add user message first
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: query,
        timestamp: new Date().toISOString(),
      },
    ]);

    // Send query to concierge
    conciergeQuery.mutate(query);
    setQuery("");
  };

  const handleNameSelect = (name: string) => {
    if (!name.trim()) return;

    setConciergeName(name);
    setIsEditingName(false);
    setCustomName(""); 

    toast({
      title: "Name Updated",
      description: `Your concierge will now be known as ${name}`,
    });
  };

  const handleCustomNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customName.trim()) {
      handleNameSelect(customName);
    }
  };

  // Name generation mutation with improved error handling
  const generateNameMutation = useMutation({
    mutationFn: async (style: "funny" | "professional" | "casual") => {
      console.log("Generating name with style:", style); 
      const response = await fetch("/api/whisky-concierge/generate-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ style }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate name");
      }

      const data = await response.json();
      console.log("Generated name:", data.name); 
      return data.name;
    },
    onSuccess: (name) => {
      handleNameSelect(name);
    },
    onError: (error) => {
      console.error("Name generation error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate a new name. Please try again.",
      });
    },
  });


  return (
    <div className="container mx-auto max-w-4xl py-8 space-y-8">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-4xl font-bold flex items-center gap-2">
            {conciergeName}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingName(true)}
              className="hover:bg-accent"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Your Personal Whisky Guide
        </p>
      </div>

      {/* Name Customization Dialog */}
      <Dialog 
        open={isEditingName} 
        onOpenChange={(open) => {
          setIsEditingName(open);
          if (!open) {
            setCustomName(""); 
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Customize Your Concierge</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Quick Select Section */}
            <div className="space-y-2">
              <h4 className="font-medium text-lg">Featured Names</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DEFAULT_NAMES.slice(0, 6).map((name) => (
                  <Button
                    key={name}
                    variant="outline"
                    className={`justify-start hover:bg-accent transition-colors ${
                      name === conciergeName ? "bg-accent" : ""
                    }`}
                    onClick={() => handleNameSelect(name)}
                  >
                    {name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Browse All Names */}
            <div className="space-y-2">
              <h4 className="font-medium text-lg">Browse All Names</h4>
              <ScrollArea className="h-[200px] rounded-md border p-4">
                <div className="grid grid-cols-2 gap-2">
                  {DEFAULT_NAMES.map((name) => (
                    <Button
                      key={name}
                      variant="ghost"
                      className={`justify-start hover:bg-accent transition-colors ${
                        name === conciergeName ? "bg-accent" : ""
                      }`}
                      onClick={() => handleNameSelect(name)}
                    >
                      {name}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Custom Name Input */}
            <div className="space-y-2">
              <h4 className="font-medium text-lg">Create Your Own</h4>
              <form onSubmit={handleCustomNameSubmit} className="flex gap-2">
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter a custom name..."
                  className="flex-1"
                />
                <Button type="submit" disabled={!customName.trim()}>
                  Save
                </Button>
              </form>
            </div>

            {/* AI Name Generator */}
            <div className="space-y-2">
              <h4 className="font-medium text-lg">AI Name Generator</h4>
              <div className="flex gap-2">
                <Select
                  value={nameStyle}
                  onValueChange={(value) => setNameStyle(value as any)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="funny">Funny</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => generateNameMutation.mutate(nameStyle)}
                  disabled={generateNameMutation.isPending}
                  className="flex-1"
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  {generateNameMutation.isPending ? "Generating..." : "Generate AI Name"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Interface with reduced size */}
      <Card className="max-w-2xl mx-auto"> 
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat with {conciergeName}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingName(true)}
              className="ml-2 hover:bg-accent"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4"> 
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 ${
                    msg.role === "assistant"
                      ? "flex-row"
                      : "flex-row-reverse"
                  }`}
                >
                  <div
                    className={`rounded-lg p-3 max-w-[80%] ${
                      msg.role === "assistant"
                        ? "bg-muted"
                        : "bg-primary text-primary-foreground ml-auto"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {conciergeQuery.isPending && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="animate-pulse">Thinking...</div>
                </div>
              )}
            </div>
          </ScrollArea>

          <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Ask ${conciergeName} about whisky...`}
              disabled={conciergeQuery.isPending}
            />
            <Button type="submit" disabled={conciergeQuery.isPending}>
              Send
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Quick Access Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:bg-accent transition-colors">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Book className="h-8 w-8 mx-auto" />
              <h3 className="font-semibold">Whisky Encyclopedia</h3>
              <p className="text-sm text-muted-foreground">
                Explore detailed information about whisky types and regions
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent transition-colors">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <GraduationCap className="h-8 w-8 mx-auto" />
              <h3 className="font-semibold">Learning Path</h3>
              <p className="text-sm text-muted-foreground">
                Track your whisky knowledge progress
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent transition-colors">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Lightbulb className="h-8 w-8 mx-auto" />
              <h3 className="font-semibold">Personalized Tips</h3>
              <p className="text-sm text-muted-foreground">
                Get custom recommendations based on your taste
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
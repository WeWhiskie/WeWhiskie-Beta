import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Fun whisky-themed concierge name suggestions
const DEFAULT_NAMES = [
  "Whisky Pete",
  "Sir Malted",
  "The Spirit Guide",
  "Highland Hannah",
  "Barrel Barry",
  "Peat Master Penny",
  "Captain Cask",
  "Dr. Dram",
  "The Malt Whisperer",
  "Cask Commander",
  "Scotch Scholar",
  "The Dram Detective",
  "Professor Peat",
  "Lady Ladyburn",
  "The Barrel Sage"
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

export default function WhiskyConcierge() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conciergeName, setConciergeName] = useState(() => {
    return localStorage.getItem("conciergeName") || "Whisky Pete";
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameStyle, setNameStyle] = useState<"funny" | "professional" | "casual">("casual");
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    localStorage.setItem("conciergeName", conciergeName);
  }, [conciergeName]);

  // Name generation mutation
  const generateNameMutation = useMutation({
    mutationFn: async (style: "funny" | "professional" | "casual") => {
      const response = await fetch("/api/whisky-concierge/generate-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style }),
      });
      if (!response.ok) throw new Error("Failed to generate name");
      const data = await response.json();
      return data.name;
    },
    onSuccess: (name) => {
      setConciergeName(name);
      toast({
        title: "Name Generated",
        description: `Your concierge will now be known as ${name}`,
      });
      setIsEditingName(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate a new name",
      });
    },
  });

  // Get user's collection
  const { data: collection } = useQuery<Whisky[]>({
    queryKey: ["/api/whiskies", "collection"],
    enabled: !!user?.id,
  });

  const conciergeQuery = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch("/api/whisky-concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: message,
          context: {
            userId: user?.id,
            collectionIds: collection?.map((w) => w.id) || [],
          },
        }),
      });
      if (!response.ok) throw new Error("Failed to get response from concierge");
      return response.json() as Promise<ConciergeResponse>;
    },
    onSuccess: (data) => {
      if (data.answer) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.answer || "I'm sorry, I couldn't generate a response.",
            timestamp: new Date().toISOString(),
          },
        ]);
      }

      if (data.recommendations?.length) {
        queryClient.setQueryData(
          ["/api/recommendations"],
          data.recommendations
        );
      }

      if (data.suggestedTopics?.length) {
        toast({
          title: "Suggested Topics",
          description: (
            <div className="mt-2 space-y-1">
              {data.suggestedTopics.map((topic, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  <span>{topic}</span>
                </div>
              ))}
            </div>
          ),
        });
      }
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get response from the whisky concierge",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: query,
        timestamp: new Date().toISOString(),
      },
    ]);

    conciergeQuery.mutate(query);
    setQuery("");
  };

  const handleNameChange = (newName: string) => {
    if (newName.trim()) {
      setConciergeName(newName);
      setIsEditingName(false);
      toast({
        title: "Name Updated",
        description: `Your concierge will now be known as ${newName}`,
      });
    }
  };

  const NameCustomizationDialog = () => (
    <Dialog open={isEditingName} onOpenChange={setIsEditingName}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Your Concierge</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="font-medium">Suggested Names</h4>
            <ScrollArea className="h-[200px]">
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_NAMES.map((name) => (
                  <Button
                    key={name}
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      setConciergeName(name);
                      setIsEditingName(false);
                      toast({
                        title: "Name Updated",
                        description: `Your concierge will now be known as ${name}`,
                      });
                    }}
                  >
                    {name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Custom Name</h4>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.querySelector('input') as HTMLInputElement;
                if (input.value.trim()) {
                  setConciergeName(input.value);
                  setIsEditingName(false);
                  toast({
                    title: "Name Updated",
                    description: `Your concierge will now be known as ${input.value}`,
                  });
                }
              }}
              className="flex gap-2"
            >
              <Input
                defaultValue={conciergeName}
                placeholder="Enter custom name..."
              />
              <Button type="submit">Save</Button>
            </form>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">AI Name Generator</h4>
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
              >
                <Wand2 className="mr-2 h-4 w-4" />
                {generateNameMutation.isPending ? "Generating..." : "Generate"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

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
      <NameCustomizationDialog />

      {/* Chat Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat with {conciergeName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
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
              placeholder={`Ask ${conciergeName} about whisky styles, recommendations, or tasting tips...`}
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
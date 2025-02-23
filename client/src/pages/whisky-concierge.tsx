import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import AIConcierge from "@/components/AIConcierge"; // Fixed import
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare } from "lucide-react";
import type { ConciergePersonality } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PERSONALITY_STYLES = [
  { id: "highland", name: "Highland Expert", accent: "Scottish Highland", description: "A seasoned expert from the Highland distilleries" },
  { id: "speyside", name: "Speyside Scholar", accent: "Speyside Scottish", description: "A master of Speyside's finest whiskies" },
  { id: "bourbon", name: "Bourbon Master", accent: "Kentucky American", description: "A Kentucky bourbon heritage expert" },
  { id: "islay", name: "Islay Sage", accent: "Islay Scottish", description: "A wise soul steeped in Islay's peated traditions" },
];

export default function WhiskyConcierge() {
  const { user } = useAuth();
  const [selectedStyle, setSelectedStyle] = useState("highland");
  const [currentPersonality, setCurrentPersonality] = useState<ConciergePersonality | null>(null);

  // Get concierge personality
  const { data: personalityData } = useQuery({
    queryKey: ["/api/whisky-concierge/personality", selectedStyle],
    enabled: !!user && !!selectedStyle,
  });

  // Update personality when data changes
  useEffect(() => {
    if (personalityData && typeof personalityData === 'object') {
      setCurrentPersonality(personalityData as ConciergePersonality);
      console.log("Setting current personality:", personalityData);
    }
  }, [personalityData]);

  // Handle user messages
  const handleMessage = async (message: string) => {
    console.log("Message received:", message);
    // Any additional message handling logic here
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
          <motion.div
            key="concierge"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-4xl"
          >
            <AIConcierge
              onMessage={handleMessage}
              personality={currentPersonality || undefined}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
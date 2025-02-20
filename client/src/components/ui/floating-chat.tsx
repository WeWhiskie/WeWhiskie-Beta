import { useState } from "react";
import { Wine } from "lucide-react";
import { Card } from "./card";
import { Button } from "./button";
import WhiskyConcierge from "@/pages/whisky-concierge";

export function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <Card className="w-[293px] h-[390px] shadow-lg">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => setIsOpen(false)}
          >
            ✕
          </Button>
          <div className="h-full p-4">
            <WhiskyConcierge />
          </div>
        </Card>
      ) : (
        <Button
          size="lg"
          className="rounded-full h-16 w-16 shadow-lg"
          onClick={() => setIsOpen(true)}
        >
          <Wine className="h-8 w-8" />
        </Button>
      )}
    </div>
  );
}
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Review } from "@shared/schema";

interface SharedContent {
  type: 'review';
  content: Review;
}

export default function SharePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data: sharedContent, isLoading } = useQuery<SharedContent>({
    queryKey: ['/api/reviews', id],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sharedContent) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Content Not Found</h1>
        <p className="text-muted-foreground">
          The shared content you're looking for might have been removed or is no longer available.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const { content } = sharedContent;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Shared Whisky Review</h1>
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">{content.whisky.name}</h2>
        <div className="space-y-4">
          <p className="text-muted-foreground">{content.content}</p>
          <div>
            <p className="text-sm text-muted-foreground">
              Rating: {content.rating} / 5
            </p>
            <p className="text-sm text-muted-foreground">
              By: {content.user.username}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
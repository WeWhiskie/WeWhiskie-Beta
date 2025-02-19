import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Review } from "@shared/schema";

export default function SharePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data: review, isLoading } = useQuery<Review & { 
    user: { id: number; username: string };
    whisky: { id: number; name: string; distillery: string; imageUrl: string };
  }>({
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

  if (!review) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Review Not Found</h1>
        <p className="text-muted-foreground">
          The review you're looking for might have been removed or is no longer available.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Whisky Review</h1>
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">{review.whisky.name}</h2>
        <div className="space-y-4">
          <p className="text-muted-foreground">{review.content}</p>
          <div>
            <p className="text-sm text-muted-foreground">
              Rating: {review.rating} / 5
            </p>
            <p className="text-sm text-muted-foreground">
              By: {review.user.username}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
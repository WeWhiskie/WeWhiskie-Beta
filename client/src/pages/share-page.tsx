import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReviewCard } from "@/components/review-card";
import type { Review } from "@shared/schema";

export default function SharePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data: review, isLoading } = useQuery<Review & { 
    user: { id: number; username: string };
    whisky: { id: number; name: string; distillery: string; imageUrl: string };
  }>({
    queryKey: ['/api/reviews/share', id],
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
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Shared Whisky Review</h1>
      <ReviewCard review={review} />
    </div>
  );
}
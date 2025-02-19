import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ReviewCard } from "@/components/review-card";
import { Card } from "@/components/ui/card";

export default function ReviewPage() {
  const { id } = useParams();
  const reviewId = parseInt(id || "0");

  const { data: review, isLoading } = useQuery({
    queryKey: ["/api/reviews", reviewId],
    enabled: !!reviewId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="animate-pulse h-96" />
      </div>
    );
  }

  if (!review) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <p className="text-center text-muted-foreground">Review not found</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ReviewCard review={review} />
    </div>
  );
}

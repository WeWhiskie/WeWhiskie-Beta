import { useParams } from "wouter";
import { ReviewForm } from "@/components/review-form";
import { Card, CardContent } from "@/components/ui/card";

export default function ReviewPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Write a Review</h1>
      <Card>
        <CardContent className="p-6">
          <ReviewForm />
        </CardContent>
      </Card>
    </div>
  );
}
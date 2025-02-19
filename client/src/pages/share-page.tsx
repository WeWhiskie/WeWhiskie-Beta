import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Twitter, Facebook, Linkedin } from "lucide-react";
import { SiInstagram, SiTiktok } from "react-icons/si";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReviewCard } from "@/components/review-card";
import { useToast } from "@/hooks/use-toast";
import { shareToSocial } from "@/lib/social-sharing";
import type { Review } from "@shared/schema";

type ReviewWithRelations = Review & { 
  user: { id: number; username: string };
  whisky: { id: number; name: string; distillery: string; imageUrl: string };
};

export default function SharePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { toast } = useToast();

  const { data: review, isLoading } = useQuery<ReviewWithRelations>({
    queryKey: ['/api/reviews/share', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/reviews/${id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch review');
      }
      return res.json();
    }
  });

  const handleShare = async (platform: 'twitter' | 'facebook' | 'linkedin' | 'instagram' | 'tiktok') => {
    if (!review) return;

    try {
      const shareUrl = `${window.location.origin}/share/${review.id}`;
      await shareToSocial(platform, {
        title: `${review.whisky.name} Review`,
        text: `Check out this ${review.rating}⭐️ review of ${review.whisky.name} by ${review.user.username} on WeWhiskie!`,
        url: shareUrl,
        hashtags: ['WeWhiskie', 'WhiskyLover'],
      });

      toast({
        title: "Shared successfully!",
        description: `Review has been shared to ${platform}.`,
      });
    } catch (error) {
      toast({
        title: "Share failed",
        description: "Unable to share the review. Please try again.",
        variant: "destructive",
      });
    }
  };

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">Shared Whisky Review</h1>
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => handleShare('twitter')}
              >
                <Twitter className="h-5 w-5 text-sky-500" />
                Twitter
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => handleShare('facebook')}
              >
                <Facebook className="h-5 w-5 text-blue-600" />
                Facebook
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => handleShare('linkedin')}
              >
                <Linkedin className="h-5 w-5 text-blue-700" />
                LinkedIn
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => handleShare('instagram')}
              >
                <SiInstagram className="h-5 w-5 text-pink-600" />
                Instagram
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 col-span-2 sm:col-span-1"
                onClick={() => handleShare('tiktok')}
              >
                <SiTiktok className="h-5 w-5" />
                TikTok
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <ReviewCard 
        review={{
          ...review,
          likes: review.likes || 0,
          createdAt: new Date(review.createdAt),
        }} 
      />
    </div>
  );
}
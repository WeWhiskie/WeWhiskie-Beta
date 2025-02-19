import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StarRating } from "./star-rating";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Share2, Twitter, Facebook, Linkedin } from "lucide-react";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ReviewCardProps {
  review: {
    id: number;
    content: string;
    rating: number;
    createdAt: string | Date;
    user: {
      id: number;
      username: string;
    };
    whisky: {
      id: number;
      name: string;
      distillery: string;
      imageUrl: string;
    };
  };
}

export function ReviewCard({ review }: ReviewCardProps) {
  const { toast } = useToast();
  const reviewUrl = `${window.location.origin}/reviews/${review.id}`;
  const shareTitle = `${review.user.username}'s review of ${review.whisky.name}`;

  const handleShare = async (platform: 'twitter' | 'facebook' | 'linkedin') => {
    try {
      let socialUrl;
      const text = `Check out this ${review.whisky.name} review by ${review.user.username}!`;

      switch (platform) {
        case 'twitter':
          socialUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(reviewUrl)}`;
          break;
        case 'facebook':
          socialUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(reviewUrl)}`;
          break;
        case 'linkedin':
          socialUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(reviewUrl)}`;
          break;
      }

      // Track share analytics
      await apiRequest("POST", "/api/share-analytics", {
        platform,
        url: reviewUrl,
        title: shareTitle,
      });

      // Open share dialog
      if (socialUrl) {
        window.open(socialUrl, '_blank', 'width=600,height=400');
      }

      toast({
        title: "Shared successfully!",
        description: `Your review has been shared to ${platform}.`,
      });
    } catch (error) {
      console.error("Share error:", error);
      toast({
        title: "Share failed",
        description: "Unable to share your review. Please try again.",
        variant: "destructive",
      });
    }
  };

  const createdAtDate = typeof review.createdAt === 'string' 
    ? new Date(review.createdAt)
    : review.createdAt;

  return (
    <Card className="overflow-hidden">
      <div className="aspect-video relative">
        <img
          src={review.whisky.imageUrl}
          alt={review.whisky.name}
          className="object-cover w-full h-full"
        />
      </div>
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href={`/profile/${review.user.id}`}>
            <Avatar className="cursor-pointer">
              <AvatarFallback>
                {review.user.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link href={`/profile/${review.user.id}`}>
              <h3 className="font-semibold hover:underline cursor-pointer">
                {review.user.username}
              </h3>
            </Link>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(createdAtDate, { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="font-semibold text-lg">{review.whisky.name}</h4>
          <p className="text-sm text-muted-foreground">
            {review.whisky.distillery}
          </p>
        </div>

        <StarRating rating={review.rating} className="mb-4" />

        <p className="text-muted-foreground">{review.content}</p>
      </CardContent>
      <CardFooter className="bg-muted/50 p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleShare('twitter')}>
              <Twitter className="h-4 w-4 mr-2" />
              Share on Twitter
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShare('facebook')}>
              <Facebook className="h-4 w-4 mr-2" />
              Share on Facebook
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShare('linkedin')}>
              <Linkedin className="h-4 w-4 mr-2" />
              Share on LinkedIn
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
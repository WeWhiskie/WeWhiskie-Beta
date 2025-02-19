import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StarRating } from "./star-rating";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Share2, Twitter, Facebook, Linkedin, Heart } from "lucide-react";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PreciseRating } from "./precise-rating";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface ReviewCardProps {
  review: {
    id: number;
    content: string;
    rating: number;
    createdAt: string | Date;
    likes: number;
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
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: hasLiked } = useQuery({
    queryKey: ['/api/reviews', review.id, 'liked'],
    enabled: !!user,
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/reviews/${review.id}/liked`);
      return res.liked;
    }
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('Must be logged in to like reviews');
      }
      await apiRequest(
        hasLiked ? 'DELETE' : 'POST',
        `/api/reviews/${review.id}/like`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/reviews', review.id, 'liked'] 
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const shareTitle = `${review.user.username}'s review of ${review.whisky.name}`;
  const reviewUrl = `/share/${review.id}`;

  const handleShare = async (platform: 'twitter' | 'facebook' | 'linkedin') => {
    try {
      const fullUrl = `${window.location.origin}${reviewUrl}`;
      let socialUrl;
      const text = `Check out this ${review.whisky.name} review by ${review.user.username}!`;

      switch (platform) {
        case 'twitter':
          socialUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(fullUrl)}`;
          break;
        case 'facebook':
          socialUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`;
          break;
        case 'linkedin':
          socialUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`;
          break;
      }

      await apiRequest("POST", "/api/share-analytics", {
        platform,
        url: fullUrl,
        title: shareTitle,
      });

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

        <PreciseRating 
          maxStars={10} 
          initialRating={review.rating} 
          readonly 
          className="mb-4"
        />

        <p className="text-muted-foreground">{review.content}</p>
      </CardContent>
      <CardFooter className="bg-muted/50 p-4 flex justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => likeMutation.mutate()}
          disabled={!user || likeMutation.isPending}
          className={cn(
            "gap-2",
            hasLiked && "text-red-500 hover:text-red-600"
          )}
        >
          <Heart className={cn(
            "h-4 w-4",
            hasLiked && "fill-current"
          )} />
          {review.likes || 0}
        </Button>

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
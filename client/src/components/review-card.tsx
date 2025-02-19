import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StarRating } from "./star-rating";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Share2, Twitter, Facebook, Linkedin, Heart } from "lucide-react";
import { SiInstagram, SiTiktok } from "react-icons/si";
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
import { shareToSocial } from "@/lib/social-sharing";
import { SharePopup } from "./share-popup";

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
      if (!res.ok) return false;
      return res.json().then(data => data.liked);
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
        />

        <p className="mt-4 text-muted-foreground">{review.content}</p>
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

        <SharePopup
          title={`${review.whisky.name} Review`}
          text={`Check out this ${review.rating}⭐️ review of ${review.whisky.name} by ${review.user.username} on WeWhiskie!`}
          url={`${window.location.origin}/review/${review.id}`}
        />
      </CardFooter>
    </Card>
  );
}
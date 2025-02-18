import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StarRating } from "./star-rating";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { Link } from "wouter";

interface ReviewCardProps {
  review: {
    id: number;
    content: string;
    rating: number;
    createdAt: string;
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
  const handleShare = () => {
    navigator.share({
      title: `${review.user.username}'s review of ${review.whisky.name}`,
      text: review.content,
      url: window.location.href,
    });
  };

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
              {formatDistanceToNow(new Date(review.createdAt), {
                addSuffix: true,
              })}
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
        <Button variant="ghost" size="sm" onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </CardFooter>
    </Card>
  );
}

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  className?: string;
  onRate?: (rating: number) => void;
}

export function StarRating({ rating, className, onRate }: StarRatingProps) {
  return (
    <div className={cn("flex gap-1", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-5 w-5",
            star <= rating
              ? "fill-primary text-primary"
              : "fill-none text-muted-foreground",
            onRate && "cursor-pointer hover:text-primary transition-colors",
          )}
          onClick={() => onRate?.(star)}
        />
      ))}
    </div>
  );
}

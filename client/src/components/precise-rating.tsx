import { Star } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface PreciseRatingProps {
  maxStars?: number;
  initialRating?: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
}

export function PreciseRating({
  maxStars = 10,
  initialRating = 0,
  onChange,
  readonly = false,
}: PreciseRatingProps) {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    setRating(initialRating);
  }, [initialRating]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, starIndex: number) => {
    if (readonly) return;
    
    const star = e.currentTarget;
    const rect = star.getBoundingClientRect();
    const width = rect.width;
    const x = e.clientX - rect.left;
    const decimal = x / width;
    
    // Calculate rating with 0.1 precision
    const preciseRating = starIndex + Math.round(decimal * 10) / 10;
    setHoverRating(Math.min(Math.max(preciseRating, 0), maxStars));
  };

  const handleMouseLeave = () => {
    if (readonly) return;
    setHoverRating(0);
  };

  const handleClick = () => {
    if (readonly) return;
    const newRating = hoverRating;
    setRating(newRating);
    onChange?.(newRating);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[...Array(maxStars)].map((_, index) => {
          const displayRating = hoverRating || rating;
          const fillPercentage = Math.min(Math.max((displayRating - index) * 100, 0), 100);

          return (
            <div
              key={index}
              className={cn(
                "relative cursor-pointer p-1",
                readonly && "cursor-default"
              )}
              onMouseMove={(e) => handleMouseMove(e, index)}
              onMouseLeave={handleMouseLeave}
              onClick={handleClick}
            >
              {/* Background star (empty) */}
              <Star className="h-6 w-6 text-muted-foreground/20" />
              
              {/* Foreground star (filled) with clip-path for partial fill */}
              <div
                className="absolute inset-0 p-1 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - fillPercentage}% 0 0)` }}
              >
                <Star className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          );
        })}
      </div>
      <span className="text-sm font-medium">
        {(hoverRating || rating).toFixed(1)}
      </span>
    </div>
  );
}

import { getBarrelLevel, getProgressToNextLevel } from "@/lib/user-levels";
import { Progress } from "@/components/ui/progress";
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { GiBarrel } from "react-icons/gi";

interface BarrelLevelBadgeProps {
  level: number;
  points?: number;
  showProgress?: boolean;
  className?: string;
}

export function BarrelLevelBadge({ 
  level, 
  points, 
  showProgress = false,
  className = "" 
}: BarrelLevelBadgeProps) {
  const barrelLevel = getBarrelLevel(level);
  const progress = points !== undefined ? getProgressToNextLevel(points) : null;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className={`inline-flex items-center gap-2 ${className}`}>
          <GiBarrel className={`h-5 w-5 ${barrelLevel.color}`} />
          <span className={`font-medium ${barrelLevel.color}`}>
            {barrelLevel.name}
          </span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{barrelLevel.description}</p>
          {showProgress && progress && (
            <div className="space-y-2">
              <Progress 
                value={(progress.progress / progress.required) * 100} 
                className="h-2" 
              />
              <p className="text-xs text-muted-foreground">
                {progress.progress} / {progress.required} XP to next level
              </p>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
import { getBarrelLevel, getProgressToNextLevel, getAvailableRewards } from "@/lib/user-levels";
import { Progress } from "@/components/ui/progress";
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { GiBarrel } from "react-icons/gi";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Crown } from "lucide-react";

interface BarrelLevelBadgeProps {
  level: number | 'premium';
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
  const progress = typeof level === 'number' && points !== undefined ? getProgressToNextLevel(points) : null;
  const rewards = getAvailableRewards(level);
  const isPremium = level === 'premium';

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className={`inline-flex items-center gap-2 ${className}`}>
          {isPremium ? (
            <Crown className="h-5 w-5 text-amber-400" />
          ) : (
            <GiBarrel className={`h-5 w-5 ${barrelLevel.color}`} />
          )}
          <span className={`font-medium ${barrelLevel.color}`}>
            {barrelLevel.name}
          </span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="flex flex-col gap-3">
          <div>
            <h4 className="font-medium mb-1">{barrelLevel.name}</h4>
            <p className="text-sm text-muted-foreground">{barrelLevel.description}</p>
          </div>

          {showProgress && progress && !isPremium && (
            <div className="space-y-2">
              <Progress 
                value={(progress.progress / progress.required) * 100} 
                className="h-2" 
              />
              <p className="text-xs text-muted-foreground">
                {progress.progress} / {progress.required} XP to next level
              </p>
              <p className="text-xs text-muted-foreground">
                Daily check-in reward: {barrelLevel.dailyReward} XP
              </p>
            </div>
          )}

          <div className="space-y-2">
            <h5 className="text-sm font-medium">Available Features:</h5>
            <ScrollArea className="h-[120px] w-full rounded-md border p-2">
              <ul className="text-sm space-y-1">
                {rewards.map((reward, index) => (
                  <li key={index} className="text-muted-foreground">
                    • {reward}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
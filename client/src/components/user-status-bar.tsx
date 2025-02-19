import { useAuth } from "@/hooks/use-auth";
import { BarrelLevelBadge } from "./barrel-level-badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Star } from "lucide-react";

export function UserStatusBar() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="border-b">
      <div className="container mx-auto py-2 px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BarrelLevelBadge 
            level={user.level || 1} 
            points={user.experiencePoints || 0} 
            showProgress={true}
          />
          <Link href="/rewards">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Star className="h-4 w-4 mr-2" />
              View Rewards Program
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Daily Streak: {user.dailyStreak || 0} days</span>
          <span>Reviews: {user.totalReviews || 0}</span>
          <span>Tastings: {user.totalTastings || 0}</span>
        </div>
      </div>
    </div>
  );
}
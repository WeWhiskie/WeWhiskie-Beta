import { useAuth } from "@/hooks/use-auth";
import { BarrelLevelBadge } from "./barrel-level-badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Star, Crown } from "lucide-react";

export function UserStatusBar() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="border-b">
      <div className="container mx-auto py-2 px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BarrelLevelBadge 
            level={user.isPremium ? 'premium' : (user.level || 1)} 
            points={user.experiencePoints || 0} 
            showProgress={!user.isPremium}
          />
          <Link href="/rewards">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              {user.isPremium ? (
                <>
                  <Crown className="h-4 w-4 mr-2 text-amber-400" />
                  Premium Member
                </>
              ) : (
                <>
                  <Star className="h-4 w-4 mr-2" />
                  View Rewards Program
                </>
              )}
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
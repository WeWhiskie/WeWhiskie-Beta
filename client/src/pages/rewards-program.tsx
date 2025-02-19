import { getBarrelLevel } from "@/lib/user-levels";
import { BARREL_LEVELS } from "@/lib/user-levels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarrelLevelBadge } from "@/components/barrel-level-badge";
import { Check, Star, Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function RewardsProgramPage() {
  const { user } = useAuth();
  const currentLevel = user?.isPremium ? 'premium' : (user?.level || 1);

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold">Barrel Rewards Program</h1>
        <p className="text-xl text-muted-foreground">
          Level up your whisky journey through our unique barrel-themed rewards program.
          Engage with the community, share your experiences, and unlock exclusive features.
        </p>
      </div>

      {!user?.isPremium && (
        <Card className="bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-amber-400" />
              Unlock All Features Now
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <p className="text-lg">
                Get instant access to all premium features for just $5/month:
              </p>
              <ul className="grid sm:grid-cols-2 gap-4">
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Unlimited Reviews</p>
                    <p className="text-sm text-muted-foreground">
                      Share your whisky experiences without limits
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">All Premium Features</p>
                    <p className="text-sm text-muted-foreground">
                      Access every feature without restrictions
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Priority Support</p>
                    <p className="text-sm text-muted-foreground">
                      Get help when you need it most
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Early Access</p>
                    <p className="text-sm text-muted-foreground">
                      Be the first to try new features
                    </p>
                  </div>
                </li>
              </ul>
              <Button className="w-full sm:w-auto" size="lg">
                <Crown className="mr-2 h-5 w-5" />
                Upgrade to Premium
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>How to Earn XP</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid sm:grid-cols-2 gap-4">
            <li className="flex items-start gap-2">
              <Check className="mt-1 h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Daily Check-in</p>
                <p className="text-sm text-muted-foreground">
                  Get 5-30 XP daily (reward increases with level)
                </p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-1 h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Write Reviews</p>
                <p className="text-sm text-muted-foreground">
                  Earn 20 XP for each detailed whisky review
                </p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-1 h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Join Tastings</p>
                <p className="text-sm text-muted-foreground">
                  Get 15 XP for participating in live tasting sessions
                </p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-1 h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Host Sessions</p>
                <p className="text-sm text-muted-foreground">
                  Earn 50 XP for hosting successful tasting sessions
                </p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        <h2 className="text-2xl font-bold">Barrel Levels & Benefits</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(BARREL_LEVELS).map(([level, info]) => {
            const isCurrentLevel = level === String(currentLevel);
            const isLocked = !user?.isPremium && (
              level === 'premium' || 
              (typeof currentLevel === 'number' && Number(level) > currentLevel)
            );

            return (
              <Card 
                key={level}
                className={`relative ${isCurrentLevel ? 'ring-2 ring-amber-500' : ''} 
                  ${isLocked ? 'opacity-75' : ''}`}
              >
                <CardHeader className="space-y-1">
                  <div className="flex items-center justify-between">
                    <BarrelLevelBadge level={level === 'premium' ? 'premium' : Number(level)} />
                    {level === 'premium' ? (
                      <Crown className="h-5 w-5 text-amber-400" />
                    ) : (
                      <Star className="h-5 w-5 text-amber-500" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {info.description}
                  </p>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Level Benefits:</h4>
                    <ul className="text-sm space-y-2">
                      {info.rewards.map((reward, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                          <span className="text-muted-foreground">{reward}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {isLocked && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <Lock className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {level === 'premium' ? 'Subscribe to Unlock' : 'Level Up to Unlock'}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
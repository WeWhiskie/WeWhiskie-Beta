import { getBarrelLevel } from "@/lib/user-levels";
import { BARREL_LEVELS } from "@/lib/user-levels";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarrelLevelBadge } from "@/components/barrel-level-badge";
import { Check, Star, Crown, Lock, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

export default function RewardsProgramPage() {
  const { user } = useAuth();
  const currentLevel = user?.isPremium ? 'premium' : (user?.level || 1);

  // TODO: These would come from the backend
  const challengeProgress = {
    daysCompleted: 3,
    totalDays: 7,
    categories: {
      reviews: {
        completed: 4,
        required: 7,
        today: true
      },
      tastings: {
        completed: 2,
        required: 7,
        today: false
      },
      community: {
        completed: 5,
        required: 7,
        today: true
      }
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold">Barrel Rewards Program</h1>
        <p className="text-xl text-muted-foreground">
          Choose your path to unlock premium features: Complete the Master's Journey challenge 
          or become a premium member instantly.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Premium Subscription Card */}
        <Card className="bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-amber-400" />
              Instant Access - $5/month
            </CardTitle>
            <CardDescription>
              Unlock all premium features immediately
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <ul className="grid gap-4">
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Unlimited Everything</p>
                    <p className="text-sm text-muted-foreground">
                      No restrictions on reviews, tastings, or features
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Priority Support & Early Access</p>
                    <p className="text-sm text-muted-foreground">
                      Get help instantly and try new features first
                    </p>
                  </div>
                </li>
              </ul>
              <Button className="w-full sm:w-auto" size="lg">
                <Crown className="mr-2 h-5 w-5" />
                Start Premium Membership
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Master's Journey Challenge Card */}
        <Card className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-amber-600" />
              The Master's Journey
            </CardTitle>
            <CardDescription>
              Complete 7 activities in each category to earn a free month of premium
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {/* Reviews Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Whisky Reviews</span>
                  <span>{challengeProgress.categories.reviews.completed}/{challengeProgress.categories.reviews.required}</span>
                </div>
                <Progress 
                  value={(challengeProgress.categories.reviews.completed / challengeProgress.categories.reviews.required) * 100}
                  className="h-2"
                />
              </div>

              {/* Tastings Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Live Tastings</span>
                  <span>{challengeProgress.categories.tastings.completed}/{challengeProgress.categories.tastings.required}</span>
                </div>
                <Progress 
                  value={(challengeProgress.categories.tastings.completed / challengeProgress.categories.tastings.required) * 100}
                  className="h-2"
                />
              </div>

              {/* Community Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Community Engagement</span>
                  <span>{challengeProgress.categories.community.completed}/{challengeProgress.categories.community.required}</span>
                </div>
                <Progress 
                  value={(challengeProgress.categories.community.completed / challengeProgress.categories.community.required) * 100}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Today's Tasks:</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className={`h-4 w-4 ${challengeProgress.categories.reviews.today ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className={challengeProgress.categories.reviews.today ? 'line-through text-muted-foreground' : ''}>
                      Write a whisky review
                    </span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className={`h-4 w-4 ${challengeProgress.categories.tastings.today ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className={challengeProgress.categories.tastings.today ? 'line-through text-muted-foreground' : ''}>
                      Join a live tasting
                    </span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className={`h-4 w-4 ${challengeProgress.categories.community.today ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className={challengeProgress.categories.community.today ? 'line-through text-muted-foreground' : ''}>
                      Comment on a review
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
              <HoverCard key={level}>
                <HoverCardTrigger asChild>
                  <Card 
                    className={`relative cursor-pointer transition-all hover:shadow-lg
                      ${isCurrentLevel ? 'ring-2 ring-amber-500' : ''} 
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
                      <p className="text-sm text-muted-foreground">
                        {info.description}
                      </p>
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
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">{info.name}</h4>
                      <p className="text-sm text-muted-foreground">{info.description}</p>
                    </div>
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Level Benefits:</h5>
                      <ul className="text-sm space-y-2">
                        {info.rewards.map((reward, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                            <span className="text-muted-foreground">{reward}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
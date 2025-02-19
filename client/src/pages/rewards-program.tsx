import { getBarrelLevel } from "@/lib/user-levels";
import { BARREL_LEVELS } from "@/lib/user-levels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarrelLevelBadge } from "@/components/barrel-level-badge";
import { Check, Star } from "lucide-react";

export default function RewardsProgramPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold">Barrel Rewards Program</h1>
        <p className="text-xl text-muted-foreground">
          Level up your whisky journey through our unique barrel-themed rewards program.
          Engage with the community, share your experiences, and unlock exclusive features.
        </p>
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
                  Get 5-25 XP daily just for visiting (reward increases with level)
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
          {Object.entries(BARREL_LEVELS).map(([level, info]) => (
            <Card key={level}>
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between">
                  <BarrelLevelBadge level={parseInt(level)} />
                  <Star className="h-5 w-5 text-amber-500" />
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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

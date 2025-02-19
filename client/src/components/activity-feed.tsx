import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Heart, Users, Star, Video } from "lucide-react";
import type { ActivityFeed } from "@shared/schema";

const activityIcons = {
  review_created: <BookOpen className="h-4 w-4" />,
  whisky_rated: <Star className="h-4 w-4" />,
  user_followed: <Users className="h-4 w-4" />,
  group_joined: <Users className="h-4 w-4" />,
  tasting_scheduled: <Video className="h-4 w-4" />,
  achievement_unlocked: <Star className="h-4 w-4" />,
};

const activityTitles = {
  review_created: "wrote a review",
  whisky_rated: "rated a whisky",
  user_followed: "followed",
  group_joined: "joined a tasting group",
  tasting_scheduled: "scheduled a tasting",
  achievement_unlocked: "unlocked an achievement",
};

interface ActivityCardProps {
  activity: ActivityFeed;
}

function ActivityCard({ activity }: ActivityCardProps) {
  return (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-2 rounded-full">
            {activityIcons[activity.activityType as keyof typeof activityIcons]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Link href={`/profile/${activity.userId}`}>
                <span className="font-semibold hover:underline cursor-pointer">
                  {activity.metadata?.username || `User ${activity.userId}`}
                </span>
              </Link>
              <span className="text-muted-foreground">
                {activityTitles[activity.activityType as keyof typeof activityTitles]}
              </span>
              {activity.entityType === "whisky" && (
                <Link href={`/whisky/${activity.entityId}`}>
                  <span className="font-semibold hover:underline cursor-pointer">
                    {activity.metadata?.whiskyName}
                  </span>
                </Link>
              )}
              {activity.entityType === "user" && (
                <Link href={`/profile/${activity.entityId}`}>
                  <span className="font-semibold hover:underline cursor-pointer">
                    {activity.metadata?.targetUsername}
                  </span>
                </Link>
              )}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ActivityFeed({ userId }: { userId?: number }) {
  const { data: activities = [], isLoading } = useQuery<ActivityFeed[]>({
    queryKey: userId ? [`/api/users/${userId}/activities`] : ["/api/activities"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 w-10 h-10 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-primary/10 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-primary/10 rounded w-1/4 animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No activities to show yet. Start interacting with the community to see updates here!
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  );
}
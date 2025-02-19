import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { ReviewCard } from "@/components/review-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Review, TastingSession } from "@shared/schema";
import { Loader2, UserPlus, UserMinus, Star, Users, Video, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type ProfileUser = User & {
  _isFollowing?: boolean;
};

export default function ProfilePage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const userId = parseInt(id || "0");

  const { data: user, isLoading: isLoadingUser } = useQuery<ProfileUser>({
    queryKey: ["/api/users", userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    enabled: !!userId,
  });

  const { data: reviews, isLoading: isLoadingReviews } = useQuery<(Review & {
    user: { id: number; username: string };
    whisky: { id: number; name: string; distillery: string; imageUrl: string };
  })[]>({
    queryKey: ["/api/users", userId, "reviews"],
    enabled: !!userId,
  });

  const { data: tastingSessions, isLoading: isLoadingSessions } = useQuery<TastingSession[]>({
    queryKey: ["/api/users", userId, "sessions"],
    enabled: !!userId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/users/${userId}/follow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/users/${userId}/follow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId] });
    },
  });

  if (isLoadingUser) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) return <div>User not found</div>;

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">
                {user.username?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{user.username}</h2>
                  <p className="text-muted-foreground">
                    Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {currentUser?.id !== userId && (
                  <Button
                    variant={user._isFollowing ? "outline" : "default"}
                    onClick={() => {
                      if (user._isFollowing) {
                        unfollowMutation.mutate();
                      } else {
                        followMutation.mutate();
                      }
                    }}
                    disabled={followMutation.isPending || unfollowMutation.isPending}
                  >
                    {followMutation.isPending || unfollowMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : user._isFollowing ? (
                      <>
                        <UserMinus className="h-4 w-4 mr-2" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Follow
                      </>
                    )}
                  </Button>
                )}
              </div>
              {user.bio && (
                <p className="mt-4 text-muted-foreground">{user.bio}</p>
              )}
              <div className="mt-4 flex gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{user.followerCount}</span>
                  <span className="text-muted-foreground">followers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{reviews?.length || 0}</span>
                  <span className="text-muted-foreground">reviews</span>
                </div>
                {user.isExpert && (
                  <Badge variant="secondary">Expert Reviewer</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {tastingSessions && tastingSessions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Tasting Sessions
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tastingSessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="p-6">
                  <h4 className="font-semibold">{session.title}</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    {session.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge>
                      {formatDistanceToNow(new Date(session.scheduledFor), {
                        addSuffix: true,
                      })}
                    </Badge>
                    <Button size="sm">Join Session</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Star className="h-5 w-5" />
          Reviews
        </h3>
        {isLoadingReviews ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        ) : reviews?.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {currentUser?.id === userId
                ? "You haven't posted any reviews yet"
                : "This user hasn't posted any reviews yet"}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews?.map((review) => (
              <ReviewCard
                key={review.id}
                review={{
                  ...review,
                  user: {
                    id: user.id,
                    username: user.username,
                  },
                  whisky: {
                    ...review.whisky,
                    imageUrl: review.whisky.imageUrl || "/placeholder-whisky.jpg",
                  },
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
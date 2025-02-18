import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { ReviewCard } from "@/components/review-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

export default function ProfilePage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const userId = parseInt(id);

  const { data: user } = useQuery({
    queryKey: ["/api/user", userId],
    queryFn: async () => {
      const res = await fetch(`/api/user/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    enabled: !!userId,
  });

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["/api/users", userId, "reviews"],
  });

  if (isLoading) {
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">
                {user?.username?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{user?.username}</h2>
              <p className="text-muted-foreground">
                {reviews?.length || 0} Reviews
              </p>
            </div>
          </div>
          {user?.bio && (
            <p className="mt-4 text-muted-foreground">{user.bio}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reviews?.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      {reviews?.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            {currentUser?.id === userId
              ? "You haven't posted any reviews yet"
              : "This user hasn't posted any reviews yet"}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

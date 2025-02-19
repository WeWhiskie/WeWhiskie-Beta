import { useQuery } from "@tanstack/react-query";
import { ReviewCard } from "@/components/review-card";
import { ReviewForm } from "@/components/review-form";
import { ActivityFeed } from "@/components/activity-feed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Plus, Search, Star, Video, Users, PenSquare, Radio } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import type { Whisky, TastingSession } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

interface Review {
  id: number;
  content: string;
  rating: number;
  createdAt: string;
  likes: number;
  user: {
    id: number;
    username: string;
  };
  whisky: {
    id: number;
    name: string;
    distillery: string;
    imageUrl: string;
  };
}

export default function HomePage() {
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();
  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
  });

  const { data: whiskies = [] } = useQuery<Whisky[]>({
    queryKey: ["/api/whiskies"],
  });

  const { data: sessions = [] } = useQuery<TastingSession[]>({
    queryKey: ["/api/sessions"],
  });

  const upcomingSessions = sessions.filter(
    (session) => session.status === "scheduled"
  );
  const liveSessions = sessions.filter((session) => session.status === "live");

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
          WeWhiskie.
        </h1>
        <p className="text-xl text-muted-foreground">
          Better Together - Share your love of whisky with enthusiasts worldwide
        </p>
        {user && (
          <div className="flex justify-center gap-4 pt-4">
            <Link href="/review">
              <Button size="lg" className="gap-2">
                <PenSquare className="h-5 w-5" />
                Write Review
              </Button>
            </Link>
            <Link href="/live">
              <Button size="lg" variant="outline" className="gap-2">
                <Radio className="h-5 w-5" />
                Start Live Tasting
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions Floating Buttons for Mobile */}
      {user && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-4 md:hidden">
          <Link href="/review">
            <Button size="icon" className="h-12 w-12 rounded-full shadow-lg">
              <PenSquare className="h-6 w-6" />
            </Button>
          </Link>
          <Link href="/live">
            <Button size="icon" className="h-12 w-12 rounded-full shadow-lg">
              <Radio className="h-6 w-6" />
            </Button>
          </Link>
        </div>
      )}

      {/* Live Sessions Section */}
      {(liveSessions.length > 0 || upcomingSessions.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Video className="h-6 w-6" />
              Live & Upcoming Sessions
            </h2>
            <Link href="/sessions">
              <Button>View All Sessions</Button>
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...liveSessions, ...upcomingSessions].slice(0, 3).map((session) => (
              <Link key={session.id} href={`/sessions/${session.id}`}>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant={session.status === "live" ? "destructive" : "secondary"}>
                        {session.status === "live" ? "Live Now" : "Upcoming"}
                      </Badge>
                      {typeof session.price === 'number' && session.price > 0 && (
                        <Badge variant="outline">${session.price.toFixed(2)}</Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{session.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {session.description}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>
                          {typeof session.maxParticipants === 'number' 
                            ? session.maxParticipants 
                            : "∞"}
                        </span>
                      </div>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(session.scheduledFor), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Activity Feed Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Users className="h-6 w-6" />
          Community Activity
        </h2>
        <ActivityFeed />
      </div>

      {/* Search and Actions */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input className="pl-10" placeholder="Search whiskies..." />
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          {showForm ? "Cancel" : "Add Review"}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <ReviewForm />
        </Card>
      )}

      {/* Whiskies Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Star className="h-6 w-6" />
          Featured Whiskies
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {whiskies.map((whisky) => (
            <Link key={whisky.id} href={`/whisky/${whisky.id}`}>
              <Card className="overflow-hidden cursor-pointer transition-transform hover:scale-105 hover:shadow-lg">
                <div className="aspect-[4/3] relative">
                  <img
                    src={whisky.imageUrl}
                    alt={whisky.name}
                    className="object-cover w-full h-full"
                  />
                  {whisky.price && (
                    <div className="absolute top-4 right-4 bg-black/80 text-white px-3 py-1 rounded-full text-sm font-medium">
                      ${whisky.price}
                    </div>
                  )}
                  {whisky.limited === 1 && (
                    <Badge className="absolute top-4 left-4" variant="destructive">
                      Limited Edition
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">{whisky.name}</h3>
                      {whisky.abv && (
                        <span className="text-sm text-muted-foreground">
                          {whisky.abv}% ABV
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {whisky.distillery}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{whisky.type}</Badge>
                      {whisky.region && (
                        <Badge variant="outline">{whisky.region}</Badge>
                      )}
                      {whisky.age && (
                        <Badge variant="outline">{whisky.age} Years</Badge>
                      )}
                    </div>
                    {whisky.tastingNotes && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {whisky.tastingNotes}
                      </p>
                    )}
                  </div>
                  {/* Removed Share button */}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Reviews Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Star className="h-6 w-6" />
          Recent Reviews
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      </div>
    </div>
  );
}
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Video, Users, CalendarDays } from "lucide-react";
import type { TastingSession } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function SessionsPage() {
  const { user } = useAuth();
  const { data: sessions = [] } = useQuery<TastingSession[]>({
    queryKey: ["/api/sessions"],
  });

  const liveSessions = sessions.filter((session) => session.status === "live");
  const upcomingSessions = sessions.filter(
    (session) => session.status === "scheduled"
  );

  const renderSessionCard = (session: TastingSession) => (
    <Link key={session.id} href={`/sessions/${session.id}`}>
      <Card className="cursor-pointer hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Badge
              variant={session.status === "live" ? "destructive" : "secondary"}
            >
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
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live & Upcoming Sessions</h1>
          <p className="text-muted-foreground mt-2">
            Join expert-led tastings and interactive whisky discussions
          </p>
        </div>
        {user?.experiencePoints && user.experiencePoints >= 1000 && (
          <Link href="/sessions/new">
            <Button>Host a Session</Button>
          </Link>
        )}
      </div>

      {liveSessions.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Video className="h-5 w-5 text-destructive" />
            Live Now
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveSessions.map(renderSessionCard)}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Upcoming Sessions
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcomingSessions.length > 0 ? (
            upcomingSessions.map(renderSessionCard)
          ) : (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardContent className="p-6 text-center text-muted-foreground">
                No upcoming sessions scheduled. Check back later or follow our experts to get notified.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { PreferencesForm } from "@/components/preferences-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Share2, ThumbsUp, GlassWater, Wine } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { WhiskyCard } from "@/components/whisky-card";
import type { Whisky } from "@shared/schema";

interface Recommendation {
  whisky: Whisky;
  reason: string;
  confidence: number;
}

export default function RecommendationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const recommendationMutation = useMutation({
    mutationFn: async (preferences: any) => {
      const response = await apiRequest("POST", "/api/recommendations", preferences);
      return response.json();
    },
    onSuccess: (data) => {
      setRecommendations(data);
      toast({
        title: "Recommendations ready!",
        description: "We've found some whiskies you might love.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>Please sign in to get personalized recommendations.</p>
          <Link href="/auth">
            <Button className="mt-4">Sign In</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-lg bg-primary/5 p-8">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2">
          <div className="h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 text-primary">
            <Wine className="h-8 w-8" />
            <h1 className="text-4xl font-bold">Whisky Recommendations</h1>
          </div>
          <p className="mt-2 text-xl text-muted-foreground max-w-2xl">
            Our AI sommelier will analyze your preferences and curate a selection of
            whiskies perfectly matched to your taste.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[400px,1fr] gap-8">
        <div className="space-y-6">
          <Card className="sticky top-8">
            <CardHeader>
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <GlassWater className="h-5 w-5 text-primary" />
                Your Preferences
              </h2>
            </CardHeader>
            <CardContent>
              <PreferencesForm
                onSubmit={(data) => recommendationMutation.mutate(data)}
                isLoading={recommendationMutation.isPending}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {recommendations.map((rec) => (
            <div key={rec.whisky.id} className="relative">
              <WhiskyCard whisky={rec.whisky} />
              <Badge
                variant="secondary"
                className="absolute top-4 right-4 z-10 bg-primary/10 text-primary border-none"
              >
                {Math.round(rec.confidence * 100)}% Match
              </Badge>
              <Card className="mt-2 p-4 bg-primary/5">
                <p className="text-muted-foreground">{rec.reason}</p>
              </Card>
            </div>
          ))}

          {recommendations.length === 0 && (
            <Card className="bg-primary/5 border-none">
              <CardContent className="p-12 text-center">
                <Wine className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-2">
                  Ready to discover your perfect whisky?
                </h3>
                <p className="text-muted-foreground">
                  Fill out your preferences to get personalized recommendations
                  tailored just for you.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
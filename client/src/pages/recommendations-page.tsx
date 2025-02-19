import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { PreferencesForm } from "@/components/preferences-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/star-rating";
import { Share2, ThumbsUp } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Recommendation {
  whisky: {
    id: number;
    name: string;
    distillery: string;
    type: string;
    region: string;
    price: number;
    tastingNotes: string;
    imageUrl: string;
  };
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
      <div className="text-center">
        <h1 className="text-4xl font-bold">Whisky Recommendations</h1>
        <p className="text-xl text-muted-foreground mt-2">
          Let's find your perfect dram
        </p>
      </div>

      <div className="grid md:grid-cols-[400px,1fr] gap-8">
        <Card className="h-fit">
          <CardHeader>
            <h2 className="text-2xl font-semibold">Your Preferences</h2>
          </CardHeader>
          <CardContent>
            <PreferencesForm
              onSubmit={(data) => recommendationMutation.mutate(data)}
              isLoading={recommendationMutation.isPending}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          {recommendations.map((rec) => (
            <Card key={rec.whisky.id} className="overflow-hidden">
              <div className="md:flex">
                <div className="md:w-1/3">
                  <img
                    src={rec.whisky.imageUrl}
                    alt={rec.whisky.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6 md:w-2/3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-2xl font-semibold">{rec.whisky.name}</h3>
                      <p className="text-muted-foreground">{rec.whisky.distillery}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">${rec.whisky.price}</p>
                      <Badge variant="secondary" className="mt-1">
                        {Math.round(rec.confidence * 100)}% Match
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <Badge>{rec.whisky.type}</Badge>
                    {rec.whisky.region && <Badge variant="outline">{rec.whisky.region}</Badge>}
                  </div>

                  <p className="mt-4 text-muted-foreground">{rec.reason}</p>

                  <div className="mt-6 flex items-center justify-between">
                    <Link href={`/whisky/${rec.whisky.id}`}>
                      <Button>View Details</Button>
                    </Link>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon">
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {recommendations.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Fill out your preferences to get personalized recommendations
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

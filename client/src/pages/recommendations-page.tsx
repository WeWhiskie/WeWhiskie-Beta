import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { PreferencesForm } from "@/components/preferences-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/star-rating";
import { Share2, ThumbsUp, GlassWater, Wine } from "lucide-react";
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
            <Card
              key={rec.whisky.id}
              className="overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="md:flex">
                <div className="md:w-1/3 relative">
                  <div className="aspect-square">
                    <img
                      src={rec.whisky.imageUrl}
                      alt={rec.whisky.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute top-4 right-4">
                    <Badge
                      variant="secondary"
                      className="bg-black/50 backdrop-blur-sm text-white border-none"
                    >
                      ${rec.whisky.price}
                    </Badge>
                  </div>
                </div>
                <div className="p-6 md:w-2/3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-2xl font-semibold">{rec.whisky.name}</h3>
                      <p className="text-muted-foreground">{rec.whisky.distillery}</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary border-none"
                    >
                      {Math.round(rec.confidence * 100)}% Match
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <Badge variant="outline" className="bg-primary/5">
                      {rec.whisky.type}
                    </Badge>
                    {rec.whisky.region && (
                      <Badge variant="outline" className="bg-primary/5">
                        {rec.whisky.region}
                      </Badge>
                    )}
                  </div>

                  <p className="mt-4 text-muted-foreground">{rec.reason}</p>

                  <div className="mt-6 flex items-center justify-between">
                    <Link href={`/whisky/${rec.whisky.id}`}>
                      <Button>View Details</Button>
                    </Link>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="hover:bg-primary/5"
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="hover:bg-primary/5"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
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
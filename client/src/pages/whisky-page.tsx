import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { Whisky } from "@shared/schema";
import { Star, Droplet, Award, Info } from "lucide-react";

export default function WhiskyPage() {
  const { id } = useParams();
  const { data: whisky, isLoading } = useQuery<Whisky>({
    queryKey: ["/api/whiskies", id],
    queryFn: async () => {
      const res = await fetch(`/api/whiskies/${id}`);
      if (!res.ok) throw new Error("Failed to fetch whisky");
      return res.json();
    },
    enabled: !!id,
  });

  if (isLoading || !whisky) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-96 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="aspect-square relative rounded-lg overflow-hidden shadow-xl">
          <img
            src={whisky.imageUrl}
            alt={whisky.name}
            className="object-cover w-full h-full"
          />
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">{whisky.type}</Badge>
              {whisky.limited === 1 && (
                <Badge variant="destructive">Limited Edition</Badge>
              )}
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
              {whisky.name}
            </h1>
            <p className="text-xl text-muted-foreground">{whisky.distillery}</p>
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {whisky.region && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Region
                  </h3>
                  <p className="text-muted-foreground">{whisky.region}</p>
                </CardContent>
              </Card>
            )}
            {whisky.age && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Age
                  </h3>
                  <p className="text-muted-foreground">{whisky.age} Years</p>
                </CardContent>
              </Card>
            )}
            {whisky.abv && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <Droplet className="h-4 w-4" />
                    ABV
                  </h3>
                  <p className="text-muted-foreground">{whisky.abv}%</p>
                </CardContent>
              </Card>
            )}
            {whisky.price && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Price
                  </h3>
                  <p className="text-muted-foreground">${whisky.price}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Description */}
          {whisky.description && (
            <Card>
              <CardContent className="p-4">
                <h2 className="text-xl font-semibold mb-2">Description</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {whisky.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tasting Notes */}
          {whisky.tastingNotes && (
            <Card>
              <CardContent className="p-4">
                <h2 className="text-xl font-semibold mb-4">Tasting Notes</h2>
                <div className="flex flex-wrap gap-2">
                  {whisky.tastingNotes.split(",").map((note: string) => (
                    <Badge
                      key={note}
                      variant="outline"
                      className="bg-primary/5 hover:bg-primary/10"
                    >
                      {note.trim()}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Details */}
          {whisky.caskType && (
            <Card>
              <CardContent className="p-4">
                <h2 className="text-xl font-semibold mb-2">Cask Type</h2>
                <p className="text-muted-foreground">{whisky.caskType}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
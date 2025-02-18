import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "@/components/star-rating";
import { Skeleton } from "@/components/ui/skeleton";

export default function WhiskyPage() {
  const { id } = useParams();
  const { data: whisky, isLoading } = useQuery({
    queryKey: ["/api/whiskies", id],
    queryFn: async () => {
      const res = await fetch(`/api/whiskies/${id}`);
      if (!res.ok) throw new Error("Failed to fetch whisky");
      return res.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
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
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="aspect-square relative">
          <img
            src={whisky.imageUrl}
            alt={whisky.name}
            className="object-cover w-full h-full rounded-lg"
          />
        </div>
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold">{whisky.name}</h1>
            <p className="text-xl text-muted-foreground">{whisky.distillery}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-1">Type</h3>
                <p className="text-muted-foreground">{whisky.type}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-1">Region</h3>
                <p className="text-muted-foreground">{whisky.region}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-1">Age</h3>
                <p className="text-muted-foreground">
                  {whisky.age ? `${whisky.age} Years` : "No Age Statement"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-1">ABV</h3>
                <p className="text-muted-foreground">{whisky.abv}%</p>
              </CardContent>
            </Card>
          </div>

          {whisky.description && (
            <div>
              <h2 className="text-xl font-semibold mb-2">Description</h2>
              <p className="text-muted-foreground">{whisky.description}</p>
            </div>
          )}

          {whisky.tastingNotes && (
            <div>
              <h2 className="text-xl font-semibold mb-2">Tasting Notes</h2>
              <div className="flex flex-wrap gap-2">
                {whisky.tastingNotes.split(",").map((note) => (
                  <span
                    key={note}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    {note.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {whisky.caskType && (
            <div>
              <h2 className="text-xl font-semibold mb-2">Cask Type</h2>
              <p className="text-muted-foreground">{whisky.caskType}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

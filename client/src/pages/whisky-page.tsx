import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Whisky } from "@shared/schema";
import { Star, Droplet, Award, Info, Factory, Wheat } from "lucide-react";

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
          {whisky.price && (
            <div className="absolute top-4 right-4 bg-black/80 text-white px-4 py-2 rounded-full text-lg font-medium">
              ${whisky.price}
            </div>
          )}
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
            {whisky.caskType && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <Wheat className="h-4 w-4" />
                    Cask Type
                  </h3>
                  <p className="text-muted-foreground">{whisky.caskType}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="product" className="space-y-8">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="product">Product</TabsTrigger>
          <TabsTrigger value="tasting">Tasting Notes</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="awards">Awards</TabsTrigger>
          <TabsTrigger value="distillery">Distillery</TabsTrigger>
        </TabsList>

        <TabsContent value="product" className="space-y-6">
          {whisky.description && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-4">About This Whisky</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {whisky.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Production Details */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Production Details</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Technical Info</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Style</dt>
                      <dd className="font-medium">{whisky.type}</dd>
                    </div>
                    {whisky.region && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Region</dt>
                        <dd className="font-medium">{whisky.region}</dd>
                      </div>
                    )}
                    {whisky.caskType && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Cask Type</dt>
                        <dd className="font-medium">{whisky.caskType}</dd>
                      </div>
                    )}
                    {whisky.vintage && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Vintage</dt>
                        <dd className="font-medium">{whisky.vintage}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasting" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-6">Tasting Profile</h2>
              <div className="space-y-8">
                {/* Aroma/Nose */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    Aroma/Nose
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {whisky.aroma || "No aroma information available."}
                  </p>
                </div>

                {/* Palate/Taste */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Palate/Taste</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {whisky.palate || "No palate information available."}
                  </p>
                </div>

                {/* Finish */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Finish</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {whisky.finish || "No finish information available."}
                  </p>
                </div>

                {/* Tasting Notes Tags */}
                {whisky.tastingNotes && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Key Notes</h3>
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
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="awards" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-6">Awards & Recognition</h2>
              <div className="space-y-4">
                {(whisky.awards || []).map((award, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <Award className="h-8 w-8 text-amber-500" />
                    <div>
                      <h3 className="font-semibold">{award.name}</h3>
                      <p className="text-muted-foreground">{award.description}</p>
                    </div>
                  </div>
                ))}
                {/* Placeholder awards */}
                {!(whisky.awards || []).length && (
                  <p className="text-muted-foreground">No awards information available.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distillery" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-6">About The Distillery</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4">History</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {whisky.distilleryHistory || "No distillery history information available."}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Production</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Founded</dt>
                      <dd className="font-medium">{whisky.founded || "N/A"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Location</dt>
                      <dd className="font-medium">{whisky.region || "N/A"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Water Source</dt>
                      <dd className="font-medium">{whisky.waterSource || "N/A"}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
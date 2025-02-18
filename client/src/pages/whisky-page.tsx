import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PreciseRating } from "@/components/precise-rating";
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
      {/* Hero Section with Background Image */}
      <div className="relative w-full h-[600px] mb-12 overflow-hidden rounded-xl">
        {/* Black and white distillery background */}
        <div 
          className="absolute inset-0 bg-center bg-cover grayscale"
          style={{ 
            backgroundImage: `url(https://images.unsplash.com/photo-1630344745900-b5385f94f360)`,
          }}
        >
          {/* Dark overlay for better contrast */}
          <div className="absolute inset-0 bg-black/50" />
        </div>

        {/* Content overlay with bottle image and details */}
        <div className="relative h-full container mx-auto px-4 flex items-center">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Bottle Image */}
            <div className="relative z-10 transform -translate-y-8">
              <img
                src={whisky.imageUrl}
                alt={whisky.name}
                className="object-contain h-[500px] drop-shadow-2xl"
              />
            </div>

            {/* Whisky Details */}
            <div className="text-white space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{whisky.type}</Badge>
                  {whisky.limited === 1 && (
                    <Badge variant="destructive">Limited Edition</Badge>
                  )}
                </div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
                  {whisky.name}
                </h1>
                <p className="text-2xl text-white/80">{whisky.distillery}</p>
              </div>

              {/* Price Tag */}
              {whisky.price && (
                <div className="inline-block bg-black/80 text-white px-6 py-3 rounded-full text-xl font-medium">
                  ${whisky.price}
                </div>
              )}

              {/* Rating Section */}
              <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 space-y-4">
                <h3 className="text-xl font-semibold">Rate this Whisky</h3>
                <PreciseRating
                  maxStars={10}
                  onChange={(rating) => {
                    console.log("New rating:", rating);
                    // TODO: Implement rating submission
                  }}
                />
              </div>
            </div>
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
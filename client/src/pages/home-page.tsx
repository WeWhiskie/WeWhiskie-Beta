import { useQuery } from "@tanstack/react-query";
import { ReviewCard } from "@/components/review-card";
import { ReviewForm } from "@/components/review-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Plus, Search, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import type { Whisky } from "@shared/schema";

export default function HomePage() {
  const [showForm, setShowForm] = useState(false);
  const { data: reviews = [] } = useQuery({
    queryKey: ["/api/reviews"],
  });

  const { data: whiskies = [] } = useQuery<Whisky[]>({
    queryKey: ["/api/whiskies"],
  });

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
          Whiskie
        </h1>
        <p className="text-xl text-muted-foreground">
          Better Together - Share your love of whisky with enthusiasts worldwide
        </p>
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
        <h2 className="text-2xl font-bold mb-4">Featured Whiskies</h2>
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
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Reviews Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Recent Reviews</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      </div>
    </div>
  );
}
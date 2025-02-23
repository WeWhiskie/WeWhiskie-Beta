import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import type { Whisky } from "@shared/schema";

interface WhiskyCardProps {
  whisky: Whisky;
  className?: string;
}

export function WhiskyCard({ whisky, className = "" }: WhiskyCardProps) {
  return (
    <Link href={`/whisky/${whisky.id}`}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={className}
      >
        <Card className="overflow-hidden cursor-pointer transition-shadow hover:shadow-lg bg-card">
          <div className="aspect-[4/3] relative">
            <img
              src={whisky.image_url}
              alt={whisky.name}
              className="object-cover w-full h-full"
            />
            {whisky.price && (
              <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                ${whisky.price}
              </div>
            )}
            {whisky.limited === 1 && (
              <Badge className="absolute top-4 left-4" variant="destructive">
                Limited Edition
              </Badge>
            )}
          </div>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg line-clamp-1">{whisky.name}</h3>
                {whisky.abv && (
                  <span className="text-sm text-muted-foreground">
                    {whisky.abv}% ABV
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{whisky.distillery}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
                  {whisky.type}
                </Badge>
                {whisky.region && (
                  <Badge variant="outline" className="bg-primary/5">
                    {whisky.region}
                  </Badge>
                )}
                {whisky.age && (
                  <Badge variant="outline" className="bg-primary/5">
                    {whisky.age} Years
                  </Badge>
                )}
              </div>
              {whisky.tasting_notes && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {whisky.tasting_notes}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}

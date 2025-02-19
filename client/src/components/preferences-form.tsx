import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Flame, Wine, Droplet, Apple, Flower2, 
  Sparkles, Coffee, TreePine, Cookie, Candy, 
  Banana, Compass, Citrus, X 
} from "lucide-react";
import { cn } from "@/lib/utils";

const preferencesSchema = z.object({
  flavors: z.array(z.string()).min(1, "Select at least one flavor profile"),
  priceRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
  }),
  preferred_types: z.array(z.string()).min(1, "Select at least one whisky type"),
  experience_level: z.enum(["beginner", "intermediate", "expert"]),
});

type PreferencesData = z.infer<typeof preferencesSchema>;

const FLAVOR_OPTIONS = [
  { id: "Smoky", icon: <Flame className="h-4 w-4" /> },
  { id: "Peaty", icon: <Droplet className="h-4 w-4" /> },
  { id: "Fruity", icon: <Apple className="h-4 w-4" /> },
  { id: "Floral", icon: <Flower2 className="h-4 w-4" /> },
  { id: "Spicy", icon: <Flame className="h-4 w-4" /> },
  { id: "Sweet", icon: <Candy className="h-4 w-4" /> },
  { id: "Vanilla", icon: <Cookie className="h-4 w-4" /> },
  { id: "Woody", icon: <TreePine className="h-4 w-4" /> },
  { id: "Nutty", icon: <Cookie className="h-4 w-4" /> },
  { id: "Caramel", icon: <Candy className="h-4 w-4" /> },
  { id: "Honey", icon: <Sparkles className="h-4 w-4" /> },
  { id: "Chocolate", icon: <Coffee className="h-4 w-4" /> },
  { id: "Maritime", icon: <Compass className="h-4 w-4" /> },
  { id: "Citrus", icon: <Citrus className="h-4 w-4" /> },
];

const WHISKY_TYPES = [
  { id: "Single Malt Scotch", icon: <Wine className="h-4 w-4" /> },
  { id: "Blended Scotch", icon: <Wine className="h-4 w-4" /> },
  { id: "Irish", icon: <Wine className="h-4 w-4" /> },
  { id: "Bourbon", icon: <Wine className="h-4 w-4" /> },
  { id: "Rye", icon: <Wine className="h-4 w-4" /> },
  { id: "Japanese", icon: <Wine className="h-4 w-4" /> },
  { id: "Canadian", icon: <Wine className="h-4 w-4" /> },
];

interface PreferencesFormProps {
  onSubmit: (data: PreferencesData) => void;
  isLoading?: boolean;
}

export function PreferencesForm({ onSubmit, isLoading }: PreferencesFormProps) {
  const form = useForm<PreferencesData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      flavors: [],
      priceRange: { min: 30, max: 200 },
      preferred_types: [],
      experience_level: "beginner",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="flavors"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold">Flavor Profiles</FormLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {FLAVOR_OPTIONS.map((flavor) => (
                  <Badge
                    key={flavor.id}
                    variant={field.value.includes(flavor.id) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer hover:bg-primary/90 transition-colors py-3",
                      field.value.includes(flavor.id) && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => {
                      if (field.value.includes(flavor.id)) {
                        field.onChange(field.value.filter((f) => f !== flavor.id));
                      } else {
                        field.onChange([...field.value, flavor.id]);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {flavor.icon}
                      {flavor.id}
                    </div>
                  </Badge>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="preferred_types"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold">Preferred Whisky Types</FormLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {WHISKY_TYPES.map((type) => (
                  <Badge
                    key={type.id}
                    variant={field.value.includes(type.id) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer hover:bg-primary/90 transition-colors py-3",
                      field.value.includes(type.id) && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => {
                      if (field.value.includes(type.id)) {
                        field.onChange(field.value.filter((t) => t !== type.id));
                      } else {
                        field.onChange([...field.value, type.id]);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {type.icon}
                      {type.id}
                    </div>
                  </Badge>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priceRange"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold">Price Range (USD)</FormLabel>
              <div className="space-y-4">
                <div className="h-2 bg-secondary rounded-full relative">
                  <div
                    className="absolute h-full bg-primary rounded-full"
                    style={{
                      left: `${(field.value.min / 1000) * 100}%`,
                      right: `${100 - (field.value.max / 1000) * 100}%`,
                    }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={1000}
                    value={field.value.min}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (value <= field.value.max) {
                        field.onChange({ ...field.value, min: value });
                      }
                    }}
                    className="absolute w-full h-full opacity-0 cursor-pointer"
                  />
                  <input
                    type="range"
                    min={0}
                    max={1000}
                    value={field.value.max}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (value >= field.value.min) {
                        field.onChange({ ...field.value, max: value });
                      }
                    }}
                    className="absolute w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>${field.value.min}</span>
                  <span>${field.value.max}</span>
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="experience_level"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold">Experience Level</FormLabel>
              <div className="grid grid-cols-3 gap-2">
                {["beginner", "intermediate", "expert"].map((level) => (
                  <Badge
                    key={level}
                    variant={field.value === level ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer hover:bg-primary/90 transition-colors py-3",
                      field.value === level && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => field.onChange(level)}
                  >
                    <span className="capitalize">{level}</span>
                  </Badge>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
          size="lg"
        >
          {isLoading ? "Finding your perfect dram..." : "Get Recommendations"}
        </Button>
      </form>
    </Form>
  );
}
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

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
  "Smoky", "Peaty", "Fruity", "Floral", "Spicy", "Sweet", "Vanilla", "Woody",
  "Nutty", "Caramel", "Honey", "Chocolate", "Maritime", "Citrus"
];

const WHISKY_TYPES = [
  "Single Malt Scotch", "Blended Scotch", "Irish", "Bourbon", "Rye",
  "Japanese", "Canadian"
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="flavors"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Flavor Profiles</FormLabel>
              <Select
                onValueChange={(value) => {
                  if (!field.value.includes(value)) {
                    field.onChange([...field.value, value]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select flavors" />
                </SelectTrigger>
                <SelectContent>
                  {FLAVOR_OPTIONS.map((flavor) => (
                    <SelectItem key={flavor} value={flavor}>
                      {flavor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2 mt-2">
                {field.value.map((flavor) => (
                  <Badge
                    key={flavor}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => {
                      field.onChange(field.value.filter((f) => f !== flavor));
                    }}
                  >
                    {flavor}
                    <X className="ml-1 h-3 w-3" />
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
              <FormLabel>Price Range (USD)</FormLabel>
              <div className="space-y-4">
                <Slider
                  min={0}
                  max={1000}
                  step={10}
                  value={[field.value.min, field.value.max]}
                  onValueChange={([min, max]) => {
                    field.onChange({ min, max });
                  }}
                />
                <div className="flex justify-between text-sm">
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
          name="preferred_types"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred Whisky Types</FormLabel>
              <Select
                onValueChange={(value) => {
                  if (!field.value.includes(value)) {
                    field.onChange([...field.value, value]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select whisky types" />
                </SelectTrigger>
                <SelectContent>
                  {WHISKY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2 mt-2">
                {field.value.map((type) => (
                  <Badge
                    key={type}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => {
                      field.onChange(field.value.filter((t) => t !== type));
                    }}
                  >
                    {type}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
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
              <FormLabel>Experience Level</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your experience level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          Get Recommendations
        </Button>
      </form>
    </Form>
  );
}

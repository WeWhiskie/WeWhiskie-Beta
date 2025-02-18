import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertReviewSchema } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StarRating } from "./star-rating";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type FormData = {
  whiskyId: string;
  rating: number;
  content: string;
};

export function ReviewForm() {
  const { toast } = useToast();
  const { data: whiskies } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/whiskies"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(
      insertReviewSchema.omit({ userId: true }).extend({
        whiskyId: insertReviewSchema.shape.whiskyId,
      }),
    ),
    defaultValues: {
      content: "",
      rating: 0,
    },
  });

  const createReview = useMutation({
    mutationFn: async (data: FormData) => {
      await apiRequest("POST", "/api/reviews", {
        ...data,
        whiskyId: parseInt(data.whiskyId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      form.reset();
      toast({
        title: "Review posted!",
        description: "Your review has been shared with the community.",
      });
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => createReview.mutate(data))}
        className="space-y-6"
      >
        <FormField
          control={form.control}
          name="whiskyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Whisky</FormLabel>
              <Select onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a whisky" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {whiskies?.map((whisky) => (
                    <SelectItem key={whisky.id} value={whisky.id.toString()}>
                      {whisky.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rating</FormLabel>
              <FormControl>
                <StarRating
                  rating={field.value}
                  onRate={(rating) => field.onChange(rating)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Review</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Share your thoughts about this whisky..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={createReview.isPending}
        >
          Post Review
        </Button>
      </form>
    </Form>
  );
}

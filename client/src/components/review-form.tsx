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
import { Input } from "@/components/ui/input";
import { PreciseRating } from "./precise-rating";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import { SharePopup } from "./share-popup";
import { useState } from "react";

type FormData = {
  whiskyId: string; // Changed to string for Select compatibility
  rating: number;
  content: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  mediaFile?: FileList;
};

export function ReviewForm() {
  const { toast } = useToast();
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [lastReviewData, setLastReviewData] = useState<{
    title: string;
    text: string;
    url: string;
  } | null>(null);

  const { data: whiskies } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/whiskies"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(
      insertReviewSchema.omit({ userId: true, likes: true }).extend({
        whiskyId: insertReviewSchema.shape.whiskyId.transform(String),
        mediaFile: insertReviewSchema.shape.videoUrl.optional(),
      })
    ),
    defaultValues: {
      content: "",
      rating: 0,
    },
  });

  const createReview = useMutation({
    mutationFn: async (data: FormData) => {
      const formData = new FormData();
      formData.append('whiskyId', String(data.whiskyId));
      formData.append('rating', String(data.rating));
      formData.append('content', data.content);

      if (data.mediaFile?.[0]) {
        formData.append('media', data.mediaFile[0]);
      }

      const response = await fetch('/api/reviews', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create review');
      }

      const reviewData = await response.json();
      return { reviewData, whiskyName: whiskies?.find(w => w.id === Number(data.whiskyId))?.name };
    },
    onError: (error: Error) => {
      console.error('Review creation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to post review. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: ({ reviewData, whiskyName }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      form.reset();
      toast({
        title: "Review posted!",
        description: "Your review has been shared with the community.",
      });

      const shareUrl = `${window.location.origin}/review/${reviewData.id}`;
      setLastReviewData({
        title: `${whiskyName} Review`,
        text: `Check out my ${reviewData.rating}⭐️ review of ${whiskyName} on WeWhiskie!`,
        url: shareUrl,
      });
      setShowSharePopup(true);
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createReview.mutate(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
          <FormField
            control={form.control}
            name="whiskyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Whisky</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a whisky" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {whiskies?.map((whisky) => (
                      <SelectItem key={whisky.id} value={String(whisky.id)}>
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
                  <PreciseRating
                    maxStars={10}
                    initialRating={field.value}
                    onChange={field.onChange}
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

          <FormField
            control={form.control}
            name="mediaFile"
            render={({ field: { onChange, value, ...field } }) => (
              <FormItem>
                <FormLabel>Add Photo or Video</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => onChange(e.target.files)}
                      className="flex-1"
                      {...field}
                    />
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
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
            {createReview.isPending ? "Posting..." : "Post Review"}
          </Button>
        </form>
      </Form>

      {lastReviewData && (
        <SharePopup
          open={showSharePopup}
          onOpenChange={setShowSharePopup}
          title={lastReviewData.title}
          text={lastReviewData.text}
          url={lastReviewData.url}
          hideButton
        />
      )}
    </>
  );
}
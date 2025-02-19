import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SharePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data: sharedContent, isLoading } = useQuery({
    queryKey: ['/api/share', id],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sharedContent) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Content Not Found</h1>
        <p className="text-muted-foreground">
          The shared content you're looking for might have been removed or is no longer available.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Shared Whisky Experience</h1>
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">{sharedContent.title}</h2>
        <div className="space-y-4">
          <p className="text-muted-foreground">{sharedContent.description}</p>
          {/* Add more content display based on the shared data structure */}
        </div>
      </Card>
    </div>
  );
}
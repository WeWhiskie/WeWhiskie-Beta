import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export default function SharePage() {
  const { id } = useParams();

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
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Shared Whisky Experience</h1>
      <div className="bg-card rounded-lg shadow-lg p-6">
        {/* Content will be implemented based on the sharing requirements */}
        <p className="text-muted-foreground">Shared content ID: {id}</p>
      </div>
    </div>
  );
}

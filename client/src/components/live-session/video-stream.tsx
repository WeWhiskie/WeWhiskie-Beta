import { useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface VideoStreamProps {
  stream: MediaStream | null;
  isLoading?: boolean;
}

export function VideoStream({ stream, isLoading }: VideoStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (isLoading) {
    return <Skeleton className="w-full aspect-video rounded-lg" />;
  }

  return (
    <Card className="overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full aspect-video object-cover"
      />
    </Card>
  );
}

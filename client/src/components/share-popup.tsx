import { Twitter, Facebook, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { shareToSocial } from "@/lib/social-sharing";
import { useToast } from "@/hooks/use-toast";

interface SharePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  text: string;
  url: string;
}

export function SharePopup({ open, onOpenChange, title, text, url }: SharePopupProps) {
  const { toast } = useToast();

  const handleShare = async (platform: 'twitter' | 'facebook' | 'linkedin') => {
    try {
      await shareToSocial(platform, {
        title,
        text,
        url,
        hashtags: ['WeWhiskie', 'WhiskyLover'],
      });

      toast({
        title: "Shared successfully!",
        description: `Your review has been shared to ${platform}.`,
      });
    } catch (error) {
      toast({
        title: "Share failed",
        description: "Unable to share your review. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share your review</DialogTitle>
          <DialogDescription>
            Share your whisky experience with your social network
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-4 py-6">
          <Button
            size="lg"
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => handleShare('twitter')}
          >
            <Twitter className="h-5 w-5 text-sky-500" />
            Twitter
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => handleShare('facebook')}
          >
            <Facebook className="h-5 w-5 text-blue-600" />
            Facebook
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => handleShare('linkedin')}
          >
            <Linkedin className="h-5 w-5 text-blue-700" />
            LinkedIn
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

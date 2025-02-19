import { Twitter, Facebook, Linkedin, Copy, Share2 } from "lucide-react";
import { SiInstagram, SiTiktok } from "react-icons/si";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { shareToSocial } from "@/lib/social-sharing";
import { useToast } from "@/hooks/use-toast";

interface SharePopupProps {
  title: string;
  text: string;
  url: string;
  triggerClassName?: string;
  triggerText?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideButton?: boolean;
}

export function SharePopup({ 
  title, 
  text, 
  url, 
  triggerClassName, 
  triggerText = "Share",
  open,
  onOpenChange,
  hideButton = false
}: SharePopupProps) {
  const { toast } = useToast();

  const handleShare = async (platform: 'twitter' | 'facebook' | 'linkedin' | 'instagram' | 'tiktok') => {
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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: "Review link has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy the link. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!hideButton && (
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={triggerClassName}
          >
            <Share2 className="h-4 w-4 mr-2" />
            {triggerText}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Review</DialogTitle>
          <DialogDescription>
            Share this review with your social network
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-6">
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
          <Button
            size="lg"
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => handleShare('instagram')}
          >
            <SiInstagram className="h-5 w-5 text-pink-600" />
            Instagram
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => handleShare('tiktok')}
          >
            <SiTiktok className="h-5 w-5" />
            TikTok
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleCopyLink}
          >
            <Copy className="h-5 w-5" />
            Copy Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
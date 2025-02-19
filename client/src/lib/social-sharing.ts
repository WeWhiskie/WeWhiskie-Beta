type SocialPlatform = 'twitter' | 'facebook' | 'linkedin';

interface ShareOptions {
  title: string;
  text: string;
  url: string;
  hashtags?: string[];
  via?: string;
}

const PLATFORM_URLS = {
  twitter: 'https://twitter.com/intent/tweet',
  facebook: 'https://www.facebook.com/sharer/sharer.php',
  linkedin: 'https://www.linkedin.com/shareArticle'
};

export async function shareToSocial(platform: SocialPlatform, options: ShareOptions) {
  const url = new URL(PLATFORM_URLS[platform]);
  
  switch (platform) {
    case 'twitter':
      url.searchParams.append('text', options.text);
      url.searchParams.append('url', options.url);
      if (options.hashtags?.length) {
        url.searchParams.append('hashtags', options.hashtags.join(','));
      }
      if (options.via) {
        url.searchParams.append('via', options.via);
      }
      break;
      
    case 'facebook':
      url.searchParams.append('u', options.url);
      url.searchParams.append('quote', options.text);
      break;
      
    case 'linkedin':
      url.searchParams.append('url', options.url);
      url.searchParams.append('title', options.title);
      url.searchParams.append('summary', options.text);
      break;
  }
  
  const windowFeatures = 'width=550,height=400,resizable=yes,scrollbars=yes';
  window.open(url.toString(), `share_${platform}`, windowFeatures);
  
  try {
    // Track share event
    await fetch('/api/share-analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform,
        url: options.url,
        title: options.title
      })
    });
  } catch (error) {
    console.error('Failed to track share:', error);
  }
}

export function generateShareText(content: {
  type: 'review' | 'whisky' | 'tasting_note';
  title: string;
  rating?: number;
  distillery?: string;
}): string {
  switch (content.type) {
    case 'review':
      return `Check out my ${content.rating}⭐️ review of ${content.title} on WeWhiskie!`;
    case 'whisky':
      return `Discovered ${content.title} from ${content.distillery} on WeWhiskie - the ultimate whisky community!`;
    case 'tasting_note':
      return `My tasting notes for ${content.title} on WeWhiskie. Join the conversation!`;
    default:
      return `Check this out on WeWhiskie!`;
  }
}

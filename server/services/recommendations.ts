import { huggingFaceClient } from "./huggingface-client";
import { storage } from "../storage";
import type { Whisky, Review } from "@shared/schema";
import type { ConciergePersonality } from "./ai-concierge";
import { createHash } from 'crypto';

// Enhanced error handling
class WhiskyAIError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'WhiskyAIError';
  }
}

// Improved request queue with concurrent request handling
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private readonly MAX_CONCURRENT = 3;
  private currentConcurrent = 0;

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.currentConcurrent--;
          this.processQueue();
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.currentConcurrent >= this.MAX_CONCURRENT) return;
    this.processing = true;

    while (this.queue.length > 0 && this.currentConcurrent < this.MAX_CONCURRENT) {
      const request = this.queue.shift();
      if (request) {
        this.currentConcurrent++;
        try {
          await request();
        } catch (error) {
          console.error('Error processing queued request:', error);
        }
      }
    }

    this.processing = false;
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }
}

// Enhanced caching
class ResponseCache {
  private cache: Map<string, { response: any; timestamp: number }> = new Map();
  private readonly TTL = 1000 * 60 * 30; // 30 minutes cache

  private generateKey(prompt: string, context: any = {}): string {
    const sanitizedContext = {
      ...context,
      userId: context.userId,
      collectionIds: context.collectionIds
    };
    const data = JSON.stringify({ prompt, context: sanitizedContext });
    return createHash('md5').update(data).digest('hex');
  }

  get(prompt: string, context?: any): any {
    const key = this.generateKey(prompt, context);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.TTL) {
      console.log('Cache hit for prompt:', prompt.substring(0, 50) + '...');
      return cached.response;
    }

    return null;
  }

  set(prompt: string, response: any, context?: any): void {
    const key = this.generateKey(prompt, context);
    this.cache.set(key, {
      response,
      timestamp: Date.now()
    });
    console.log('Cached response for prompt:', prompt.substring(0, 50) + '...');
  }
}

const requestQueue = new RequestQueue();
const responseCache = new ResponseCache();

interface WhiskyRecommendation {
  whisky: Whisky;
  reason: string;
  confidence: number;
  educationalContent?: {
    history?: string;
    production?: string;
    tastingNotes?: string;
    pairingAdvice?: string;
  };
}

interface ConciergeResponse {
  recommendations?: WhiskyRecommendation[];
  answer?: string;
  suggestedTopics?: string[];
}

async function processAIResponse(prompt: string, requestContext?: any): Promise<any> {
  try {
    const cachedResponse = responseCache.get(prompt, requestContext);
    if (cachedResponse) {
      return cachedResponse;
    }

    const response = await requestQueue.add(async () => {
      const formattedPrompt = `${prompt}\n\nFormat the response as a JSON object with fields: answer (string), recommendations (optional), and suggestedTopics (string[] optional).`;

      const generatedText = await huggingFaceClient.generateResponse(formattedPrompt);
      try {
        // Enhanced JSON extraction with better error handling
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          try {
            const parsed = JSON.parse(jsonStr);
            // Validate response structure
            if (!parsed.answer && !parsed.recommendations) {
              throw new Error("Invalid response structure");
            }
            return parsed;
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            // Fallback: Convert text response to proper JSON format
            return {
              answer: generatedText.trim(),
              suggestedTopics: ["General whisky discussion", "Whisky recommendations", "Tasting notes"]
            };
          }
        }

        // If no JSON found, format the text response
        return {
          answer: generatedText.trim(),
          suggestedTopics: ["General whisky discussion", "Whisky recommendations", "Tasting notes"]
        };
      } catch (error) {
        console.error('Error processing AI response:', error);
        return {
          answer: "I apologize, but I'm having trouble processing your request at the moment. Could you please try again?",
          suggestedTopics: ["General whisky discussion", "Whisky recommendations", "Tasting notes"]
        };
      }
    });

    responseCache.set(prompt, response, requestContext);
    return response;
  } catch (error) {
    console.error('Error in processAIResponse:', error);
    throw new WhiskyAIError(
      "Failed to process AI response",
      "PROCESSING_ERROR"
    );
  }
}

export async function getWhiskyRecommendations(
  preferences: {
    flavors: string[];
    priceRange: { min: number; max: number };
    preferred_types: string[];
    experience_level: string;
  },
  userId: number
): Promise<WhiskyRecommendation[]> {
  try {
    const whiskies = await storage.getWhiskies();
    const userReviews = await storage.getUserReviews(userId);

    const prompt = `As a master whisky educator and concierge, recommend 3 whiskies from the following list based on these preferences:
    - Preferred flavors: ${preferences.flavors.join(', ')}
    - Price range: $${preferences.priceRange.min} - $${preferences.priceRange.max}
    - Preferred types: ${preferences.preferred_types.join(', ')}
    - Experience level: ${preferences.experience_level}

    User's previous reviews:
    ${userReviews.map(review => `- ${review.whisky.name}: ${review.rating}/5 stars`).join('\n')}

    Available whiskies:
    ${whiskies.map(w => `- ${w.name} (${w.type}, $${w.price}, ${w.tastingNotes})`).join('\n')}

    Format the response as a JSON object with recommendations array containing objects with whiskyId, reason, confidence, and educationalContent fields.`;

    const result = await processAIResponse(prompt);

    const recommendations: WhiskyRecommendation[] = await Promise.all(
      (result.recommendations || []).map(async (rec: any) => {
        const whisky = whiskies.find(w => w.id === rec.whiskyId);
        if (!whisky) {
          throw new WhiskyAIError(
            `Whisky recommendation not found`,
            "INVALID_RECOMMENDATION"
          );
        }
        return {
          whisky,
          reason: rec.reason,
          confidence: rec.confidence,
          educationalContent: rec.educationalContent
        };
      })
    );

    return recommendations;
  } catch (error) {
    console.error('Error generating recommendations:', error);
    throw new WhiskyAIError(
      "Failed to generate whisky recommendations",
      "RECOMMENDATION_ERROR"
    );
  }
}

// Themed responses for different personalities
const getThemedResponse = (personality?: ConciergePersonality) => {
  const responses = {
    highland: {
      answer: "Ach, let me gather my thoughts while I nose this dram. In my 40 years at Highland Park, I learned that patience reveals the finest notes. Speaking of which, shall we explore the noble Highland malts?",
      suggestedTopics: ["Highland whisky characteristics", "Age statements", "Cask influence"]
    },
    speyside: {
      answer: "While I check my notes, let me tell you about the magic of Speyside. As we say in Dufftown, 'Rome was built on seven hills, but Dufftown stands on seven stills!' Shall we explore these legendary distilleries?",
      suggestedTopics: ["Speyside distilleries", "Water influence", "Fruity notes"]
    },
    islay: {
      answer: "By the roar of the Atlantic! While I gather my thoughts, let's talk about how the sea shapes our island's mighty drams. Have you experienced the maritime magic of Islay malts?",
      suggestedTopics: ["Islay peat", "Coastal influence", "Smoky profiles"]
    }
  };

  const defaultStyle = personality?.accent?.toLowerCase().includes('highland') ? 'highland' :
                      personality?.accent?.toLowerCase().includes('speyside') ? 'speyside' : 'islay';

  const response = responses[defaultStyle];
  return {
    answer: personality?.catchphrase ? personality?.catchphrase + " " + response.answer : response.answer,
    suggestedTopics: response.suggestedTopics
  };
};

export async function generateConciergeName(preferences?: {
  style?: "funny" | "professional" | "casual";
  theme?: string;
}): Promise<string> {
  try {
    const prompt = `Generate a creative and ${preferences?.style || 'friendly'} name for a whisky concierge/expert. 
    ${preferences?.theme ? `Incorporate the theme: ${preferences.theme}` : ''}
    The name should be memorable, unique, and reflect expertise in whisky.
    Format response as JSON with a "name" field.`;

    const result = await processAIResponse(prompt);
    return result.name || "Whisky Pete";
  } catch (error) {
    console.error('Error generating concierge name:', error);
    return "Whisky Pete";
  }
}

export async function generateConciergePersonality(
  name: string,
  style: "funny" | "professional" | "casual" = "casual"
): Promise<ConciergePersonality> {
  try {
    const prompt = `Create a detailed personality profile for a whisky expert named "${name}". 
    Style: ${style}

    Include:
    1. A unique accent and origin story
    2. Distinct personality traits
    3. Background in whisky industry
    4. Areas of expertise
    5. A signature catchphrase
    6. Description of their voice
    7. A vivid description for their avatar

    Format response as JSON with fields: name, accent, background, personality, avatarDescription, voiceDescription, specialties (array), and catchphrase.`;

    const result = await processAIResponse(prompt);

    if (!result.name || !result.accent || !result.background) {
      throw new WhiskyAIError(
        "Invalid personality generation response",
        "INVALID_PERSONALITY"
      );
    }

    return result;
  } catch (error) {
    console.error('Error generating concierge personality:', error);
    const fallbackPersonalities = [
      {
        name,
        accent: "Highland Scots",
        background: "Former master distiller at Highland Park with 40 years of experience",
        personality: "Warm, witty, and full of spirited tales from the distilleries",
        avatarDescription: "Silver-haired gentleman in a tweed jacket with a thistle pin",
        voiceDescription: "Rich, resonant Highland accent with a melodic lilt",
        specialties: ["Highland Single Malts", "Whisky Maturation", "Cask Selection"],
        catchphrase: "Let the spirit guide us! Slàinte mhath!"
      }
    ];

    return fallbackPersonalities[0];
  }
}

export async function getWhiskyConciergeResponse(
  query: string,
  context: {
    userId: number;
    collectionIds?: number[];
    previousInteractions?: { query: string; response: string }[];
    personality?: ConciergePersonality;
  }
): Promise<ConciergeResponse> {
  try {
    // Quick response for common queries using regex patterns
    const quickResponses = new Map([
      [/\b(hi|hello|hey)\b/i, {
        answer: "Hello! I'm your whisky concierge. How may I assist you today?",
        suggestedTopics: ["Whisky recommendations", "Tasting tips", "Whisky regions"]
      }],
      [/\bhelp\b/i, {
        answer: "I'm here to help! I can assist you with whisky recommendations, tasting notes, or answer any questions about whisky.",
        suggestedTopics: ["Get personalized recommendations", "Learn about tasting", "Explore whisky types"]
      }]
    ]);

    // Check for quick responses first
    for (const [pattern, response] of quickResponses.entries()) {
      if (pattern.test(query.toLowerCase())) {
        return response;
      }
    }

    const whiskies = await storage.getWhiskies();
    const userReviews = await storage.getUserReviews(context.userId);

    let collectionWhiskies: Whisky[] = [];
    if (context.collectionIds?.length) {
      collectionWhiskies = whiskies.filter(w => context.collectionIds?.includes(w.id));
    }

    const personalityContext = context.personality
      ? `You are ${context.personality.name}, speaking with a ${context.personality.accent} accent. 
         Your background: ${context.personality.background}
         Your personality: ${context.personality.personality}
         Your catchphrase: ${context.personality.catchphrase}
         Stay in character and occasionally use your catchphrase.`
      : "You are a friendly whisky expert";

    const prompt = `As a whisky concierge, help answer this query: "${query}"

Collection information:
${collectionWhiskies.map(w => `- ${w.name} (${w.type}, ${w.tastingNotes})`).join('\n')}

User's previous ratings:
${userReviews.map(review => `- ${review.whisky.name}: ${review.rating}/5 stars`).join('\n')}

${personalityContext}`;

    try {
      return await processAIResponse(prompt, context);
    } catch (error) {
      console.error('Error with whisky concierge:', error);
      return getThemedResponse(context.personality);
    }
  } catch (error) {
    console.error('Error with whisky concierge:', error);
    return getThemedResponse(context.personality);
  }
}
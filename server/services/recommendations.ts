import OpenAI from "openai";
import { storage } from "../storage";
import type { Whisky, Review } from "@shared/schema";
import type { ConciergePersonality } from "./ai-concierge";
import { createHash } from 'crypto';

// Initialize OpenAI with proper configuration
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 2,
  timeout: 12000, // Reduced timeout for faster fallback
  defaultHeaders: { 'Whisky-Bot-Version': '1.0' },
  defaultQuery: { stream: false }
});

// Add connection checking
const checkOpenAIConnection = async () => {
  try {
    await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "test" }],
      max_tokens: 5
    });
    return true;
  } catch (error) {
    console.error('OpenAI connection test failed:', error);
    return false;
  }
};

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
  private readonly MAX_CONCURRENT = 3; // Increased concurrent requests
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
          this.processQueue(); // Process next request after completion
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

// Enhanced caching with smarter key generation and shorter TTL
class ResponseCache {
  private cache: Map<string, { response: any; timestamp: number }> = new Map();
  private readonly TTL = 1000 * 60 * 30; // 30 minutes cache to ensure fresher responses

  private generateKey(prompt: string, context: any = {}): string {
    const sanitizedContext = {
      ...context,
      userId: context.userId, // Only include essential context
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
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

// Enhanced OpenAI request handler with better error recovery
async function makeOpenAIRequest(prompt: string, retryCount = 0): Promise<any> {
  console.log('Making OpenAI request:', prompt.substring(0, 50) + '...');

  // Check cache first
  const cachedResponse = responseCache.get(prompt);
  if (cachedResponse) {
    return cachedResponse;
  }

  return requestQueue.add(async () => {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        response_format: { type: "json_object" },
        max_tokens: 500,
        presence_penalty: 0.6, // Added to encourage more diverse responses
        frequency_penalty: 0.1
      });

      if (!response.choices[0].message.content) {
        throw new Error("Empty response from AI service");
      }

      const parsedResponse = JSON.parse(response.choices[0].message.content);
      responseCache.set(prompt, parsedResponse);
      return parsedResponse;
    } catch (error: any) {
      console.error('OpenAI request error:', error);

      if (error.status === 429 || (error.message && error.message.includes('rate'))) {
        if (retryCount < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
          console.log(`Rate limit hit, retrying in ${delay}ms...`);
          await sleep(delay);
          return makeOpenAIRequest(prompt, retryCount + 1);
        }
      }

      // Enhanced themed conversation handlers with personality-driven responses
      const getThemedResponse = (personality?: ConciergePersonality) => {
        const responses = [
          {
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
          }
        ];

        const defaultStyle = personality?.accent?.toLowerCase().includes('highland') ? 'highland' : 
                           personality?.accent?.toLowerCase().includes('speyside') ? 'speyside' : 'islay';
        
        const response = responses[Math.floor(Math.random() * responses.length)][defaultStyle];
        return {
          answer: personality?.catchphrase + " " + response.answer,
          suggestedTopics: response.suggestedTopics
        };
      };

      const fallbackResponses = getThemedResponse(context?.personality);

      const randomIndex = Math.floor(Math.random() * fallbackResponses.length);
      return fallbackResponses[randomIndex];
    }
  });
}

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

    For each recommendation, provide:
    1. A personalized reason why this whisky matches their preferences
    2. Educational content about the whisky's history and production
    3. Detailed tasting notes and how to best appreciate them
    4. Food pairing suggestions
    5. A confidence score (0-1) based on preference matching

    Format the response as a JSON object:
    {
      "recommendations": [
        {
          "whiskyId": number,
          "reason": string,
          "confidence": number,
          "educationalContent": {
            "history": string,
            "production": string,
            "tastingNotes": string,
            "pairingAdvice": string
          }
        }
      ]
    }`;

    const result = await makeOpenAIRequest(prompt);

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
    if (error instanceof WhiskyAIError) {
      throw error;
    }
    throw new WhiskyAIError(
      "Failed to generate whisky recommendations",
      "RECOMMENDATION_ERROR"
    );
  }
}

export async function generateConciergeName(preferences?: {
  style?: "funny" | "professional" | "casual";
  theme?: string;
}): Promise<string> {
  try {
    const prompt = `Generate a creative and ${preferences?.style || 'friendly'} name for a whisky concierge/expert. 
    ${preferences?.theme ? `Incorporate the theme: ${preferences.theme}` : ''}
    The name should be memorable, unique, and reflect expertise in whisky.

    Format as JSON: { "name": "generated name" }`;

    const result = await makeOpenAIRequest(prompt);
    return result.name || "Whisky Pete";
  } catch (error) {
    console.error('Error generating concierge name:', error);
    if (error instanceof WhiskyAIError) {
      throw error;
    }
    return "Whisky Pete"; // Fallback name
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

    Make it whisky-themed and memorable. For example, they might be a retired master distiller, 
    a wandering spirit guide, or a historical whisky figure.

    Format as JSON:
    {
      "name": string,
      "accent": string (e.g., "Highland Scots", "Smooth Irish"),
      "background": string (their origin story),
      "personality": string (key traits),
      "avatarDescription": string (appearance details),
      "voiceDescription": string (how they sound),
      "specialties": string[] (3-5 areas of expertise),
      "catchphrase": string (their signature saying)
    }`;

    const result = await makeOpenAIRequest(prompt);

    if (!result.name || !result.accent || !result.background) {
      throw new WhiskyAIError(
        "Invalid personality generation response",
        "INVALID_PERSONALITY"
      );
    }

    return result;
  } catch (error) {
    console.error('Error generating concierge personality:', error);
    if (error instanceof WhiskyAIError) {
      throw error;
    }

    // Enhanced default personalities for better fallback experience
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
      },
      {
        name,
        accent: "Speyside Scots",
        background: "Third-generation cooper from Dufftown, the malt whisky capital",
        personality: "Detail-oriented craftsperson with a passion for tradition",
        avatarDescription: "Robust figure in traditional cooper's apron with well-worn tools",
        voiceDescription: "Gentle Speyside burr with technical precision",
        specialties: ["Wood Influence", "Speyside Malts", "Traditional Craftsmanship"],
        catchphrase: "In wood we trust, in spirit we flourish!"
      },
      {
        name,
        accent: "Islay Scots",
        background: "Peat cutting expert turned distillery manager from Islay",
        personality: "Bold and passionate about smoky whiskies",
        avatarDescription: "Weather-worn face with bright eyes, wearing a Hebridean wool sweater",
        voiceDescription: "Strong Islay accent with the rhythm of the sea",
        specialties: ["Peated Whiskies", "Maritime Influence", "Island Distilleries"],
        catchphrase: "From peat and sea comes wisdom!"
      }
    ];

    // Return a random personality for variety
    return fallbackPersonalities[Math.floor(Math.random() * fallbackPersonalities.length)];
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
        answer: "I'm here to help! I can assist you with whisky recommendations, tasting notes, or answer any questions about our collection.",
        suggestedTopics: ["Get personalized recommendations", "Learn about tasting", "Explore our collection"]
      }]
    ]);

    // Check for quick responses first
    for (const [pattern, response] of quickResponses) {
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

    const prompt = `${personalityContext}

    Help the user with their whisky journey. 

    User's collection:
    ${collectionWhiskies.map(w => `- ${w.name} (${w.type}, ${w.tastingNotes})`).join('\n')}

    User's reviews:
    ${userReviews.map(review => `- ${review.whisky.name}: ${review.rating}/5 stars`).join('\n')}

    Previous conversation context:
    ${context.previousInteractions?.map(int => `User: ${int.query}\nConcierge: ${int.response}`).join('\n')}

    Current query: "${query}"

    Provide a response that:
    1. Stays in character (use your accent and personality)
    2. Directly answers their question
    3. Includes educational content when relevant
    4. Makes personalized recommendations based on their collection and preferences
    5. Occasionally uses your catchphrase naturally in the conversation

    Format the response as a JSON object:
    {
      "answer": string,
      "recommendations": [same format as recommendation function] (optional),
      "suggestedTopics": string[] (optional)
    }`;

    return await makeOpenAIRequest(prompt, context);
  } catch (error) {
    console.error('Error with whisky concierge:', error);
    return {
      answer: "I apologize, but I'm experiencing a brief moment of contemplation. While I gather my thoughts, would you like to explore our curated whisky collection or learn about different whisky regions?",
      suggestedTopics: [
        "Browse popular whiskies",
        "Explore whisky regions",
        "View tasting guides",
        "Check latest reviews"
      ]
    };
  }
}
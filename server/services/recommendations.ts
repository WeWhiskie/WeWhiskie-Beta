import OpenAI from "openai";
import { storage } from "../storage";
import type { Whisky, Review } from "@shared/schema";
import type { ConciergePersonality } from "./ai-concierge";
import { createHash } from 'crypto';

// Initialize OpenAI with proper configuration
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
  timeout: 30000
});

// Add specific error types
class WhiskyAIError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'WhiskyAIError';
  }
}

// Request queue to manage concurrent requests
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private readonly MAX_CONCURRENT = 2;
  private currentConcurrent = 0;

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
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
        this.currentConcurrent--;
      }
    }

    this.processing = false;
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }
}

// Cache implementation
class ResponseCache {
  private cache: Map<string, { response: any; timestamp: number }> = new Map();
  private readonly TTL = 1000 * 60 * 60; // 1 hour cache

  private generateKey(prompt: string, context: any = {}): string {
    const data = JSON.stringify({ prompt, context });
    return createHash('md5').update(data).digest('hex');
  }

  get(prompt: string, context?: any): any {
    const key = this.generateKey(prompt, context);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.TTL) {
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
  }
}

const requestQueue = new RequestQueue();
const responseCache = new ResponseCache();
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

async function makeOpenAIRequest(prompt: string, retryCount = 0): Promise<any> {
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
        max_tokens: 500, // Limit token usage
        stream: false // We'll implement streaming in the next iteration
      });

      if (!response.choices[0].message.content) {
        throw new Error("Empty response from AI service");
      }

      const parsedResponse = JSON.parse(response.choices[0].message.content);
      responseCache.set(prompt, parsedResponse); // Cache successful response
      return parsedResponse;
    } catch (error: any) {
      if (error.status === 429) { // Rate limit error
        if (retryCount < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
          console.log(`Rate limit hit, retrying in ${delay}ms...`);
          await sleep(delay);
          return makeOpenAIRequest(prompt, retryCount + 1);
        }

        // Return a smart fallback response based on context
        const fallbackResponse = {
          answer: "I apologize for the delay. While my AI services are optimizing, let me provide you with some general whisky knowledge. Would you like to explore our curated collection or learn about specific whisky regions?",
          suggestedTopics: [
            "Browse top-rated whiskies",
            "Explore whisky regions",
            "Learn about tasting techniques",
            "View latest reviews"
          ]
        };

        return fallbackResponse;
      }

      console.error('OpenAI request error:', error);
      throw error;
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

    // Return a default personality if generation fails
    return {
      name,
      accent: "Classic Scottish",
      background: "A traditional whisky expert with years of experience",
      personality: "Knowledgeable and friendly",
      avatarDescription: "A distinguished figure in traditional Scottish attire",
      voiceDescription: "Warm and welcoming with a gentle brogue",
      specialties: ["Single Malts", "Whisky History", "Tasting Techniques"],
      catchphrase: "Slàinte mhath! (To your good health!)"
    };
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
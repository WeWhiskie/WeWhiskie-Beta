import OpenAI from "openai";
import { storage } from "../storage";
import type { Whisky, Review } from "@shared/schema";
import type { ConciergePersonality } from "./ai-concierge";

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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

async function makeOpenAIRequest(prompt: string, retryCount = 0): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error: any) {
    if (error.status === 429) { // Rate limit error
      if (retryCount < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`Rate limit hit, retrying in ${delay}ms...`);
        await sleep(delay);
        return makeOpenAIRequest(prompt, retryCount + 1);
      }
      throw new WhiskyAIError(
        "We're experiencing high demand. Please try again in a few minutes.",
        "RATE_LIMIT_EXCEEDED"
      );
    }

    if (error.status === 401) {
      throw new WhiskyAIError(
        "AI service configuration error. Please contact support.",
        "INVALID_API_KEY"
      );
    }

    throw new WhiskyAIError(
      "Unable to process request at this time. Please try again later.",
      "AI_SERVICE_ERROR"
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
    const whiskies = await storage.getWhiskies();
    const userReviews = await storage.getUserReviews(context.userId);

    let collectionWhiskies: Whisky[] = [];
    if (context.collectionIds) {
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

    return await makeOpenAIRequest(prompt);
  } catch (error) {
    console.error('Error with whisky concierge:', error);
    if (error instanceof WhiskyAIError) {
      throw error;
    }
    throw new WhiskyAIError(
      "Failed to process whisky concierge request",
      "UNKNOWN_ERROR"
    );
  }
}
import OpenAI from "openai";
import { storage } from "../storage";
import type { Whisky, Review } from "@shared/schema";
import type { ConciergePersonality } from "./ai-concierge";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    const recommendations: WhiskyRecommendation[] = await Promise.all(
      (result.recommendations || []).map(async (rec: any) => {
        const whisky = whiskies.find(w => w.id === rec.whiskyId);
        if (!whisky) throw new Error(`Whisky with id ${rec.whiskyId} not found`);
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
    throw new Error('Failed to generate whisky recommendations');
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error('Error with whisky concierge:', error);
    throw new Error('Failed to process whisky concierge request');
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

    const response = await openai.chat.completions.create({
      model: "gpt-4", 
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o", 
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error('Error generating concierge personality:', error);
    
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
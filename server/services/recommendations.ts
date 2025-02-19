import OpenAI from "openai";
import { storage } from "../storage";
import type { Whisky } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface WhiskyRecommendation {
  whisky: Whisky;
  reason: string;
  confidence: number;
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
    // Get all available whiskies
    const whiskies = await storage.getWhiskies();
    
    // Get user's review history
    const userReviews = await storage.getUserReviews(userId);
    
    const prompt = `As a whisky expert, recommend 3 whiskies from the following list based on these preferences:
    - Preferred flavors: ${preferences.flavors.join(', ')}
    - Price range: $${preferences.priceRange.min} - $${preferences.priceRange.max}
    - Preferred types: ${preferences.preferred_types.join(', ')}
    - Experience level: ${preferences.experience_level}
    
    User's previous reviews:
    ${userReviews.map(review => `- ${review.whisky.name}: ${review.rating}/5 stars`).join('\n')}

    Available whiskies:
    ${whiskies.map(w => `- ${w.name} (${w.type}, $${w.price}, ${w.tastingNotes})`).join('\n')}

    Provide recommendations in JSON format with the following structure:
    {
      "recommendations": [
        {
          "whiskyId": number,
          "reason": string,
          "confidence": number
        }
      ]
    }

    Include a confidence score (0-1) for each recommendation based on how well it matches the preferences.
    Provide specific reasons for each recommendation.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    const recommendations: WhiskyRecommendation[] = await Promise.all(
      result.recommendations.map(async (rec: any) => {
        const whisky = whiskies.find(w => w.id === rec.whiskyId);
        if (!whisky) throw new Error(`Whisky with id ${rec.whiskyId} not found`);
        return {
          whisky,
          reason: rec.reason,
          confidence: rec.confidence
        };
      })
    );

    return recommendations;

  } catch (error) {
    console.error('Error generating recommendations:', error);
    throw new Error('Failed to generate whisky recommendations');
  }
}

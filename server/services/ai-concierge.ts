import { z } from 'zod';
import { getWhiskyRecommendations, getWhiskyConciergeResponse, generateConciergeName, generateConciergePersonality } from './recommendations';
import { storage } from '../storage';

// Enhanced concierge personality schema
const conciergePersonalitySchema = z.object({
  name: z.string(),
  accent: z.string(),
  background: z.string(),
  personality: z.string(),
  avatarDescription: z.string(),
  voiceDescription: z.string(),
  specialties: z.array(z.string()),
  catchphrase: z.string()
});

export type ConciergePersonality = z.infer<typeof conciergePersonalitySchema>;

// Validate whisky concierge requests
const whiskyConciergeSchema = z.object({
  query: z.string().min(1),
  context: z.object({
    userId: z.number(),
    collectionIds: z.array(z.number()).optional(),
    previousInteractions: z.array(z.object({
      query: z.string(),
      response: z.string()
    })).optional(),
    userLevel: z.string().optional(),
    preferredStyles: z.array(z.string()).optional(),
    conciergePersonality: conciergePersonalitySchema.optional()
  })
});

export class WhiskyConcierge {
  private conversationHistory: Map<number, Array<{ query: string; response: string }>> = new Map();
  private personalities: Map<string, ConciergePersonality> = new Map();

  async getResponse(userId: number, query: string, context?: z.infer<typeof whiskyConciergeSchema>['context']) {
    const validation = whiskyConciergeSchema.safeParse({ 
      query, 
      context: { 
        ...context,
        userId 
      } 
    });

    if (!validation.success) {
      throw new Error('Invalid query format');
    }

    // Get previous interactions for this user
    const previousInteractions = this.conversationHistory.get(userId) || [];

    const response = await getWhiskyConciergeResponse(query, {
      userId,
      collectionIds: context?.collectionIds,
      previousInteractions,
      personality: context?.conciergePersonality
    });

    // Update conversation history
    if (response.answer) {
      const newInteraction = { query, response: response.answer };
      this.conversationHistory.set(
        userId,
        [...(previousInteractions.slice(-5)), newInteraction] // Keep last 5 interactions
      );
    }

    return response;
  }

  // Generate or update concierge personality
  async generatePersonality(name: string, style: "funny" | "professional" | "casual" = "casual"): Promise<ConciergePersonality> {
    const existingPersonality = this.personalities.get(name);
    if (existingPersonality) {
      return existingPersonality;
    }

    const personality = await generateConciergePersonality(name, style);
    this.personalities.set(name, personality);
    return personality;
  }

  // Get existing personality
  getPersonality(name: string): ConciergePersonality | undefined {
    return this.personalities.get(name);
  }

  async getRecommendations(userId: number, preferences: {
    flavors: string[];
    priceRange: { min: number; max: number };
    preferred_types: string[];
    experience_level: string;
  }) {
    return await getWhiskyRecommendations(preferences, userId);
  }

  // Clear conversation history for a user
  clearHistory(userId: number) {
    this.conversationHistory.delete(userId);
  }
}

// Export a singleton instance
export const whiskyConcierge = new WhiskyConcierge();

// Export the name generation and personality functions
export { generateConciergeName, generateConciergePersonality } from './recommendations';
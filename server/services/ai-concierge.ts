import { z } from 'zod';
import { getWhiskyRecommendations, getWhiskyConciergeResponse } from './recommendations';
import { storage } from '../storage';

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
    preferredStyles: z.array(z.string()).optional()
  })
});

export class WhiskyConcierge {
  private conversationHistory: Map<number, Array<{ query: string; response: string }>> = new Map();

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
      previousInteractions
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
import { z } from 'zod';
import { storage } from '../storage';
import { conciergePersonalitySchema, type ConciergePersonality } from '@shared/schema';

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

export async function generateConciergeName(options: { style: string }): Promise<string> {
  const stylePrompts = {
    highland: "Generate a Scottish Highland whisky expert name",
    speyside: "Create a name for a Speyside whisky master",
    bourbon: "Generate a Kentucky bourbon expert's name",
    islay: "Create a name for an Islay whisky specialist"
  };

  const prompt = stylePrompts[options.style as keyof typeof stylePrompts] || 
                 "Generate a whisky expert's name";

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.1-sonar-small-128k-online",
      messages: [
        {
          role: "system",
          content: "Generate creative and thematic names for whisky experts. Names should reflect their expertise and region."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 50,
      temperature: 0.7
    })
  });

  const result = await response.json();
  return result.choices[0].message.content.trim();
}

export async function generateConciergePersonality(
  name: string,
  style: string = "casual"
): Promise<ConciergePersonality> {
  const stylePrompts = {
    highland: `Create a Scottish Highland whisky expert personality with a Highland accent`,
    speyside: `Create a Speyside whisky master personality with a Speyside accent`,
    bourbon: `Create a Kentucky bourbon expert personality with a Southern American accent`,
    islay: `Create an Islay whisky specialist personality with an Islay Scottish accent`
  };

  const prompt = stylePrompts[style as keyof typeof stylePrompts] || 
                 "Create a whisky expert personality";

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.1-sonar-small-128k-online",
      messages: [
        {
          role: "system",
          content: `Generate a detailed whisky expert personality profile with the following attributes:
          - Name (use the provided name)
          - Accent (specific to their region)
          - Background (their history and expertise)
          - Personality traits
          - Physical appearance description
          - Voice characteristics
          - Areas of specialty (3-5 points)
          - A signature catchphrase
          Make it engaging and authentic to the region.`
        },
        {
          role: "user",
          content: `Create a personality profile for ${name}. ${prompt}`
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    })
  });

  const result = await response.json();
  const content = result.choices[0].message.content;

  // Parse the generated content into structured data
  const lines = content.split('\n');
  const personality: Partial<ConciergePersonality> = {
    name,
    accent: '',
    background: '',
    personality: '',
    avatarDescription: '',
    voiceDescription: '',
    specialties: [],
    catchphrase: ''
  };

  for (const line of lines) {
    if (line.includes('Accent:')) personality.accent = line.split('Accent:')[1].trim();
    if (line.includes('Background:')) personality.background = line.split('Background:')[1].trim();
    if (line.includes('Personality:')) personality.personality = line.split('Personality:')[1].trim();
    if (line.includes('Appearance:')) personality.avatarDescription = line.split('Appearance:')[1].trim();
    if (line.includes('Voice:')) personality.voiceDescription = line.split('Voice:')[1].trim();
    if (line.includes('Specialties:')) {
      const specialtiesText = line.split('Specialties:')[1].trim();
      personality.specialties = specialtiesText.split(',').map((s: string) => s.trim());
    }
    if (line.includes('Catchphrase:')) personality.catchphrase = line.split('Catchphrase:')[1].trim();
  }

  // Validate and provide defaults for missing fields
  const validatedPersonality: ConciergePersonality = {
    name: personality.name || name,
    accent: personality.accent || 'Standard English',
    background: personality.background || 'Experienced whisky connoisseur',
    personality: personality.personality || 'Friendly and knowledgeable',
    avatarDescription: personality.avatarDescription || 'Professional whisky expert',
    voiceDescription: personality.voiceDescription || 'Clear and articulate',
    specialties: personality.specialties?.length ? personality.specialties : ['Whisky tasting', 'Spirit education'],
    catchphrase: personality.catchphrase || 'Let\'s explore the world of whisky together!'
  };

  return conciergePersonalitySchema.parse(validatedPersonality);
}

export class WhiskyConcierge {
  private conversationHistory: Map<number, Array<{ query: string; response: string }>> = new Map();
  private personalities: Map<string, ConciergePersonality> = new Map();

  async getResponse(userId: number, query: string, context?: z.infer<typeof whiskyConciergeSchema>['context']) {
    try {
      const validation = whiskyConciergeSchema.safeParse({ 
        query, 
        context: { 
          ...context,
          userId 
        } 
      });

      if (!validation.success) {
        console.error('Validation failed:', validation.error);
        throw new Error('Invalid query format');
      }

      // Get previous interactions for this user
      const previousInteractions = this.conversationHistory.get(userId) || [];

      // Construct personality-aware prompt
      let systemPrompt = `You are an expert whisky concierge. Help users explore and appreciate whisky through detailed, accurate information and personalized recommendations.`;

      if (context?.conciergePersonality) {
        const { name, accent, background, personality, catchphrase } = context.conciergePersonality;
        systemPrompt += `\nYou are ${name}, speaking with a ${accent} accent.\n${background}\n${personality}\nUse your catchphrase "${catchphrase}" when appropriate.`;
      }

      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            { role: "system", content: systemPrompt },
            ...previousInteractions.map(int => [
              { role: "user", content: int.query },
              { role: "assistant", content: int.response }
            ]).flat(),
            { role: "user", content: query }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      const result = await response.json();
      const answer = result.choices[0].message.content;

      // Update conversation history
      if (answer) {
        const newInteraction = { query, response: answer };
        this.conversationHistory.set(
          userId,
          [...(previousInteractions.slice(-5)), newInteraction]
        );
      }

      return { 
        answer, 
        citations: result.citations || [],
        conversationId: Date.now() 
      };
    } catch (error) {
      console.error('Error in getResponse:', error);
      throw error;
    }
  }

  // Get or generate personality
  async getPersonality(name: string, style: string = "casual"): Promise<ConciergePersonality> {
    const existingPersonality = this.personalities.get(name);
    if (existingPersonality) {
      return existingPersonality;
    }

    const personality = await generateConciergePersonality(name, style);
    this.personalities.set(name, personality);
    return personality;
  }

  // Clear conversation history for a user
  clearHistory(userId: number) {
    this.conversationHistory.delete(userId);
  }
}

// Export a singleton instance
export const whiskyConcierge = new WhiskyConcierge();
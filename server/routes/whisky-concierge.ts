import { Request, Response } from "express";
import { db } from "../db";
import { chatConversations, chatMessages, whiskies, userWhiskyCollection, reviews } from "@shared/schema";
import { eq } from "drizzle-orm";
import { whiskyConcierge, generateConciergeName, generateConciergePersonality } from "../services/ai-concierge";

const SYSTEM_PROMPT = `You are a whisky expert concierge with deep knowledge of distilleries, tasting notes, and whisky culture. Your responses should be concise and focused, encouraging user interaction.

Key principles:
1. Keep responses brief and digestible (max 2-3 sentences per point)
2. Break complex information into bullet points
3. Encourage follow-up questions for deeper insights
4. Focus on one aspect at a time
5. Use interactive elements to engage users

Areas of expertise:
• Tasting notes and flavor profiles
• Distillery history and methods
• Personalized recommendations
• Food pairings
• Whisky terminology

Additional personality context will be provided to customize your responses.

Response format:
- Keep initial responses under 100 words
- Use bullet points for lists
- Include a suggested follow-up question`;

export async function handleWhiskyConciergeChat(req: Request, res: Response) {
  try {
    const { query, conversationId, personality } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!query?.trim()) {
      return res.status(400).json({ message: "Query is required" });
    }

    // Get user's whisky collection for context
    const userCollection = await db.query.userWhiskyCollection.findMany({
      where: eq(userWhiskyCollection.userId, userId),
      with: {
        whisky: true
      }
    });

    // Create or retrieve conversation
    let conversation;
    if (conversationId) {
      conversation = await db.query.chatConversations.findFirst({
        where: eq(chatConversations.id, conversationId)
      });
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found" });
      }
    } else {
      const newConversation = {
        userId,
        title: "Whisky Consultation",
        status: "active",
        context: { 
          collectionSize: userCollection.length,
          userPreferences: await getUserPreferences(userId)
        },
        personalitySettings: personality ? {
          style: personality.accent?.toLowerCase().includes('highland') ? 'highland' :
                 personality.accent?.toLowerCase().includes('speyside') ? 'speyside' :
                 personality.accent?.toLowerCase().includes('bourbon') ? 'bourbon' : 'islay',
          accent: personality.accent,
          name: personality.name,
          specialties: personality.specialties
        } : {}
      };

      conversation = await db.insert(chatConversations)
        .values(newConversation)
        .returning()
        .then(rows => rows[0]);
    }

    // Store user message
    await db.insert(chatMessages).values({
      conversationId: conversation.id,
      role: "user",
      content: query,
    });

    // Construct personality-aware system prompt
    const personalityPrompt = personality ? `
    You are ${personality.name}, a whisky expert with a ${personality.accent} accent.
    Background: ${personality.background}
    Personality traits: ${personality.personality}
    Your catchphrase: "${personality.catchphrase}"
    Remember to:
    - Keep responses brief and engaging
    - Use your catchphrase sparingly
    - Maintain your distinct personality
    ` : "";

    // Call Perplexity API with enhanced controls
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + "\n" + personalityPrompt },
          { 
            role: "user", 
            content: `Context: User has ${userCollection.length} whiskies in their collection.
                     Previous preferences: ${JSON.stringify(await getUserPreferences(userId))}
                     Query: ${query}

                     Remember to keep your response concise and focused.`
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        frequency_penalty: 1,
        max_tokens: 150  // Limit response length
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to get response from AI");
    }

    const result = await response.json();
    const aiResponse = result.choices[0].message.content;

    // Store AI response with personality
    await db.insert(chatMessages).values({
      conversationId: conversation.id,
      role: "assistant",
      content: aiResponse,
      metadata: {
        citations: result.citations || [],
        model: result.model,
        responseLength: aiResponse.length
      },
      personality: personality || {}
    });

    // Update conversation last message timestamp
    await db.update(chatConversations)
      .set({ 
        lastMessageAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(chatConversations.id, conversation.id));

    return res.json({
      answer: aiResponse,
      conversationId: conversation.id,
      citations: result.citations || []
    });
  } catch (error) {
    console.error("Whisky concierge error:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Internal server error"
    });
  }
}

// Helper function to get user preferences
async function getUserPreferences(userId: number) {
  const reviews = await db.query.reviews.findMany({
    where: eq(reviews.userId, userId),
    with: {
      whisky: true
    }
  });

  // Extract preferences from reviews
  const preferences = {
    favoriteTypes: new Set<string>(),
    preferredFlavors: new Set<string>(),
    averageRating: 0,
    totalReviews: reviews.length
  };

  reviews.forEach(review => {
    if (review.whisky) {
      preferences.favoriteTypes.add(review.whisky.type);
      if (review.whisky.tasting_notes) {
        review.whisky.tasting_notes.split(',').forEach(note => 
          preferences.preferredFlavors.add(note.trim())
        );
      }
      preferences.averageRating += review.rating;
    }
  });

  if (reviews.length > 0) {
    preferences.averageRating /= reviews.length;
  }

  return {
    favoriteTypes: Array.from(preferences.favoriteTypes),
    preferredFlavors: Array.from(preferences.preferredFlavors),
    averageRating: preferences.averageRating,
    totalReviews: preferences.totalReviews
  };
}

// Existing route handlers remain unchanged
export async function handleGenerateName(req: Request, res: Response) {
  try {
    const { style } = req.body;
    const name = await generateConciergeName({ style });
    return res.json({ name });
  } catch (error) {
    console.error("Error generating name:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to generate name"
    });
  }
}

export async function handleGeneratePersonality(req: Request, res: Response) {
  try {
    const { name, style } = req.body;
    const personality = await generateConciergePersonality(name, style);
    return res.json(personality);
  } catch (error) {
    console.error("Error generating personality:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to generate personality"
    });
  }
}
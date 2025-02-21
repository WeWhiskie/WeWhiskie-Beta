import { Request, Response } from "express";
import { db } from "../db";
import { chatConversations, chatMessages, whiskies } from "@shared/schema";
import { eq } from "drizzle-orm";

const SYSTEM_PROMPT = `You are a whisky expert concierge with deep knowledge of distilleries, tasting notes, and whisky culture. Help users explore and appreciate whisky through detailed, accurate information and personalized recommendations.

Key responsibilities:
1. Provide detailed tasting notes and flavor profiles
2. Share distillery history and production methods
3. Make personalized recommendations based on user preferences
4. Suggest food pairings and serving suggestions
5. Explain whisky terminology and concepts
6. Consider user's existing collection when making recommendations

Always be precise and educational while maintaining an engaging, conversational tone.`;

export async function handleWhiskyConciergeChat(req: Request, res: Response) {
  try {
    const { query, conversationId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!query?.trim()) {
      return res.status(400).json({ message: "Query is required" });
    }

    // Get user's whisky collection for context
    const userCollection = await db.select().from(whiskies)
      .where(eq(whiskies.userId, userId));

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
      conversation = await db.insert(chatConversations)
        .values({
          userId,
          title: "Whisky Consultation",
          status: "active",
          context: { collectionSize: userCollection.length }
        })
        .returning()
        .then(rows => rows[0]);
    }

    // Store user message
    await db.insert(chatMessages).values({
      conversationId: conversation.id,
      role: "user",
      content: query,
    });

    // Call Perplexity API
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Context: User has ${userCollection.length} whiskies in their collection.\nQuery: ${query}` }
        ],
        temperature: 0.2,
        top_p: 0.9,
        frequency_penalty: 1
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to get response from AI");
    }

    const result = await response.json();
    const aiResponse = result.choices[0].message.content;

    // Store AI response
    await db.insert(chatMessages).values({
      conversationId: conversation.id,
      role: "assistant",
      content: aiResponse,
      metadata: {
        citations: result.citations || [],
        model: result.model
      }
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

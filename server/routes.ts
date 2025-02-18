import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertReviewSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.get("/api/whiskies", async (_req, res) => {
    const whiskies = await storage.getWhiskies();
    res.json(whiskies);
  });

  app.get("/api/whiskies/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    console.log(`Fetching whisky with id: ${id}`);

    const whisky = await storage.getWhisky(id);
    if (!whisky) {
      console.log(`Whisky with id ${id} not found`);
      return res.status(404).json({ message: "Whisky not found" });
    }

    console.log(`Found whisky:`, whisky);
    res.json(whisky);
  });

  app.get("/api/reviews", async (_req, res) => {
    const reviews = await storage.getReviews();
    res.json(reviews);
  });

  app.get("/api/users/:userId/reviews", async (req, res) => {
    const reviews = await storage.getUserReviews(parseInt(req.params.userId));
    res.json(reviews);
  });

  app.post("/api/reviews", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const parsedReview = insertReviewSchema.parse({
      ...req.body,
      userId: req.user.id,
    });

    const review = await storage.createReview(parsedReview);
    res.status(201).json(review);
  });

  const httpServer = createServer(app);
  return httpServer;
}
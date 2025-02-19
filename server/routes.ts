import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertReviewSchema, insertTastingSessionSchema, type Review, type TastingSession } from "@shared/schema";
import { LiveStreamingServer } from './websocket';
import { getWhiskyRecommendations } from "./services/recommendations";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Configure multer for file uploads
const multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'attached_assets/');
  },
  filename: function (req, file, cb) {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: multerStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Get user profile
  app.get("/api/users/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const user = await storage.getUser(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Add isFollowing flag if there's a logged in user
    if (req.isAuthenticated()) {
      const followers = await storage.getFollowers(id);
      const isFollowing = followers.some(follower => follower.id === req.user?.id);
      return res.json({ ...user, _isFollowing: isFollowing });
    }

    res.json(user);
  });

  // Follow a user
  app.post("/api/users/:id/follow", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const targetUserId = parseInt(req.params.id);
    const currentUserId = req.user!.id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }

    await storage.followUser(currentUserId, targetUserId);
    res.sendStatus(200);
  });

  // Unfollow a user
  app.delete("/api/users/:id/follow", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const targetUserId = parseInt(req.params.id);
    const currentUserId = req.user!.id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: "Cannot unfollow yourself" });
    }

    await storage.unfollowUser(currentUserId, targetUserId);
    res.sendStatus(200);
  });

  // Get user's reviews
  app.get("/api/users/:userId/reviews", async (req, res) => {
    const reviews = await storage.getUserReviews(parseInt(req.params.userId));
    res.json(reviews);
  });

  app.get("/api/whiskies", async (_req, res) => {
    const whiskies = await storage.getWhiskies();
    res.json(whiskies);
  });

  app.get("/api/whiskies/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const whisky = await storage.getWhisky(id);
    if (!whisky) {
      return res.status(404).json({ message: "Whisky not found" });
    }
    res.json(whisky);
  });

  app.get("/api/reviews", async (_req, res) => {
    const reviews = await storage.getReviews();
    res.json(reviews);
  });

  app.post("/api/reviews", upload.single('media'), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const reviewData = {
        ...req.body,
        userId: req.user!.id,
        whiskyId: parseInt(req.body.whiskyId),
        rating: parseInt(req.body.rating),
      };

      if (req.file) {
        const isVideo = req.file.mimetype.startsWith('video/');
        if (isVideo) {
          reviewData.videoUrl = `/attached_assets/${req.file.filename}`;
        } else {
          reviewData.thumbnailUrl = `/attached_assets/${req.file.filename}`;
        }
      }

      const parsedReview = insertReviewSchema.parse(reviewData);
      const review = await storage.createReview(parsedReview);
      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(400).json({ message: "Invalid review data" });
    }
  });

  // Tasting Session routes
  app.get("/api/sessions/:id", async (req, res) => {
    const session = await storage.getTastingSession(parseInt(req.params.id));
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    res.json(session);
  });

  app.post("/api/sessions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const parsedSession = insertTastingSessionSchema.parse({
      ...req.body,
      hostId: req.user!.id,
    });

    const session = await storage.createTastingSession(parsedSession);
    res.status(201).json(session);
  });

  app.post("/api/sessions/:id/start", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const sessionId = parseInt(req.params.id);
    const session = await storage.getTastingSession(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.hostId !== req.user.id) {
      return res.status(403).json({ message: "Only the host can start the session" });
    }

    const updatedSession = await storage.updateTastingSessionStatus(sessionId, 'live');
    res.json(updatedSession);
  });

  app.post("/api/sessions/:id/end", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const sessionId = parseInt(req.params.id);
    const session = await storage.getTastingSession(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.hostId !== req.user.id) {
      return res.status(403).json({ message: "Only the host can end the session" });
    }

    const updatedSession = await storage.updateTastingSessionStatus(sessionId, 'ended');
    res.json(updatedSession);
  });

  app.post("/api/recommendations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const recommendations = await getWhiskyRecommendations(req.body, req.user.id);
      res.json(recommendations);
    } catch (error) {
      console.error("Error getting recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  // Add share analytics endpoint
  app.post("/api/share-analytics", async (req, res) => {
    try {
      const { platform, url, title } = req.body;

      // Track the share event
      await storage.trackShare({
        platform,
        url,
        title,
        userId: req.user?.id || null,
        timestamp: new Date()
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error tracking share:", error);
      res.status(500).json({ message: "Failed to track share" });
    }
  });

  app.get("/api/reviews/:id", async (req, res) => {
    const review = await storage.getReview(parseInt(req.params.id));
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    res.json(review);
  });

  const httpServer = createServer(app);
  new LiveStreamingServer(httpServer);
  return httpServer;
}
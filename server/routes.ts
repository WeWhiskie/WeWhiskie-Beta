import type { Express } from "express";
import type { IncomingMessage } from "http";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertReviewSchema, insertTastingSessionSchema } from "@shared/schema";
import { LiveStreamingServer } from './websocket';
import multer from "multer";
import path from "path";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { insertActivitySchema, type InsertActivity } from "@shared/schema";
import { whiskyConcierge } from "./services/ai-concierge";
import { generateConciergeName, getWhiskyRecommendations } from "./services/recommendations";
import { handleWhiskyConciergeChat, handleGenerateName, handleGeneratePersonality } from "./routes/whisky-concierge";
import { textToSpeechService } from './services/text-to-speech';
import { WebSocketServer, WebSocket } from 'ws';
import type { SessionData } from 'express-session';
import { parse as parseCookie } from 'cookie';

// Extend IncomingMessage to include session store
interface ExtendedIncomingMessage extends IncomingMessage {
  session?: SessionData;
  sessionStore?: {
    get(sid: string, callback: (err: any, session?: SessionData | null) => void): void;
  };
}

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

export async function registerRoutes(app: Express): Promise<{ server: Server; liveStreamingServer: LiveStreamingServer }> {
  // Set up auth first
  const { sessionStore } = setupAuth(app);

  // Create HTTP server
  const server = createServer(app);

  // WebSocket server setup with enhanced error handling
  const wss = new WebSocketServer({ 
    server, 
    path: '/ws/ai-concierge',
    verifyClient: async (info, callback) => {
      try {
        const cookies = parseCookie(info.req.headers.cookie || '');
        console.log('WebSocket verification - Session check:', {
          sessionId: cookies['whisky.session.id'],
          rawCookie: info.req.headers.cookie
        });

        const sessionId = cookies['whisky.session.id'];
        if (!sessionId) {
          console.log('WebSocket connection rejected: No session ID');
          callback(false, 401, 'Unauthorized - No session ID');
          return;
        }

        if (!sessionStore) {
          console.error('Session store not initialized');
          callback(false, 500, 'Session store error');
          return;
        }

        // Clean the session ID by removing the 's:' prefix and signature
        const cleanSessionId = sessionId.split('.')[0].replace('s:', '');

        const session = await new Promise<SessionData | null>((resolve, reject) => {
          sessionStore.get(cleanSessionId, (err, sess) => {
            if (err) {
              console.error('Session fetch error:', err);
              reject(err);
            } else {
              console.log('Session verification result:', {
                hasSession: !!sess,
                sessionId: cleanSessionId
              });
              resolve(sess);
            }
          });
        });

        if (!session?.passport?.user) {
          console.log('WebSocket connection rejected: Invalid session data');
          callback(false, 401, 'Invalid session');
          return;
        }

        // Store session data for later use
        (info.req as ExtendedIncomingMessage).session = session;
        console.log('WebSocket client authenticated successfully', {
          userId: session.passport.user,
          timestamp: new Date().toISOString()
        });

        callback(true);
      } catch (error) {
        console.error('WebSocket verification error:', error);
        callback(false, 500, 'Internal Server Error');
      }
    }
  });

  // Enhanced client tracking with more metadata
  const clients = new Map<WebSocket, {
    userId?: number;
    sessionId?: string;
    lastPing: number;
    reconnectAttempts: number;
    connectedAt: number;
  }>();

  // Heartbeat check interval (30 seconds)
  const heartbeatInterval = setInterval(() => {
    const now = Date.now();
    wss.clients.forEach((ws) => {
      const client = clients.get(ws);
      if (client && (now - client.lastPing > 45000)) {
        console.log('Client timeout detected - terminating connection');
        ws.terminate();
        return;
      }

      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    });
  }, 30000);

  // Clean up on server close
  server.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  wss.on('connection', async (ws, req) => {
    try {
      console.log('New AI Concierge WebSocket connection established');

      // Initialize client tracking with more metadata
      clients.set(ws, {
        lastPing: Date.now(),
        reconnectAttempts: 0,
        userId: req.session?.userId,
        sessionId: req.session?.id,
        connectedAt: Date.now()
      });

      // Send connection confirmation with session info
      ws.send(JSON.stringify({
        type: 'CONNECTED',
        message: 'Connected to AI Concierge WebSocket',
        data: {
          userId: req.session?.userId,
          timestamp: Date.now()
        }
      }));

      // Handle pong messages
      ws.on('pong', () => {
        const client = clients.get(ws);
        if (client) {
          client.lastPing = Date.now();
        }
      });

      // Handle incoming messages
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('Received message:', { type: data.type });

          const client = clients.get(ws);
          if (!client) {
            throw new Error('Client not found in tracking map');
          }

          switch (data.type) {
            case 'SPEECH_INPUT':
              if (!data.text) {
                throw new Error('Speech input text is required');
              }

              await handleWhiskyConciergeChat({
                body: { message: data.text },
                session: req.session
              } as any, {
                json: (responseData: any) => {
                  if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                      type: 'AI_RESPONSE',
                      data: responseData
                    }));
                  }
                }
              } as any);
              break;

            default:
              console.warn('Unknown message type:', data.type);
              ws.send(JSON.stringify({
                type: 'ERROR',
                error: 'Unknown message type'
              }));
          }
        } catch (error) {
          console.error('Message handling error:', error);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              error: 'Failed to process message'
            }));
          }
        }
      });

      // Handle connection close
      ws.on('close', (code, reason) => {
        console.log(`WebSocket closed - Code: ${code}, Reason: ${reason}`);
        const client = clients.get(ws);
        if (client) {
          client.reconnectAttempts++;
        }
        clients.delete(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(ws);
        ws.terminate();
      });

    } catch (error) {
      console.error('Error in WebSocket connection handler:', error);
      ws.close(1011, 'Internal Server Error');
    }
  });

  // Serve static files from attached_assets directory
  app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));

  // Initialize WebSocket server for live streaming
  const liveStreamingServer = new LiveStreamingServer(server);

  // Get user profile
  app.get("/api/users/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const user = await storage.getUser(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

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
        // Ensure optional fields are explicitly null if not provided
        finish: req.body.finish || null,
        palate: req.body.palate || null,
        nosing: req.body.nosing || null,
        videoUrl: null,
        thumbnailUrl: null,
        likes: 0
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

  app.get("/api/groups", async (_req, res) => {
    try {
      const groups = await storage.getTastingGroups();
      res.json(groups);
    } catch (error) {
      console.error("Error fetching tasting groups:", error);
      res.status(500).json({ message: "Failed to fetch tasting groups" });
    }
  });

  app.post("/api/groups", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const groupData = {
        ...req.body,
        createdBy: req.user!.id,
        memberCount: 1, // Creator is the first member
      };

      const group = await storage.createTastingGroup(groupData);
      // Add the creator as a member with admin role
      await storage.addGroupMember(group.id, req.user!.id, "admin");

      res.status(201).json(group);
    } catch (error) {
      console.error("Error creating tasting group:", error);
      res.status(400).json({ message: "Invalid group data" });
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

    try {
      const sessionData = {
        ...req.body,
        hostId: req.user!.id,
        status: 'scheduled', // Default status for new sessions
        description: req.body.description || null,
        maxParticipants: req.body.maxParticipants || null,
        price: req.body.price || null,
        videoUrl: req.body.videoUrl || null,
        streamKey: req.body.streamKey || null,
        groupId: req.body.groupId || null
      };

      const parsedSession = insertTastingSessionSchema.parse(sessionData);
      const session = await storage.createTastingSession(parsedSession);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating tasting session:", error);
      res.status(400).json({ message: "Invalid session data" });
    }
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
      const recommendations = await getWhiskyRecommendations(req.body, req.user!.id);
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

  // Stream configuration routes
  app.post("/api/sessions/:sessionId/stream-config", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const sessionId = parseInt(req.params.sessionId);
      const config = await storage.createStreamConfig({
        ...req.body,
        sessionId
      });
      res.status(201).json(config);
    } catch (error) {
      console.error("Error creating stream config:", error);
      res.status(400).json({ message: "Invalid stream configuration" });
    }
  });

  app.get("/api/sessions/:sessionId/stream-config", async (req, res) => {
    const sessionId = parseInt(req.params.sessionId);
    const configs = await storage.getStreamConfigs(sessionId);
    res.json(configs);
  });

  // Stream statistics routes
  app.post("/api/sessions/:sessionId/stream-stats", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const sessionId = parseInt(req.params.sessionId);
      const stats = await storage.recordStreamStats({
        ...req.body,
        sessionId
      });
      res.status(201).json(stats);
    } catch (error) {
      console.error("Error recording stream stats:", error);
      res.status(400).json({ message: "Invalid stream statistics" });
    }
  });

  app.get("/api/sessions/:sessionId/stream-stats", async (req, res) => {
    const sessionId = parseInt(req.params.sessionId);
    const stats = await storage.getStreamStats(sessionId);
    res.json(stats);
  });

  app.get("/api/sessions/:sessionId/stream-stats/latest", async (req, res) => {
    const sessionId = parseInt(req.params.sessionId);
    const stats = await storage.getLatestStreamStats(sessionId);
    if (!stats) {
      return res.status(404).json({ message: "No statistics found" });
    }
    res.json(stats);
  });

  // Viewer analytics routes
  app.post("/api/sessions/:sessionId/viewer-analytics", async (req, res) => {
    const sessionId = parseInt(req.params.sessionId);
    try {
      const analytics = await storage.recordViewerAnalytics({
        ...req.body,
        sessionId,
        userId: req.user?.id
      });
      res.status(201).json(analytics);
    } catch (error) {
      console.error("Error recording viewer analytics:", error);
      res.status(400).json({ message: "Invalid viewer analytics data" });
    }
  });

  app.get("/api/sessions/:sessionId/viewer-analytics", async (req, res) => {
    const sessionId = parseInt(req.params.sessionId);
    const analytics = await storage.getViewerAnalytics(sessionId);
    res.json(analytics);
  });

  app.get("/api/sessions/:sessionId/viewer-count", async (req, res) => {
    const sessionId = parseInt(req.params.sessionId);
    const count = await storage.getViewerCount(sessionId);
    res.json({ count });
  });

  // CDN configuration routes
  app.post("/api/sessions/:sessionId/cdn-config", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const sessionId = parseInt(req.params.sessionId);
      const session = await storage.getTastingSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      if (session.hostId !== req.user.id) {
        return res.status(403).json({ message: "Only the host can configure CDN settings" });
      }

      const config = await storage.createCdnConfig({
        ...req.body,
        sessionId
      });
      res.status(201).json(config);
    } catch (error) {
      console.error("Error creating CDN config:", error);
      res.status(400).json({ message: "Invalid CDN configuration" });
    }
  });

  app.get("/api/sessions/:sessionId/cdn-config", async (req, res) => {
    const sessionId = parseInt(req.params.sessionId);
    const configs = await storage.getCdnConfigs(sessionId);
    res.json(configs);
  });

  app.get("/api/sessions/:sessionId/cdn-config/active", async (req, res) => {
    const sessionId = parseInt(req.params.sessionId);
    const config = await storage.getActiveCdnConfig(sessionId);
    if (!config) {
      return res.status(404).json({ message: "No active CDN configuration found" });
    }
    res.json(config);
  });


  // Get user's activity feed
  app.get("/api/activities", async (req, res) => {
    try {
      const visibility = req.isAuthenticated() ? ["public", "followers"] : ["public"];
      const activities = await storage.getActivities({ visibility });
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Get user's personal activity feed
  app.get("/api/users/:userId/activities", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const activities = await storage.getUserActivities(userId);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching user activities:", error);
      res.status(500).json({ message: "Failed to fetch user activities" });
    }
  });

  // Record a new activity
  app.post("/api/activities", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const activityData: InsertActivity = {
        ...req.body,
        userId: req.user!.id,
      };

      const parsedActivity = insertActivitySchema.parse(activityData);
      const activity = await storage.createActivity(parsedActivity);
      res.status(201).json(activity);
    } catch (error) {
      console.error("Error creating activity:", error);
      res.status(400).json({ message: "Invalid activity data" });
    }
  });

  // Whisky Concierge routes
  app.post("/api/whisky-concierge", async (req, res) => {
    try {
      await handleWhiskyConciergeChat(req, res);
    } catch (error) {
      console.error('Error in whisky concierge route:', error);
      // Only send error response if headers haven't been sent
      if (!res.headersSent) {
        res.status(500).json({ 
          message: error instanceof Error ? error.message : "Failed to process request" 
        });
      }
    }
  });

  app.post("/api/whisky-concierge/avatar", upload.single('avatar'), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: "No avatar file provided" });
      }

      if (!req.body.personalityId) {
        return res.status(400).json({ message: "Personality ID is required" });
      }

      const avatarUrl = `/attached_assets/${req.file.filename}`;

      // Update avatar in database and wait for the result
      const avatar = await storage.updateConciergeAvatar(req.body.personalityId, avatarUrl);

      // Get the current personality
      const personality = whiskyConcierge.getPersonality(req.body.personalityId);
      if (personality) {
        // Update the personality synchronously since it's in memory
        personality.avatarUrl = avatarUrl;
        // Return both the avatar and updated personality data
        res.json({ 
          success: true,
          avatarUrl, 
          avatar,
          personality 
        });
      } else {
        res.status(404).json({ message: "Personality not found" });
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      res.status(500).json({ message: "Failed to upload avatar" });
    }
  });

  // Add a new route to get avatar URL for a personality
  app.get("/api/whisky-concierge/personality/:id/avatar", async (req, res) => {
    try {
      const avatar = await storage.getConciergeAvatar(req.params.id);
      if (!avatar) {
        return res.status(404).json({ message: "Avatar not found" });
      }
      res.json({ avatarUrl: avatar.avatarUrl });
    } catch (error) {
      console.error('Error getting avatar:', error);
      res.status(500).json({ message: "Failed to get avatar" });
    }
  });

  // Add new personality generation routes
  app.post("/api/whisky-concierge/generate-name", async (req, res) => {
    await handleGenerateName(req, res);
  });

  app.post("/api/whisky-concierge/personality", async (req, res) => {
    await handleGeneratePersonality(req, res);
  });

  // Get existing personality
  app.get("/api/whisky-concierge/personality/:name", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Please log in to access the Whisky Concierge." });
      }

      const { name } = req.params;
      const personality = whiskyConcierge.getPersonality(name);

      if (!personality) {
        return res.status(404).json({ message: "Personality not found" });
      }

      res.json(personality);
    } catch (error) {
      console.error("Error fetching concierge personality:", error);
      res.status(500).json({ message: "Failed to fetch concierge personality" });
    }
  });

  return { server, liveStreamingServer };
}

//The old parse function is removed because it is replaced with parseCookie from 'cookie' library
import { pgTable, text, serial, integer, timestamp, doublePrecision, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type { InferModel } from 'drizzle-orm';

// Session table for express-session
export const session = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { mode: "date" }).notNull()
});

// Define concierge personality schema
export const conciergePersonalitySchema = z.object({
  name: z.string(),
  accent: z.string(),
  background: z.string(),
  personality: z.string(),
  avatarDescription: z.string(),
  voiceDescription: z.string(),
  specialties: z.array(z.string()),
  catchphrase: z.string(),
  avatarUrl: z.string().optional() // Make it optional to maintain backward compatibility
});


// Users table definition
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  inviteCode: text("invite_code").notNull().unique(),
  invitedBy: integer("invited_by"),
  inviteCount: integer("invite_count").default(0),
  lastActive: timestamp("last_active"),
  engagementScore: integer("engagement_score").default(0),
  masterclassParticipation: jsonb("masterclass_participation").default([]),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  location: text("location"),
  level: integer("level").default(1),
  experiencePoints: integer("experience_points").default(0),
  dailyStreak: integer("daily_streak").default(0),
  lastCheckIn: timestamp("last_check_in"),
  totalReviews: integer("total_reviews").default(0),
  totalTastings: integer("total_tastings").default(0),
  contributionScore: integer("contribution_score").default(0),
  unlockedFeatures: text("unlocked_features").array(),
  achievementBadges: jsonb("achievement_badges").default([]),
  followerCount: integer("follower_count").default(0),
  followingCount: integer("following_count").default(0),
  isVerified: boolean("is_verified").default(false),
  isPremium: boolean("is_premium").default(false),
  socialLinks: jsonb("social_links"),
  expertiseAreas: text("expertise_areas").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Add new table for invite tracking
export const invites = pgTable("invites", {
  id: serial("id").primaryKey(),
  inviterUserId: integer("inviter_user_id")
    .notNull()
    .references(() => users.id),
  invitedEmail: text("invited_email").notNull(),
  inviteCode: text("invite_code").notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
});

// Add new table for masterclass events
export const masterclassEvents = pgTable("masterclass_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  scheduledFor: timestamp("scheduled_for").notNull(),
  maxParticipants: integer("max_participants").default(10),
  status: text("status").default("scheduled"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Add new table for masterclass participants
export const masterclassParticipants = pgTable("masterclass_participants", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => masterclassEvents.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  status: text("status").default("registered"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// User Daily Tasks
export const dailyTasks = pgTable("daily_tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  taskType: text("task_type").notNull(),
  progress: integer("progress").default(0),
  required: integer("required").notNull(),
  completed: boolean("completed").default(false),
  reward: integer("reward").notNull(),
  date: timestamp("date").defaultNow().notNull(),
});

// Weekly Challenges
export const weeklyTasks = pgTable("weekly_tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  taskType: text("task_type").notNull(),
  progress: integer("progress").default(0),
  required: integer("required").notNull(),
  completed: boolean("completed").default(false),
  reward: integer("reward").notNull(),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
});

// Achievement Definitions
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  requiredLevel: integer("required_level").default(1),
  reward: integer("reward").notNull(),
  badgeUrl: text("badge_url").notNull(),
  criteria: jsonb("criteria").notNull(),
});

// User relationships (followers)
export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id")
    .notNull()
    .references(() => users.id),
  followingId: integer("following_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Whiskies catalog
export const whiskies = pgTable("whiskies", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  distillery: text("distillery").notNull(),
  type: text("type").notNull(),
  region: text("region"),
  age: integer("age"),
  abv: doublePrecision("abv"),
  price: doublePrecision("price"),
  image_url: text("image_url").notNull(),
  description: text("description"),
  tasting_notes: text("tasting_notes"),
  cask_type: text("cask_type"),
  limited: integer("limited").default(0),
  vintage: text("vintage"),
  aroma: text("aroma"),
  palate: text("palate"),
  finish: text("finish"),
  founded: text("founded"),
  water_source: text("water_source"),
  distillery_history: text("distillery_history"),
  awards: jsonb("awards").default([]).notNull(),
});

// Reviews
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  whiskyId: integer("whisky_id")
    .notNull()
    .references(() => whiskies.id),
  rating: doublePrecision("rating").notNull(),
  content: text("content").notNull(),
  nosing: text("nosing"),
  palate: text("palate"),
  finish: text("finish"),
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  likes: integer("likes").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Live tasting sessions
export const tastingSessions = pgTable("tasting_sessions", {
  id: serial("id").primaryKey(),
  hostId: integer("host_id")
    .notNull()
    .references(() => users.id),
  whiskyId: integer("whisky_id")
    .references(() => whiskies.id),
  title: text("title").notNull(),
  description: text("description"),
  scheduledFor: timestamp("scheduled_for").notNull(),
  duration: integer("duration").notNull(),
  maxParticipants: integer("max_participants"),
  price: doublePrecision("price").default(0),
  isPrivate: boolean("is_private").default(false),
  streamUrl: text("stream_url"),
  status: text("status").default("scheduled"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  groupId: integer("group_id")
    .references(() => tastingGroups.id),
});

// Session participants
export const sessionParticipants = pgTable("session_participants", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => tastingSessions.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  status: text("status").default("registered"),
});

// Shipping addresses
export const shippingAddresses = pgTable("shipping_addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  street: text("street").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  country: text("country").notNull(),
  postalCode: text("postal_code").notNull(),
  phone: text("phone").notNull(),
  isDefault: boolean("is_default").default(false),
});

// Social sharing tracking
export const shares = pgTable("shares", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  platform: text("platform").notNull(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Likes tracking
export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  reviewId: integer("review_id")
    .notNull()
    .references(() => reviews.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tasting groups
export const tastingGroups = pgTable("tasting_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  imageUrl: text("image_url"),
  isPrivate: boolean("is_private").default(false),
  memberCount: integer("member_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Group membership
export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id")
    .notNull()
    .references(() => tastingGroups.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  role: text("role").default("member"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// Group achievements
export const groupAchievements = pgTable("group_achievements", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id")
    .notNull()
    .references(() => tastingGroups.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  badgeUrl: text("badge_url").notNull(),
  criteria: jsonb("criteria").notNull(),
  unlockedAt: timestamp("unlocked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Activity Feed
export const activityFeed = pgTable("activity_feed", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  activityType: text("activity_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  metadata: jsonb("metadata"),
  visibility: text("visibility").default("public").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Stream Configuration
export const streamConfigurations = pgTable("stream_configurations", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => tastingSessions.id),
  quality: text("quality").notNull(),
  bitrate: integer("bitrate").notNull(),
  framerate: integer("framerate").notNull(),
  keyframeInterval: integer("keyframe_interval").notNull(),
  audioQuality: integer("audio_quality").notNull(),
  enabled: boolean("enabled").default(true),
});

// Stream Statistics
export const streamStats = pgTable("stream_stats", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => tastingSessions.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  currentViewers: integer("current_viewers").default(0),
  peakViewers: integer("peak_viewers").default(0),
  bandwidth: integer("bandwidth").default(0),
  cpuUsage: doublePrecision("cpu_usage"),
  memoryUsage: integer("memory_usage"),
  streamHealth: integer("stream_health").default(100),
  errors: jsonb("errors").default([]),
});

// Viewer Analytics
export const viewerAnalytics = pgTable("viewer_analytics", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => tastingSessions.id),
  userId: integer("user_id")
    .references(() => users.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  watchDuration: integer("watch_duration").default(0),
  quality: text("quality").notNull(),
  bufferingEvents: integer("buffering_events").default(0),
  region: text("region"),
  deviceType: text("device_type"),
  browserInfo: text("browser_info"),
  networkType: text("network_type"),
});

// CDN Configuration
export const cdnConfigs = pgTable("cdn_configs", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => tastingSessions.id),
  provider: text("provider").notNull(),
  region: text("region").notNull(),
  endpoint: text("endpoint").notNull(),
  credentials: jsonb("credentials"),
  settings: jsonb("settings"),
  active: boolean("active").default(true),
});

// Whisky collection table (many-to-many relationship)
export const userWhiskyCollection = pgTable("user_whisky_collection", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  whiskyId: integer("whisky_id")
    .notNull()
    .references(() => whiskies.id),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  notes: text("notes"),
  rating: doublePrecision("rating"),
  isFavorite: boolean("is_favorite").default(false),
});

// AI Concierge Chat System
export const chatConversations = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").default("Whisky Consultation").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  status: text("status").default("active").notNull(),
  context: jsonb("context").default({}).notNull(),
  personalityId: text("personality_id"),
  personalitySettings: jsonb("personality_settings").default({}).notNull()
});

// Chat messages
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => chatConversations.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  personality: jsonb("personality").default({}).notNull()
});

// Store user's whisky preferences and taste profile
export const userWhiskyPreferences = pgTable("user_whisky_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  preferredRegions: text("preferred_regions").array(),
  preferredStyles: text("preferred_styles").array(),
  flavorPreferences: jsonb("flavor_preferences").default({}),
  tasteProfile: jsonb("taste_profile").default({}),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Store AI companion evolution data
export const aiCompanionProfiles = pgTable("ai_companion_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  expertiseLevel: text("expertise_level").default("novice").notNull(),
  personalityTraits: jsonb("personality_traits").default({}),
  specializations: text("specializations").array(),
  knowledgeAreas: jsonb("knowledge_areas").default({}),
  experiencePoints: integer("experience_points").default(0),
  lastInteraction: timestamp("last_interaction"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Track detailed interaction history
export const aiInteractionHistory = pgTable("ai_interaction_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  companionProfileId: integer("companion_profile_id")
    .notNull()
    .references(() => aiCompanionProfiles.id),
  interactionType: text("interaction_type").notNull(),
  context: jsonb("context").default({}),
  userFeedback: jsonb("user_feedback"),
  timestamp: timestamp("timestamp").defaultNow().notNull()
});

// Track unlocked features and knowledge
export const aiUnlockedFeatures = pgTable("ai_unlocked_features", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  companionProfileId: integer("companion_profile_id")
    .notNull()
    .references(() => aiCompanionProfiles.id),
  featureType: text("feature_type").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  requirements: jsonb("requirements").default({}),
  metadata: jsonb("metadata").default({})
});


// Define relations after all tables are defined
export const usersRelations = relations(users, ({ many }) => ({
  whiskies: many(whiskies),
  reviews: many(reviews),
  collections: many(userWhiskyCollection),
  conversations: many(chatConversations),
  invitesSent: many(invites),
  masterclassParticipations: many(masterclassParticipants),
  preferences: many(userWhiskyPreferences),
  aiProfiles: many(aiCompanionProfiles)
}));

// Update the whiskies relations to include the collection relationship
export const whiskiesRelations = relations(whiskies, ({ one, many }) => ({
  owner: one(users, {
    fields: [whiskies.user_id],
    references: [users.id],
  }),
  reviews: many(reviews),
  collections: many(userWhiskyCollection)
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  whisky: one(whiskies, {
    fields: [reviews.whiskyId],
    references: [whiskies.id],
  })
}));

// Update the userWhiskyCollection relations definition to be more explicit
export const userWhiskyCollectionRelations = relations(userWhiskyCollection, ({ one }) => ({
  user: one(users, {
    fields: [userWhiskyCollection.userId],
    references: [users.id],
  }),
  whisky: one(whiskies, {
    fields: [userWhiskyCollection.whiskyId],
    references: [whiskies.id],
  }),
}));

export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
  user: one(users),
  messages: many(chatMessages)
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations)
}));

export const invitesRelations = relations(invites, ({ one }) => ({
  inviter: one(users)
}));

export const masterclassEventsRelations = relations(masterclassEvents, ({ many }) => ({
  participants: many(masterclassParticipants)
}));

export const masterclassParticipantsRelations = relations(masterclassParticipants, ({ one }) => ({
  event: one(masterclassEvents),
  user: one(users)
}));

export const userWhiskyPreferencesRelations = relations(userWhiskyPreferences, ({ one }) => ({
  user: one(users)
}));

export const aiCompanionProfilesRelations = relations(aiCompanionProfiles, ({ one, many }) => ({
  user: one(users),
  interactions: many(aiInteractionHistory),
  unlockedFeatures: many(aiUnlockedFeatures)
}));

export const aiInteractionHistoryRelations = relations(aiInteractionHistory, ({ one }) => ({
  user: one(users),
  companionProfile: one(aiCompanionProfiles)
}));

export const aiUnlockedFeaturesRelations = relations(aiUnlockedFeatures, ({ one }) => ({
  user: one(users),
  companionProfile: one(aiCompanionProfiles)
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertWhiskySchema = createInsertSchema(whiskies);
export const insertReviewSchema = createInsertSchema(reviews);
export const insertWhiskyCollectionSchema = createInsertSchema(userWhiskyCollection);
export const insertChatConversationSchema = createInsertSchema(chatConversations);
export const insertChatMessageSchema = createInsertSchema(chatMessages);
export const insertInviteSchema = createInsertSchema(invites);
export const insertMasterclassEventSchema = createInsertSchema(masterclassEvents);
export const insertMasterclassParticipantSchema = createInsertSchema(masterclassParticipants);
export const insertDailyTaskSchema = createInsertSchema(dailyTasks);
export const insertWeeklyTaskSchema = createInsertSchema(weeklyTasks);
export const insertAchievementSchema = createInsertSchema(achievements);
export const insertShareSchema = createInsertSchema(shares);
export const insertLikeSchema = createInsertSchema(likes);
export const insertStreamConfigSchema = createInsertSchema(streamConfigurations);
export const insertStreamStatsSchema = createInsertSchema(streamStats);
export const insertViewerAnalyticsSchema = createInsertSchema(viewerAnalytics);
export const insertCdnConfigSchema = createInsertSchema(cdnConfigs);
export const insertGroupMemberSchema = createInsertSchema(groupMembers);
export const insertGroupAchievementSchema = createInsertSchema(groupAchievements);
export const insertActivitySchema = createInsertSchema(activityFeed);

// Add the missing insertTastingGroupSchema export
export const insertTastingGroupSchema = createInsertSchema(tastingGroups);

// Add tasting session type export
export const insertTastingSessionSchema = createInsertSchema(tastingSessions);

// Add insert schemas for new tables
export const insertUserWhiskyPreferencesSchema = createInsertSchema(userWhiskyPreferences);
export const insertAICompanionProfileSchema = createInsertSchema(aiCompanionProfiles);
export const insertAIInteractionHistorySchema = createInsertSchema(aiInteractionHistory);
export const insertAIUnlockedFeaturesSchema = createInsertSchema(aiUnlockedFeatures);


// Type exports
export type User = InferModel<typeof users>;
export type Whisky = InferModel<typeof whiskies>;
export type Review = InferModel<typeof reviews>;
export type UserWhiskyCollection = InferModel<typeof userWhiskyCollection>;
export type ChatConversation = InferModel<typeof chatConversations>;
export type ChatMessage = InferModel<typeof chatMessages>;
export type Invite = InferModel<typeof invites>;
export type MasterclassEvent = InferModel<typeof masterclassEvents>;
export type MasterclassParticipant = InferModel<typeof masterclassParticipants>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertWhisky = z.infer<typeof insertWhiskySchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type InsertUserWhiskyCollection = z.infer<typeof insertWhiskyCollectionSchema>;
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type InsertInvite = z.infer<typeof insertInviteSchema>;
export type InsertMasterclassEvent = z.infer<typeof insertMasterclassEventSchema>;
export type InsertMasterclassParticipant = z.infer<typeof insertMasterclassParticipantSchema>;
export type ShippingAddress = InferModel<typeof shippingAddresses>;
export type SessionParticipant = InferModel<typeof sessionParticipants>;
export type ShareTrack = InferModel<typeof shares>;
export type InsertShareTrack = z.infer<typeof insertShareSchema>;
export type Like = InferModel<typeof likes>;
export type InsertLike = z.infer<typeof insertLikeSchema>;
export type TastingGroup = InferModel<typeof tastingGroups>;
export type GroupMember = InferModel<typeof groupMembers>;
export type GroupAchievement = InferModel<typeof groupAchievements>;
export type InsertTastingGroup = z.infer<typeof insertTastingGroupSchema>;
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type InsertGroupAchievement = z.infer<typeof insertGroupAchievementSchema>;
export type StreamConfiguration = InferModel<typeof streamConfigurations>;
export type StreamStats = InferModel<typeof streamStats>;
export type ViewerAnalytics = InferModel<typeof viewerAnalytics>;
export type CdnConfig = InferModel<typeof cdnConfigs>;
export type InsertStreamConfig = z.infer<typeof insertStreamConfigSchema>;
export type InsertStreamStats = z.infer<typeof insertStreamStatsSchema>;
export type InsertViewerAnalytics = z.infer<typeof insertViewerAnalyticsSchema>;
export type InsertCdnConfig = z.infer<typeof insertCdnConfigSchema>;
export type ActivityFeed = InferModel<typeof activityFeed>;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type DailyTask = InferModel<typeof dailyTasks>;
export type WeeklyTask = InferModel<typeof weeklyTasks>;
export type Achievement = InferModel<typeof achievements>;
export type ConciergePersonality = z.infer<typeof conciergePersonalitySchema>;
export type TastingSession = InferModel<typeof tastingSessions>;
export type InsertTastingSession = z.infer<typeof insertTastingSessionSchema>;
export type UserWhiskyPreferences = InferModel<typeof userWhiskyPreferences>;
export type AICompanionProfile = InferModel<typeof aiCompanionProfiles>;
export type AIInteractionHistory = InferModel<typeof aiInteractionHistory>;
export type AIUnlockedFeatures = InferModel<typeof aiUnlockedFeatures>;
export type InsertUserWhiskyPreferences = z.infer<typeof insertUserWhiskyPreferencesSchema>;
export type InsertAICompanionProfile = z.infer<typeof insertAICompanionProfileSchema>;
export type InsertAIInteractionHistory = z.infer<typeof insertAIInteractionHistorySchema>;
export type InsertAIUnlockedFeatures = z.infer<typeof insertAIUnlockedFeaturesSchema>;
import { pgTable, text, serial, integer, timestamp, doublePrecision, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type { InferModel } from 'drizzle-orm';

// Define concierge personality schema
export const conciergePersonalitySchema = z.object({
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

// Users and Authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  inviteCode: text("invite_code").notNull().unique(),
  invitedBy: integer("invited_by").references(() => users.id),
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
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  distillery: text("distillery").notNull(),
  type: text("type").notNull(),
  region: text("region"),
  age: integer("age"),
  abv: doublePrecision("abv"),
  price: doublePrecision("price"),
  imageUrl: text("image_url").notNull(),
  description: text("description"),
  tastingNotes: text("tasting_notes"),
  caskType: text("cask_type"),
  limited: integer("limited").default(0),
  vintage: text("vintage"),
  aroma: text("aroma"),
  palate: text("palate"),
  finish: text("finish"),
  founded: text("founded"),
  waterSource: text("water_source"),
  distilleryHistory: text("distillery_history"),
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

// ============= Insert Schemas =============

export const insertUserSchema = createInsertSchema(users).extend({
  email: z.string().email(),
  password: z.string().min(3),
  inviteCode: z.string().min(6),
  expertiseAreas: z.array(z.string()).optional(),
  socialLinks: z.record(z.string().url()).optional(),
});

export const insertWhiskySchema = createInsertSchema(whiskies).extend({
  abv: z.number().min(0).max(100),
  price: z.number().min(0).optional(),
  age: z.number().min(0).optional(),
  tastingNotes: z.string().min(1),
  description: z.string().min(10),
  region: z.string().min(1),
  aroma: z.string().optional(),
  palate: z.string().optional(),
  finish: z.string().optional(),
  awards: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })).default([]),
  founded: z.string().optional(),
  waterSource: z.string().optional(),
  distilleryHistory: z.string().optional(),
});

export const insertReviewSchema = createInsertSchema(reviews).extend({
  rating: z.number().min(0).max(10).step(0.1),
  nosing: z.string().optional(),
  palate: z.string().optional(),
  finish: z.string().optional(),
  videoUrl: z.string().url().optional(),
});

export const insertTastingSessionSchema = createInsertSchema(tastingSessions).extend({
  duration: z.number().min(15).max(480),
  maxParticipants: z.number().min(2).optional(),
  price: z.number().min(0).optional(),
});

export const insertTastingGroupSchema = createInsertSchema(tastingGroups).extend({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
});

export const insertGroupMemberSchema = createInsertSchema(groupMembers).extend({
  role: z.enum(["admin", "moderator", "member"]),
});

export const insertGroupAchievementSchema = createInsertSchema(groupAchievements).extend({
  name: z.string().min(3).max(50),
  description: z.string().min(10),
  criteria: z.record(z.unknown()),
});

export const insertActivitySchema = createInsertSchema(activityFeed).extend({
  activityType: z.enum([
    "review_created",
    "whisky_rated",
    "user_followed",
    "group_joined",
    "tasting_scheduled",
    "achievement_unlocked"
  ]),
  entityType: z.enum(["review", "whisky", "user", "group", "tasting_session", "achievement"]),
  metadata: z.record(z.unknown()).optional(),
  visibility: z.enum(["public", "followers", "private"]).default("public"),
});

export const insertShareSchema = createInsertSchema(shares);
export const insertLikeSchema = createInsertSchema(likes);
export const insertStreamConfigSchema = createInsertSchema(streamConfigurations);
export const insertStreamStatsSchema = createInsertSchema(streamStats);
export const insertViewerAnalyticsSchema = createInsertSchema(viewerAnalytics);
export const insertCdnConfigSchema = createInsertSchema(cdnConfigs);
export const insertDailyTaskSchema = createInsertSchema(dailyTasks);
export const insertWeeklyTaskSchema = createInsertSchema(weeklyTasks);
export const insertAchievementSchema = createInsertSchema(achievements);

// Add new insert schemas for new tables
export const insertInviteSchema = createInsertSchema(invites);
export const insertMasterclassEventSchema = createInsertSchema(masterclassEvents);
export const insertMasterclassParticipantSchema = createInsertSchema(masterclassParticipants);

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

// Create insert schema for whisky collection
export const insertWhiskyCollectionSchema = createInsertSchema(userWhiskyCollection).extend({
  rating: z.number().min(0).max(10).optional(),
  notes: z.string().optional(),
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

// Add new insert schemas
export const insertChatConversationSchema = createInsertSchema(chatConversations).extend({
  personalitySettings: z.record(z.unknown()).default({})
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).extend({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).default({}),
  personality: conciergePersonalitySchema.partial().optional()
});

// ============= Type Exports =============

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = InferModel<typeof users>;
export type Whisky = InferModel<typeof whiskies>;
export type Review = InferModel<typeof reviews>;
export type TastingSession = InferModel<typeof tastingSessions>;
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

// Add new type exports
export type Invite = InferModel<typeof invites>;
export type InsertInvite = z.infer<typeof insertInviteSchema>;
export type MasterclassEvent = InferModel<typeof masterclassEvents>;
export type InsertMasterclassEvent = z.infer<typeof insertMasterclassEventSchema>;
export type MasterclassParticipant = InferModel<typeof masterclassParticipants>;
export type InsertMasterclassParticipant = z.infer<typeof insertMasterclassParticipantSchema>;

// Add new type exports from edited code
export type UserWhiskyCollection = InferModel<typeof userWhiskyCollection>;
export type InsertUserWhiskyCollection = z.infer<typeof insertWhiskyCollectionSchema>;
export type ChatConversation = InferModel<typeof chatConversations>;
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;
export type ChatMessage = InferModel<typeof chatMessages>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ConciergePersonality = z.infer<typeof conciergePersonalitySchema>;
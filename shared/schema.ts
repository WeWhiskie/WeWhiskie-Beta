import { pgTable, text, serial, integer, timestamp, doublePrecision, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Existing users table with enhanced social features
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  location: text("location"),
  isExpert: integer("is_expert").default(0),
  followerCount: integer("follower_count").default(0),
  followingCount: integer("following_count").default(0),
  isVerified: boolean("is_verified").default(false),
  socialLinks: jsonb("social_links"),  // Store social media links
  expertiseAreas: text("expertise_areas").array(), // Specific whisky expertise
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

// Existing whiskies table remains the same
export const whiskies = pgTable("whiskies", {
  id: serial("id").primaryKey(),
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
});

// Enhanced reviews with video support
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  whiskyId: integer("whisky_id")
    .notNull()
    .references(() => whiskies.id),
  rating: doublePrecision("rating").notNull(), // Changed from integer to doublePrecision
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
  duration: integer("duration").notNull(), // in minutes
  maxParticipants: integer("max_participants"),
  price: doublePrecision("price").default(0),
  isPrivate: boolean("is_private").default(false),
  streamUrl: text("stream_url"),
  status: text("status").default("scheduled"), // scheduled, live, ended
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
  status: text("status").default("registered"), // registered, attended
});

// User shipping addresses
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

// Additional table for tracking social shares
export const shares = pgTable("shares", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  platform: text("platform").notNull(), // twitter, facebook, linkedin
  url: text("url").notNull(),
  title: text("title").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Add likes table after shares table
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
  role: text("role").default("member"), // admin, moderator, member
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
  criteria: jsonb("criteria").notNull(), // JSON object defining achievement criteria
  unlockedAt: timestamp("unlocked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).extend({
  email: z.string().email(),
  password: z.string().min(8),
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
});

export const insertReviewSchema = createInsertSchema(reviews).extend({
  rating: z.number().min(0).max(10).step(0.1), // Updated validation for decimal ratings
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

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Whisky = typeof whiskies.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type TastingSession = typeof tastingSessions.$inferSelect;
import type { InferSelect } from 'drizzle-orm';
export type ShippingAddress = typeof shippingAddresses.$inferSelect;
export type SessionParticipant = typeof sessionParticipants.$inferSelect;
export type ShareTrack = typeof shares.$inferSelect;
export const insertShareSchema = createInsertSchema(shares);
export type InsertShareTrack = z.infer<typeof insertShareSchema>;

// Add to type exports
export type Like = typeof likes.$inferSelect;
export const insertLikeSchema = createInsertSchema(likes);
export type InsertLike = z.infer<typeof insertLikeSchema>;

export type TastingGroup = typeof tastingGroups.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;
export type GroupAchievement = typeof groupAchievements.$inferSelect;
export type InsertTastingGroup = z.infer<typeof insertTastingGroupSchema>;
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type InsertGroupAchievement = z.infer<typeof insertGroupAchievementSchema>;


// Stream Configuration for different quality levels
export const streamConfigurations = pgTable("stream_configurations", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => tastingSessions.id),
  quality: text("quality").notNull(), // 1080p, 720p, 480p, 360p
  bitrate: integer("bitrate").notNull(), // in kbps
  framerate: integer("framerate").notNull(),
  keyframeInterval: integer("keyframe_interval").notNull(),
  audioQuality: integer("audio_quality").notNull(), // in kbps
  enabled: boolean("enabled").default(true),
});

// Stream Statistics for monitoring
export const streamStats = pgTable("stream_stats", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => tastingSessions.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  currentViewers: integer("current_viewers").default(0),
  peakViewers: integer("peak_viewers").default(0),
  bandwidth: integer("bandwidth").default(0), // in bytes
  cpuUsage: doublePrecision("cpu_usage"),
  memoryUsage: integer("memory_usage"), // in bytes
  streamHealth: integer("stream_health").default(100), // 0-100
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
  watchDuration: integer("watch_duration").default(0), // in seconds
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

// Add insert schemas
export const insertStreamConfigSchema = createInsertSchema(streamConfigurations);
export const insertStreamStatsSchema = createInsertSchema(streamStats);
export const insertViewerAnalyticsSchema = createInsertSchema(viewerAnalytics);
export const insertCdnConfigSchema = createInsertSchema(cdnConfigs);

// Add types
export type StreamConfiguration = typeof streamConfigurations.$inferSelect;
export type StreamStats = typeof streamStats.$inferSelect;
export type ViewerAnalytics = typeof viewerAnalytics.$inferSelect;
export type CdnConfig = typeof cdnConfigs.$inferSelect;

export type InsertStreamConfig = z.infer<typeof insertStreamConfigSchema>;
export type InsertStreamStats = z.infer<typeof insertStreamStatsSchema>;
export type InsertViewerAnalytics = z.infer<typeof insertViewerAnalyticsSchema>;
export type InsertCdnConfig = z.infer<typeof insertCdnConfigSchema>;
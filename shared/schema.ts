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

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Whisky = typeof whiskies.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type TastingSession = typeof tastingSessions.$inferSelect;
export type ShippingAddress = typeof shippingAddresses.$inferSelect;
export type SessionParticipant = typeof sessionParticipants.$inferSelect;
export type ShareTrack = typeof shares.$inferSelect;
export const insertShareSchema = createInsertSchema(shares);
export type InsertShareTrack = z.infer<typeof insertShareSchema>;
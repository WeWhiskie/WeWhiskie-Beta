import { pgTable, text, serial, integer, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  location: text("location"),
  isExpert: integer("is_expert").default(0),
});

export const whiskies = pgTable("whiskies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  distillery: text("distillery").notNull(),
  type: text("type").notNull(), // bourbon, scotch, etc
  region: text("region"), // Temporarily nullable: Speyside, Highland, Kentucky, etc
  age: integer("age"), // Age statement in years
  abv: doublePrecision("abv"), // Temporarily nullable: Alcohol by volume
  price: doublePrecision("price"), // Retail price (USD)
  imageUrl: text("image_url").notNull(),
  description: text("description"), // Temporarily nullable
  tastingNotes: text("tasting_notes"), // Temporarily nullable: Comma-separated list of tasting notes
  caskType: text("cask_type"), // Type of cask used for aging
  limited: integer("limited").default(0), // Is this a limited edition?
  vintage: text("vintage"), // Vintage year if applicable
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  whiskyId: integer("whisky_id")
    .notNull()
    .references(() => whiskies.id),
  rating: integer("rating").notNull(),
  content: text("content").notNull(),
  nosing: text("nosing"), // Nosing notes
  palate: text("palate"), // Palate notes
  finish: text("finish"), // Finish notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  likes: integer("likes").default(0),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
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
  rating: z.number().min(1).max(5),
  nosing: z.string().optional(),
  palate: z.string().optional(),
  finish: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Whisky = typeof whiskies.$inferSelect;
export type Review = typeof reviews.$inferSelect;
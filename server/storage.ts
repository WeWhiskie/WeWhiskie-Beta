import { db } from "./db";
import { InsertUser, User, Whisky, Review, insertWhiskySchema } from "@shared/schema";
import { users, whiskies, reviews } from "@shared/schema";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  sessionStore: session.Store;

  // Whisky methods
  getWhiskies(): Promise<Whisky[]>;
  getWhisky(id: number): Promise<Whisky | undefined>;

  // Review methods
  getReviews(): Promise<(Review & { user: User; whisky: Whisky })[]>;
  getUserReviews(userId: number): Promise<(Review & { whisky: Whisky })[]>;
  createReview(review: Omit<Review, "id" | "createdAt">): Promise<Review>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getWhiskies(): Promise<Whisky[]> {
    return await db.select().from(whiskies);
  }

  async getWhisky(id: number): Promise<Whisky | undefined> {
    const [whisky] = await db.select().from(whiskies).where(eq(whiskies.id, id));
    return whisky;
  }

  async getReviews(): Promise<(Review & { user: User; whisky: Whisky })[]> {
    return await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        content: reviews.content,
        createdAt: reviews.createdAt,
        user: users,
        whisky: whiskies,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .innerJoin(whiskies, eq(reviews.whiskyId, whiskies.id));
  }

  async getUserReviews(userId: number): Promise<(Review & { whisky: Whisky })[]> {
    return await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        content: reviews.content,
        createdAt: reviews.createdAt,
        userId: reviews.userId,
        whisky: whiskies,
      })
      .from(reviews)
      .innerJoin(whiskies, eq(reviews.whiskyId, whiskies.id))
      .where(eq(reviews.userId, userId));
  }

  async createReview(review: Omit<Review, "id" | "createdAt">): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    return newReview;
  }
}

export const storage = new DatabaseStorage();
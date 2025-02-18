import { db } from "./db";
import { 
  InsertUser, User, Whisky, Review, TastingSession, ShippingAddress,
  users, whiskies, reviews, follows, tastingSessions, shippingAddresses, sessionParticipants 
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;

  // Follow methods
  followUser(followerId: number, followingId: number): Promise<void>;
  unfollowUser(followerId: number, followingId: number): Promise<void>;
  getFollowers(userId: number): Promise<User[]>;
  getFollowing(userId: number): Promise<User[]>;

  // Whisky methods
  getWhiskies(): Promise<Whisky[]>;
  getWhisky(id: number): Promise<Whisky | undefined>;

  // Review methods
  getReviews(): Promise<(Review & { user: User; whisky: Whisky })[]>;
  getUserReviews(userId: number): Promise<(Review & { whisky: Whisky })[]>;
  createReview(review: Omit<Review, "id" | "createdAt">): Promise<Review>;

  // Tasting session methods
  createTastingSession(session: Omit<TastingSession, "id" | "createdAt">): Promise<TastingSession>;
  getTastingSessions(): Promise<(TastingSession & { host: User })[]>;
  getUserSessions(userId: number): Promise<TastingSession[]>;
  joinSession(sessionId: number, userId: number): Promise<void>;
  getTastingSession(id: number): Promise<TastingSession | undefined>;
  updateTastingSessionStatus(id: number, status: 'scheduled' | 'live' | 'ended'): Promise<TastingSession>;
  getSessionParticipants(sessionId: number): Promise<User[]>;

  // Shipping address methods
  addShippingAddress(address: Omit<ShippingAddress, "id">): Promise<ShippingAddress>;
  getUserAddresses(userId: number): Promise<ShippingAddress[]>;
  setDefaultAddress(userId: number, addressId: number): Promise<void>;

  sessionStore: session.Store;
}

type ReviewWithRelations = {
  review: Review;
  user: User;
  whisky: Whisky;
};

type ReviewWithWhisky = {
  review: Review;
  whisky: Whisky;
};

type TastingSessionWithHost = {
  session: TastingSession;
  host: User;
};

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // User methods
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

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Follow methods
  async followUser(followerId: number, followingId: number): Promise<void> {
    await db.insert(follows).values({ followerId, followingId });
    await db
      .update(users)
      .set({ 
        followerCount: sql`COALESCE(${users.followerCount}, 0) + 1` 
      })
      .where(eq(users.id, followingId));
    await db
      .update(users)
      .set({ 
        followingCount: sql`COALESCE(${users.followingCount}, 0) + 1` 
      })
      .where(eq(users.id, followerId));
  }

  async unfollowUser(followerId: number, followingId: number): Promise<void> {
    await db
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId)
        )
      );
    await db
      .update(users)
      .set({ 
        followerCount: sql`GREATEST(COALESCE(${users.followerCount}, 0) - 1, 0)` 
      })
      .where(eq(users.id, followingId));
    await db
      .update(users)
      .set({ 
        followingCount: sql`GREATEST(COALESCE(${users.followingCount}, 0) - 1, 0)` 
      })
      .where(eq(users.id, followerId));
  }

  async getFollowers(userId: number): Promise<User[]> {
    const result = await db
      .select()
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId));
    return result.map(row => row.users);
  }

  async getFollowing(userId: number): Promise<User[]> {
    const result = await db
      .select()
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId));
    return result.map(row => row.users);
  }

  // Whisky methods
  async getWhiskies(): Promise<Whisky[]> {
    return await db.select().from(whiskies);
  }

  async getWhisky(id: number): Promise<Whisky | undefined> {
    const [whisky] = await db.select().from(whiskies).where(eq(whiskies.id, id));
    return whisky;
  }

  // Review methods
  async getReviews(): Promise<(Review & { user: User; whisky: Whisky })[]> {
    const result = await db
      .select({
        review: reviews,
        user: users,
        whisky: whiskies,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .innerJoin(whiskies, eq(reviews.whiskyId, whiskies.id)) as ReviewWithRelations[];

    return result.map(({ review, user, whisky }) => ({
      ...review,
      user,
      whisky,
    }));
  }

  async getUserReviews(userId: number): Promise<(Review & { whisky: Whisky })[]> {
    const result = await db
      .select({
        review: reviews,
        whisky: whiskies,
      })
      .from(reviews)
      .innerJoin(whiskies, eq(reviews.whiskyId, whiskies.id))
      .where(eq(reviews.userId, userId)) as ReviewWithWhisky[];

    return result.map(({ review, whisky }) => ({
      ...review,
      whisky,
    }));
  }

  async createReview(review: Omit<Review, "id" | "createdAt">): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    return newReview;
  }

  // Tasting session methods
  async createTastingSession(session: Omit<TastingSession, "id" | "createdAt">): Promise<TastingSession> {
    const [newSession] = await db.insert(tastingSessions).values(session).returning();
    return newSession;
  }

  async getTastingSessions(): Promise<(TastingSession & { host: User })[]> {
    const result = await db
      .select({
        session: tastingSessions,
        host: users,
      })
      .from(tastingSessions)
      .innerJoin(users, eq(tastingSessions.hostId, users.id)) as TastingSessionWithHost[];

    return result.map(({ session, host }) => ({
      ...session,
      host,
    }));
  }

  async getUserSessions(userId: number): Promise<TastingSession[]> {
    return await db
      .select()
      .from(tastingSessions)
      .where(eq(tastingSessions.hostId, userId));
  }

  async joinSession(sessionId: number, userId: number): Promise<void> {
    await db.insert(sessionParticipants).values({
      sessionId,
      userId,
      status: 'registered',
    });
  }

  async getTastingSession(id: number): Promise<TastingSession | undefined> {
    const [session] = await db
      .select()
      .from(tastingSessions)
      .where(eq(tastingSessions.id, id));
    return session;
  }

  async updateTastingSessionStatus(
    id: number,
    status: 'scheduled' | 'live' | 'ended'
  ): Promise<TastingSession> {
    const [session] = await db
      .update(tastingSessions)
      .set({ status })
      .where(eq(tastingSessions.id, id))
      .returning();
    return session;
  }

  async getSessionParticipants(sessionId: number): Promise<User[]> {
    const result = await db
      .select({
        user: users,
      })
      .from(sessionParticipants)
      .innerJoin(users, eq(sessionParticipants.userId, users.id))
      .where(eq(sessionParticipants.sessionId, sessionId));

    return result.map(row => row.user);
  }

  // Shipping address methods
  async addShippingAddress(address: Omit<ShippingAddress, "id">): Promise<ShippingAddress> {
    if (address.isDefault) {
      await db
        .update(shippingAddresses)
        .set({ isDefault: false })
        .where(eq(shippingAddresses.userId, address.userId));
    }
    const [newAddress] = await db.insert(shippingAddresses).values(address).returning();
    return newAddress;
  }

  async getUserAddresses(userId: number): Promise<ShippingAddress[]> {
    return await db
      .select()
      .from(shippingAddresses)
      .where(eq(shippingAddresses.userId, userId));
  }

  async setDefaultAddress(userId: number, addressId: number): Promise<void> {
    await db
      .update(shippingAddresses)
      .set({ isDefault: false })
      .where(eq(shippingAddresses.userId, userId));
    await db
      .update(shippingAddresses)
      .set({ isDefault: true })
      .where(eq(shippingAddresses.id, addressId));
  }
}

export const storage = new DatabaseStorage();
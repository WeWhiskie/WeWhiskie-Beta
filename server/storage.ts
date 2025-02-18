import { InsertUser, User, Whisky, Review, insertWhiskySchema } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private whiskies: Map<number, Whisky>;
  private reviews: Map<number, Review>;
  private currentId: { users: number; whiskies: number; reviews: number };
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.whiskies = new Map();
    this.reviews = new Map();
    this.currentId = { users: 1, whiskies: 1, reviews: 1 };
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    // Seed some whiskies
    const mockWhiskies = [
      {
        name: "Macallan 18",
        distillery: "The Macallan",
        type: "Scotch",
        imageUrl: "https://images.unsplash.com/photo-1530894671637-69f12947b43a",
      },
      {
        name: "Buffalo Trace",
        distillery: "Buffalo Trace",
        type: "Bourbon",
        imageUrl: "https://images.unsplash.com/photo-1611072965169-e1534f6f300c",
      },
    ];

    mockWhiskies.forEach((whisky) => {
      const validated = insertWhiskySchema.parse(whisky);
      const id = this.currentId.whiskies++;
      this.whiskies.set(id, { ...validated, id });
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const user = { ...insertUser, id, bio: null, avatarUrl: null };
    this.users.set(id, user);
    return user;
  }

  async getWhiskies(): Promise<Whisky[]> {
    return Array.from(this.whiskies.values());
  }

  async getWhisky(id: number): Promise<Whisky | undefined> {
    return this.whiskies.get(id);
  }

  async getReviews(): Promise<(Review & { user: User; whisky: Whisky })[]> {
    return Array.from(this.reviews.values())
      .map((review) => {
        const user = this.users.get(review.userId);
        const whisky = this.whiskies.get(review.whiskyId);
        if (!user || !whisky) return null;
        return { ...review, user, whisky };
      })
      .filter((r): r is Review & { user: User; whisky: Whisky } => r !== null);
  }

  async getUserReviews(userId: number): Promise<(Review & { whisky: Whisky })[]> {
    return Array.from(this.reviews.values())
      .filter((review) => review.userId === userId)
      .map((review) => {
        const whisky = this.whiskies.get(review.whiskyId);
        if (!whisky) return null;
        return { ...review, whisky };
      })
      .filter((r): r is Review & { whisky: Whisky } => r !== null);
  }

  async createReview(review: Omit<Review, "id" | "createdAt">): Promise<Review> {
    const id = this.currentId.reviews++;
    const newReview = {
      ...review,
      id,
      createdAt: new Date(),
    };
    this.reviews.set(id, newReview);
    return newReview;
  }
}

export const storage = new MemStorage();

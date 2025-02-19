import { db } from "./db";
import { 
  InsertUser, User, Whisky, Review, TastingSession, ShippingAddress,
  users, whiskies, reviews, follows, tastingSessions, shippingAddresses, sessionParticipants, shares, ShareTrack,
  likes, Like, InsertTastingGroup, TastingGroup, GroupMember, InsertGroupAchievement, GroupAchievement, groupMembers, tastingGroups, groupAchievements,
  InsertStreamConfig, StreamConfiguration, InsertStreamStats, StreamStats, InsertViewerAnalytics, ViewerAnalytics, InsertCdnConfig, CdnConfig, streamConfigurations, streamStats, viewerAnalytics, cdnConfigs,
  activityFeed, ActivityFeed, InsertActivity, DailyTask, dailyTasks, WeeklyTask, weeklyTasks, Achievement, achievements
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
  getReview(id: number): Promise<(Review & { user: User; whisky: Whisky }) | undefined>;

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
  // Share tracking methods
  trackShare(shareData: Omit<ShareTrack, "id">): Promise<ShareTrack>;
  // Like methods
  likeReview(userId: number, reviewId: number): Promise<void>;
  unlikeReview(userId: number, reviewId: number): Promise<void>;
  getLikes(reviewId: number): Promise<number>;
  hasUserLiked(userId: number, reviewId: number): Promise<boolean>;

  // Group methods
  createTastingGroup(group: InsertTastingGroup): Promise<TastingGroup>;
  getTastingGroup(id: number): Promise<TastingGroup | undefined>;
  getTastingGroups(): Promise<(TastingGroup & { creator: User })[]>;
  getUserGroups(userId: number): Promise<TastingGroup[]>;

  // Group membership methods
  addGroupMember(groupId: number, userId: number, role?: string): Promise<void>;
  removeGroupMember(groupId: number, userId: number): Promise<void>;
  getGroupMembers(groupId: number): Promise<(GroupMember & { user: User })[]>;
  isGroupMember(groupId: number, userId: number): Promise<boolean>;

  // Group achievements methods
  createGroupAchievement(achievement: InsertGroupAchievement): Promise<GroupAchievement>;
  getGroupAchievements(groupId: number): Promise<GroupAchievement[]>;
  updateAchievementStatus(groupId: number, achievementId: number): Promise<void>;

  // Stream configuration methods
  createStreamConfig(config: InsertStreamConfig): Promise<StreamConfiguration>;
  getStreamConfigs(sessionId: number): Promise<StreamConfiguration[]>;
  updateStreamConfig(id: number, updates: Partial<StreamConfiguration>): Promise<StreamConfiguration>;

  // Stream statistics methods
  recordStreamStats(stats: InsertStreamStats): Promise<StreamStats>;
  getStreamStats(sessionId: number): Promise<StreamStats[]>;
  getLatestStreamStats(sessionId: number): Promise<StreamStats | undefined>;

  // Viewer analytics methods
  recordViewerAnalytics(analytics: InsertViewerAnalytics): Promise<ViewerAnalytics>;
  getViewerAnalytics(sessionId: number): Promise<ViewerAnalytics[]>;
  getViewerCount(sessionId: number): Promise<number>;

  // CDN configuration methods
  createCdnConfig(config: InsertCdnConfig): Promise<CdnConfig>;
  getCdnConfigs(sessionId: number): Promise<CdnConfig[]>;
  getActiveCdnConfig(sessionId: number): Promise<CdnConfig | undefined>;
  updateCdnConfig(id: number, updates: Partial<CdnConfig>): Promise<CdnConfig>;

  // Activity methods
  getActivities(options: { visibility: string[] }): Promise<ActivityFeed[]>;
  getUserActivities(userId: number): Promise<ActivityFeed[]>;
  createActivity(activity: InsertActivity): Promise<ActivityFeed>;

  // User progression methods
  updateUserProgress(userId: number, points: number): Promise<User>;
  getUserLevel(userId: number): Promise<{ level: number; points: number }>;
  updateUserStreak(userId: number): Promise<{ streak: number; reward: number }>;

  // Tasks and achievements methods
  createDailyTasks(userId: number): Promise<DailyTask[]>;
  getDailyTasks(userId: number): Promise<DailyTask[]>;
  updateTaskProgress(taskId: number, progress: number): Promise<DailyTask>;
  createWeeklyTasks(userId: number): Promise<WeeklyTask[]>;
  getWeeklyTasks(userId: number): Promise<WeeklyTask[]>;

  // Achievement methods
  getAchievements(): Promise<Achievement[]>;
  getUserAchievements(userId: number): Promise<Achievement[]>;
  unlockAchievement(userId: number, achievementId: number): Promise<void>;
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
      .innerJoin(whiskies, eq(reviews.whiskyId, whiskies.id))
      .orderBy(sql`${reviews.createdAt} DESC`) as ReviewWithRelations[];

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
      .where(eq(reviews.userId, userId))
      .orderBy(sql`${reviews.createdAt} DESC`) as ReviewWithWhisky[];

    return result.map(({ review, whisky }) => ({
      ...review,
      whisky,
    }));
  }

  async createReview(review: Omit<Review, "id" | "createdAt">): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    return newReview;
  }

  async getReview(id: number): Promise<(Review & { user: User; whisky: Whisky }) | undefined> {
    const [result] = await db
      .select({
        review: reviews,
        user: users,
        whisky: whiskies,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .innerJoin(whiskies, eq(reviews.whiskyId, whiskies.id))
      .where(eq(reviews.id, id));

    if (!result) return undefined;

    const { review, user, whisky } = result;
    return {
      ...review,
      user,
      whisky,
    };
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
  async trackShare(shareData: Omit<ShareTrack, "id">): Promise<ShareTrack> {
    const [share] = await db.insert(shares).values(shareData).returning();
    return share;
  }
  // Like methods
  async likeReview(userId: number, reviewId: number): Promise<void> {
    await db.insert(likes).values({ userId, reviewId });
    await db
      .update(reviews)
      .set({ 
        likes: sql`COALESCE(${reviews.likes}, 0) + 1` 
      })
      .where(eq(reviews.id, reviewId));
  }

  async unlikeReview(userId: number, reviewId: number): Promise<void> {
    await db
      .delete(likes)
      .where(
        and(
          eq(likes.userId, userId),
          eq(likes.reviewId, reviewId)
        )
      );
    await db
      .update(reviews)
      .set({ 
        likes: sql`GREATEST(COALESCE(${reviews.likes}, 0) - 1, 0)` 
      })
      .where(eq(reviews.id, reviewId));
  }

  async getLikes(reviewId: number): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(likes)
      .where(eq(likes.reviewId, reviewId));
    return result?.count || 0;
  }

  async hasUserLiked(userId: number, reviewId: number): Promise<boolean> {
    const [like] = await db
      .select()
      .from(likes)
      .where(
        and(
          eq(likes.userId, userId),
          eq(likes.reviewId, reviewId)
        )
      );
    return !!like;
  }

  // Group methods
  async createTastingGroup(group: InsertTastingGroup): Promise<TastingGroup> {
    const [newGroup] = await db.insert(tastingGroups).values(group).returning();
    return newGroup;
  }

  async getTastingGroup(id: number): Promise<TastingGroup | undefined> {
    const [group] = await db.select().from(tastingGroups).where(eq(tastingGroups.id, id));
    return group;
  }

  async getTastingGroups(): Promise<(TastingGroup & { creator: User })[]> {
    const result = await db
      .select({
        group: tastingGroups,
        creator: users,
      })
      .from(tastingGroups)
      .innerJoin(users, eq(tastingGroups.createdBy, users.id));

    return result.map(({ group, creator }) => ({
      ...group,
      creator,
    }));
  }

  async getUserGroups(userId: number): Promise<TastingGroup[]> {
    const result = await db
      .select({
        group: tastingGroups,
      })
      .from(groupMembers)
      .innerJoin(tastingGroups, eq(groupMembers.groupId, tastingGroups.id))
      .where(eq(groupMembers.userId, userId));

    return result.map(({ group }) => group);
  }

  // Group membership methods
  async addGroupMember(groupId: number, userId: number, role: string = "member"): Promise<void> {
    await db.insert(groupMembers).values({ groupId, userId, role });
    await db
      .update(tastingGroups)
      .set({ 
        memberCount: sql`${tastingGroups.memberCount} + 1` 
      })
      .where(eq(tastingGroups.id, groupId));
  }

  async removeGroupMember(groupId: number, userId: number): Promise<void> {
    await db
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, userId)
        )
      );
    await db
      .update(tastingGroups)
      .set({ 
        memberCount: sql`GREATEST(${tastingGroups.memberCount} - 1, 0)` 
      })
      .where(eq(tastingGroups.id, groupId));
  }

  async getGroupMembers(groupId: number): Promise<(GroupMember & { user: User })[]> {
    const result = await db
      .select({
        member: groupMembers,
        user: users,
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, groupId));

    return result.map(({ member, user }) => ({
      ...member,
      user,
    }));
  }

  async isGroupMember(groupId: number, userId: number): Promise<boolean> {
    const [member] = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, userId)
        )
      );
    return !!member;
  }

  // Group achievements methods
  async createGroupAchievement(achievement: InsertGroupAchievement): Promise<GroupAchievement> {
    const [newAchievement] = await db
      .insert(groupAchievements)
      .values(achievement)
      .returning();
    return newAchievement;
  }

  async getGroupAchievements(groupId: number): Promise<GroupAchievement[]> {
    return await db
      .select()
      .from(groupAchievements)
      .where(eq(groupAchievements.groupId, groupId))
      .orderBy(groupAchievements.createdAt);
  }

  async updateAchievementStatus(groupId: number, achievementId: number): Promise<void> {
    await db
      .update(groupAchievements)
      .set({ unlockedAt: sql`CURRENT_TIMESTAMP` })
      .where(
        and(
          eq(groupAchievements.id, achievementId),
          eq(groupAchievements.groupId, groupId)
        )
      );
  }

  // Stream configuration implementations
  async createStreamConfig(config: InsertStreamConfig): Promise<StreamConfiguration> {
    const [newConfig] = await db.insert(streamConfigurations).values(config).returning();
    return newConfig;
  }

  async getStreamConfigs(sessionId: number): Promise<StreamConfiguration[]> {
    return await db
      .select()
      .from(streamConfigurations)
      .where(eq(streamConfigurations.sessionId, sessionId));
  }

  async updateStreamConfig(id: number, updates: Partial<StreamConfiguration>): Promise<StreamConfiguration> {
    const [updated] = await db
      .update(streamConfigurations)
      .set(updates)
      .where(eq(streamConfigurations.id, id))
      .returning();
    return updated;
  }

  // Stream statistics implementations
  async recordStreamStats(stats: InsertStreamStats): Promise<StreamStats> {
    const [newStats] = await db.insert(streamStats).values(stats).returning();
    return newStats;
  }

  async getStreamStats(sessionId: number): Promise<StreamStats[]> {
    return await db
      .select()
      .from(streamStats)
      .where(eq(streamStats.sessionId, sessionId))
      .orderBy(sql`${streamStats.timestamp} DESC`);
  }

  async getLatestStreamStats(sessionId: number): Promise<StreamStats | undefined> {
    const [latest] = await db
      .select()
      .from(streamStats)
      .where(eq(streamStats.sessionId, sessionId))
      .orderBy(sql`${streamStats.timestamp} DESC`)
      .limit(1);
    return latest;
  }

  // Viewer analytics implementations
  async recordViewerAnalytics(analytics: InsertViewerAnalytics): Promise<ViewerAnalytics> {
    const [newAnalytics] = await db.insert(viewerAnalytics).values(analytics).returning();
    return newAnalytics;
  }

  async getViewerAnalytics(sessionId: number): Promise<ViewerAnalytics[]> {
    return await db
      .select()
      .from(viewerAnalytics)
      .where(eq(viewerAnalytics.sessionId, sessionId))
      .orderBy(sql`${viewerAnalytics.timestamp} DESC`);
  }

  async getViewerCount(sessionId: number): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(viewerAnalytics)
      .where(eq(viewerAnalytics.sessionId, sessionId));
    return result?.count || 0;
  }

  // CDN configuration implementations
  async createCdnConfig(config: InsertCdnConfig): Promise<CdnConfig> {
    const [newConfig] = await db.insert(cdnConfigs).values(config).returning();
    return newConfig;
  }

  async getCdnConfigs(sessionId: number): Promise<CdnConfig[]> {
    return await db
      .select()
      .from(cdnConfigs)
      .where(eq(cdnConfigs.sessionId, sessionId));
  }

  async getActiveCdnConfig(sessionId: number): Promise<CdnConfig | undefined> {
    const [config] = await db
      .select()
      .from(cdnConfigs)
      .where(
        and(
          eq(cdnConfigs.sessionId, sessionId),
          eq(cdnConfigs.active, true)
        )
      );
    return config;
  }

  async updateCdnConfig(id: number, updates: Partial<CdnConfig>): Promise<CdnConfig> {
    const [updated] = await db
      .update(cdnConfigs)
      .set(updates)
      .where(eq(cdnConfigs.id, id))
      .returning();
    return updated;
  }

  // Activity methods implementation
  async getActivities(options: { visibility: string[] }): Promise<ActivityFeed[]> {
    const activities = await db
      .select()
      .from(activityFeed)
      .where(sql`${activityFeed.visibility} = ANY(ARRAY[${sql.join(options.visibility, sql`, `)}])`)
      .orderBy(sql`${activityFeed.createdAt} DESC`);

    // Fetch related user data for each activity
    const activitiesWithData = await Promise.all(
      activities.map(async (activity) => {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, activity.userId));

        let metadata: any = activity.metadata || {};

        // Add username to metadata
        if (user) {
          metadata.username = user.username;
        }

        // Add entity-specific data based on activity type
        if (activity.entityType === "whisky") {
          const [whisky] = await db
            .select()
            .from(whiskies)
            .where(eq(whiskies.id, activity.entityId));
          if (whisky) {
            metadata.whiskyName = whisky.name;
          }
        } else if (activity.entityType === "user") {
          const [targetUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, activity.entityId));
          if (targetUser) {
            metadata.targetUsername = targetUser.username;
          }
        }

        return {
          ...activity,
          metadata,
        };
      })
    );

    return activitiesWithData;
  }

  async getUserActivities(userId: number): Promise<ActivityFeed[]> {
    const activities = await db
      .select()
      .from(activityFeed)
      .where(eq(activityFeed.userId, userId))
      .orderBy(sql`${activityFeed.createdAt} DESC`);

    return activities;
  }

  async createActivity(activity: InsertActivity): Promise<ActivityFeed> {
    const [newActivity] = await db
      .insert(activityFeed)
      .values(activity)
      .returning();
    return newActivity;
  }

  async updateUserProgress(userId: number, points: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        experiencePoints: sql`${users.experiencePoints} + ${points}`,
        level: sql`CASE 
          WHEN ${users.experiencePoints} + ${points} >= 1000 THEN 5
          WHEN ${users.experiencePoints} + ${points} >= 500 THEN 4
          WHEN ${users.experiencePoints} + ${points} >= 250 THEN 3
          WHEN ${users.experiencePoints} + ${points} >= 100 THEN 2
          ELSE 1
        END`
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserLevel(userId: number): Promise<{ level: number; points: number }> {
    const [user] = await db
      .select({
        level: users.level,
        points: users.experiencePoints,
      })
      .from(users)
      .where(eq(users.id, userId));

    // Ensure we return valid numbers even if the database has nulls
    return {
      level: user?.level ?? 1,
      points: user?.points ?? 0
    };
  }

  async updateUserStreak(userId: number): Promise<{ streak: number; reward: number }> {
    const [user] = await db
      .update(users)
      .set({ 
        dailyStreak: sql`CASE 
          WHEN ${users.lastCheckIn} >= CURRENT_DATE - INTERVAL '1 day' 
          THEN COALESCE(${users.dailyStreak}, 0) + 1 
          ELSE 1 
        END`,
        lastCheckIn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(users.id, userId))
      .returning();

    const currentStreak = user?.dailyStreak ?? 1;
    const reward = Math.min(Math.floor(currentStreak / 7) * 10, 50);
    return { streak: currentStreak, reward };
  }

  async createDailyTasks(userId: number): Promise<DailyTask[]> {
    const tasks = [
      {
        userId,
        taskType: 'review',
        required: 1,
        reward: 10,
        date: new Date(),
      },
      {
        userId,
        taskType: 'tasting',
        required: 1,
        reward: 15,
        date: new Date(),
      },
      {
        userId,
        taskType: 'comment',
        required: 3,
        reward: 5,
        date: new Date(),
      },
    ];

    return await db.insert(dailyTasks).values(tasks).returning();
  }

  async getDailyTasks(userId: number): Promise<DailyTask[]> {
    return await db
      .select()
      .from(dailyTasks)
      .where(
        and(
          eq(dailyTasks.userId, userId),
          sql`DATE(${dailyTasks.date}) = CURRENT_DATE`
        )
      );
  }

  async updateTaskProgress(taskId: number, progress: number): Promise<DailyTask> {
    const [task] = await db
      .update(dailyTasks)
      .set({ 
        progress,
        completed: sql`CASE WHEN ${progress} >= ${dailyTasks.required} THEN true ELSE false END`
      })
      .where(eq(dailyTasks.id, taskId))
      .returning();
    return task;
  }

  async createWeeklyTasks(userId: number): Promise<WeeklyTask[]> {
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const tasks = [
      {
        userId,
        taskType: 'host_tasting',
        required: 1,
        reward: 50,
        weekStart,
        weekEnd,
      },
      {
        userId,
        taskType: 'reviews',
        required: 5,
        reward: 30,
        weekStart,
        weekEnd,
      },
      {
        userId,
        taskType: 'social_shares',
        required: 3,
        reward: 20,
        weekStart,
        weekEnd,
      },
    ];

    return await db.insert(weeklyTasks).values(tasks).returning();
  }

  async getWeeklyTasks(userId: number): Promise<WeeklyTask[]> {
    return await db
      .select()
      .from(weeklyTasks)
      .where(
        and(
          eq(weeklyTasks.userId, userId),
          sql`${weeklyTasks.weekEnd} >= CURRENT_DATE`
        )
      );
  }

  async getAchievements(): Promise<Achievement[]> {
    return await db.select().from(achievements);
  }

  async getUserAchievements(userId: number): Promise<Achievement[]> {
    const user = await this.getUser(userId);
    if (!user?.achievementBadges) return [];

    const achievementIds = (user.achievementBadges as any[]).map(badge => badge.id);
    return await db
      .select()
      .from(achievements)
      .where(sql`${achievements.id} = ANY(${achievementIds})`);
  }

  async unlockAchievement(userId: number, achievementId: number): Promise<void> {
    const [achievement] = await db
      .select()
      .from(achievements)
      .where(eq(achievements.id, achievementId));

    if (!achievement) return;

    await db
      .update(users)
      .set({
        achievementBadges: sql`COALESCE(${users.achievementBadges}, '[]'::jsonb) || ${sql.json({
          id: achievement.id,
          name: achievement.name,
          unlockedAt: new Date().toISOString(),
        })}::jsonb`,
        experiencePoints: sql`COALESCE(${users.experiencePoints}, 0) + ${achievement.reward}`,
      })
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
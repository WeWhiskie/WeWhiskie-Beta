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

// Add new imports
import { 
  invites, Invite, InsertInvite,
  masterclassEvents, MasterclassEvent,
  masterclassParticipants, MasterclassParticipant,
} from "@shared/schema";

const PostgresSessionStore = connectPg(session);

// Helper function for JSON operations
const jsonb = (obj: unknown) => sql`${JSON.stringify(obj)}::jsonb`;

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

  // Invite methods
  createInvite(invite: InsertInvite): Promise<Invite>;
  getInviteByCode(code: string): Promise<Invite | undefined>;
  acceptInvite(code: string, userId: number): Promise<void>;
  getUserInvites(userId: number): Promise<Invite[]>;

  // Engagement tracking methods
  updateUserEngagement(userId: number, action: string, weight: number): Promise<void>;
  getTopEngagedUsers(limit: number): Promise<User[]>;

  // Masterclass methods
  createMasterclassEvent(event: Omit<MasterclassEvent, "id" | "createdAt">): Promise<MasterclassEvent>;
  getMasterclassEvents(): Promise<MasterclassEvent[]>;
  joinMasterclass(eventId: number, userId: number): Promise<void>;
  getEventParticipants(eventId: number): Promise<User[]>;
  getUserMasterclasses(userId: number): Promise<MasterclassEvent[]>;
  getTopMasterCooperUsers(limit: number): Promise<User[]>;
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
    const [user] = await db.select().from(users).where(eq(users.id, id)) as [User | undefined];
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username)) as [User | undefined];
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning() as [User];
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning() as [User];
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
      .where(eq(follows.followingId, userId)) as { users: User }[];
    return result.map(row => row.users);
  }

  async getFollowing(userId: number): Promise<User[]> {
    const result = await db
      .select()
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId)) as { users: User }[];
    return result.map(row => row.users);
  }

  // Whisky methods
  async getWhiskies(): Promise<Whisky[]> {
    return await db.select().from(whiskies) as Whisky[];
  }

  async getWhisky(id: number): Promise<Whisky | undefined> {
    const [whisky] = await db.select().from(whiskies).where(eq(whiskies.id, id)) as [Whisky | undefined];
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
      .orderBy(sql`${reviews.createdAt} DESC`) as { review: Review, user: User, whisky: Whisky }[];

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
      .orderBy(sql`${reviews.createdAt} DESC`) as { review: Review, whisky: Whisky }[];

    return result.map(({ review, whisky }) => ({
      ...review,
      whisky,
    }));
  }

  async createReview(review: Omit<Review, "id" | "createdAt">): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning() as [Review];
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
      .where(eq(reviews.id, id)) as [{ review: Review, user: User, whisky: Whisky } | undefined];

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
    const [newSession] = await db.insert(tastingSessions).values(session).returning() as [TastingSession];
    return newSession;
  }

  async getTastingSessions(): Promise<(TastingSession & { host: User })[]> {
    const result = await db
      .select({
        session: tastingSessions,
        host: users,
      })
      .from(tastingSessions)
      .innerJoin(users, eq(tastingSessions.hostId, users.id)) as { session: TastingSession, host: User }[];

    return result.map(({ session, host }) => ({
      ...session,
      host,
    }));
  }

  async getUserSessions(userId: number): Promise<TastingSession[]> {
    return await db
      .select()
      .from(tastingSessions)
      .where(eq(tastingSessions.hostId, userId)) as TastingSession[];
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
      .where(eq(tastingSessions.id, id)) as [TastingSession | undefined];
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
      .returning() as [TastingSession];
    return session;
  }

  async getSessionParticipants(sessionId: number): Promise<User[]> {
    const result = await db
      .select({
        user: users,
      })
      .from(sessionParticipants)
      .innerJoin(users, eq(sessionParticipants.userId, users.id))
      .where(eq(sessionParticipants.sessionId, sessionId)) as { user: User }[];

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
    const [newAddress] = await db.insert(shippingAddresses).values(address).returning() as [ShippingAddress];
    return newAddress;
  }

  async getUserAddresses(userId: number): Promise<ShippingAddress[]> {
    return await db
      .select()
      .from(shippingAddresses)
      .where(eq(shippingAddresses.userId, userId)) as ShippingAddress[];
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
    const [share] = await db.insert(shares).values(shareData).returning() as [ShareTrack];
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
      .where(eq(likes.reviewId, reviewId)) as [{ count: number } | undefined];
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
      ) as [Like | undefined];
    return !!like;
  }

  // Group methods
  async createTastingGroup(group: InsertTastingGroup): Promise<TastingGroup> {
    const [newGroup] = await db.insert(tastingGroups).values(group).returning() as [TastingGroup];
    return newGroup;
  }

  async getTastingGroup(id: number): Promise<TastingGroup | undefined> {
    const [group] = await db.select().from(tastingGroups).where(eq(tastingGroups.id, id)) as [TastingGroup | undefined];
    return group;
  }

  async getTastingGroups(): Promise<(TastingGroup & { creator: User })[]> {
    const result = await db
      .select({
        group: tastingGroups,
        creator: users,
      })
      .from(tastingGroups)
      .innerJoin(users, eq(tastingGroups.createdBy, users.id)) as { group: TastingGroup, creator: User }[];

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
      .where(eq(groupMembers.userId, userId)) as { group: TastingGroup }[];

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
      .where(eq(groupMembers.groupId, groupId)) as { member: GroupMember, user: User }[];

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
      ) as [GroupMember | undefined];
    return !!member;
  }

  // Group achievements methods
  async createGroupAchievement(achievement: InsertGroupAchievement): Promise<GroupAchievement> {
    const [newAchievement] = await db
      .insert(groupAchievements)
      .values(achievement)
      .returning() as [GroupAchievement];
    return newAchievement;
  }

  async getGroupAchievements(groupId: number): Promise<GroupAchievement[]> {
    return await db
      .select()
      .from(groupAchievements)
      .where(eq(groupAchievements.groupId, groupId))
      .orderBy(groupAchievements.createdAt) as GroupAchievement[];
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
    const [newConfig] = await db.insert(streamConfigurations).values(config).returning() as [StreamConfiguration];
    return newConfig;
  }

  async getStreamConfigs(sessionId: number): Promise<StreamConfiguration[]> {
    return await db
      .select()
      .from(streamConfigurations)
      .where(eq(streamConfigurations.sessionId, sessionId)) as StreamConfiguration[];
  }

  async updateStreamConfig(id: number, updates: Partial<StreamConfiguration>): Promise<StreamConfiguration> {
    const [updated] = await db
      .update(streamConfigurations)
      .set(updates)
      .where(eq(streamConfigurations.id, id))
      .returning() as [StreamConfiguration];
    return updated;
  }

  // Stream statistics implementations
  async recordStreamStats(stats: InsertStreamStats): Promise<StreamStats> {
    const [newStats] = await db.insert(streamStats).values(stats).returning() as [StreamStats];
    return newStats;
  }

  async getStreamStats(sessionId: number): Promise<StreamStats[]> {
    return await db
      .select()
      .from(streamStats)
      .where(eq(streamStats.sessionId, sessionId))
      .orderBy(sql`${streamStats.timestamp} DESC`) as StreamStats[];
  }

  async getLatestStreamStats(sessionId: number): Promise<StreamStats | undefined> {
    const [latest] = await db
      .select()
      .from(streamStats)
      .where(eq(streamStats.sessionId, sessionId))
      .orderBy(sql`${streamStats.timestamp} DESC`)
      .limit(1) as [StreamStats | undefined];
    return latest;
  }

  // Viewer analytics implementations
  async recordViewerAnalytics(analytics: InsertViewerAnalytics): Promise<ViewerAnalytics> {
    const [newAnalytics] = await db.insert(viewerAnalytics).values(analytics).returning() as [ViewerAnalytics];
    return newAnalytics;
  }

  async getViewerAnalytics(sessionId: number): Promise<ViewerAnalytics[]> {
    return await db
      .select()
      .from(viewerAnalytics)
      .where(eq(viewerAnalytics.sessionId, sessionId))
      .orderBy(sql`${viewerAnalytics.timestamp} DESC`) as ViewerAnalytics[];
  }

  async getViewerCount(sessionId: number): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(viewerAnalytics)
      .where(eq(viewerAnalytics.sessionId, sessionId)) as [{ count: number } | undefined];
    return result?.count || 0;
  }

  // CDN configuration implementations
  async createCdnConfig(config: InsertCdnConfig): Promise<CdnConfig> {
    const [newConfig] = await db.insert(cdnConfigs).values(config).returning() as [CdnConfig];
    return newConfig;
  }

  async getCdnConfigs(sessionId: number): Promise<CdnConfig[]> {
    return await db
      .select()
      .from(cdnConfigs)
      .where(eq(cdnConfigs.sessionId, sessionId)) as CdnConfig[];
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
      ) as [CdnConfig | undefined];
    return config;
  }

  async updateCdnConfig(id: number, updates: Partial<CdnConfig>): Promise<CdnConfig> {
    const [updated] = await db
      .update(cdnConfigs)
      .set(updates)
      .where(eq(cdnConfigs.id, id))
      .returning() as [CdnConfig];
    return updated;
  }

  // Activity methods implementation
  async getActivities(options: { visibility: string[] }): Promise<ActivityFeed[]> {
    const activities = await db
      .select()
      .from(activityFeed)
      .where(sql`${activityFeed.visibility} = ANY(ARRAY[${sql.join(options.visibility, sql`, `)}])`)
      .orderBy(sql`${activityFeed.createdAt} DESC`) as ActivityFeed[];

    // Fetch related user data for each activity
    const activitiesWithData = await Promise.all(
      activities.map(async (activity) => {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, activity.userId)) as [User | undefined];

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
            .where(eq(whiskies.id, activity.entityId)) as [Whisky | undefined];
          if (whisky) {
            metadata.whiskyName = whisky.name;
          }
        } else if (activity.entityType === "user") {
          const [targetUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, activity.entityId)) as [User | undefined];
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
      .orderBy(sql`${activityFeed.createdAt} DESC`) as ActivityFeed[];

    return activities;
  }

  async createActivity(activity: InsertActivity): Promise<ActivityFeed> {
    const [newActivity] = await db
      .insert(activityFeed)
      .values(activity)
      .returning() as [ActivityFeed];
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
      .returning() as [User];
    return user;
  }

  async getUserLevel(userId: number): Promise<{ level: number; points: number }> {
    const [user] = await db
      .select({
        level: users.level,
        points: users.experiencePoints,
      })
      .from(users)
      .where(eq(users.id, userId)) as [{ level: number | null; points: number | null } | undefined];

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
      .returning() as [User];

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

    return await db.insert(dailyTasks).values(tasks).returning() as DailyTask[];
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
      ) as DailyTask[];
  }

  async updateTaskProgress(taskId: number, progress: number): Promise<DailyTask> {
    const [task] = await db
      .update(dailyTasks)
      .set({ 
        progress,
        completed: sql`CASE WHEN ${progress} >= ${dailyTasks.required} THEN true ELSE false END`
      })
            .where(eq(dailyTasks.id, taskId))
      .returning() as [DailyTask];
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

    return await db.insert(weeklyTasks).values(tasks).returning() as WeeklyTask[];
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
      ) as WeeklyTask[];
  }

  async getAchievements(): Promise<Achievement[]> {
    return await db.select().from(achievements) as Achievement[];
  }

  async getUserAchievements(userId: number): Promise<Achievement[]> {
    const user = await this.getUser(userId);
    if (!user?.achievementBadges) return [];

    const achievementIds = (user.achievementBadges as any[]).map(badge => badge.id);
    return await db
      .select()
      .from(achievements)
      .where(sql`${achievements.id} = ANY(${achievementIds})`) as Achievement[];
  }

  async unlockAchievement(userId: number, achievementId: number): Promise<void> {
    const [achievement] = await db
      .select()
      .from(achievements)
      .where(eq(achievements.id, achievementId)) as [Achievement | undefined];

    if (!achievement) return;

    await db
      .update(users)
      .set({
        achievementBadges: sql`COALESCE(${users.achievementBadges}, '[]'::jsonb) || ${jsonb({
          id: achievement.id,
          name: achievement.name,
          unlockedAt: new Date().toISOString(),
        })}`,
        experiencePoints: sql`COALESCE(${users.experiencePoints}, 0) + ${achievement.reward}`,
      })
      .where(eq(users.id, userId));
  }

  // Invite methods implementation
  async createInvite(invite: InsertInvite): Promise<Invite> {
    const [newInvite] = await db.insert(invites).values(invite).returning() as [Invite];
    await db
      .update(users)
      .set({ 
        inviteCount: sql`COALESCE(${users.inviteCount}, 0) + 1`,
        experiencePoints: sql`COALESCE(${users.experiencePoints}, 0) + 50` // Bonus points for sending invite
      })
      .where(eq(users.id, invite.inviterUserId));
    return newInvite;
  }

  async getInviteByCode(code: string): Promise<Invite | undefined> {
    const [invite] = await db
      .select()
      .from(invites)
      .where(eq(invites.inviteCode, code)) as [Invite | undefined];
    return invite;
  }

  async acceptInvite(code: string, userId: number): Promise<void> {
    const [invite] = await db
      .select()
      .from(invites)
      .where(eq(invites.inviteCode, code)) as [Invite | undefined];

    if (!invite) throw new Error("Invalid invite code");

    await db
      .update(invites)
      .set({ 
        status: "accepted",
        acceptedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(invites.inviteCode, code));

    // Award points to both inviter and invitee
    await db
      .update(users)
      .set({ 
        experiencePoints: sql`COALESCE(${users.experiencePoints}, 0) + 100`,
        engagementScore: sql`COALESCE(${users.engagementScore}, 0) + 50`
      })
      .where(eq(users.id, invite.inviterUserId));

    await db
      .update(users)
      .set({ 
        invitedBy: invite.inviterUserId,
        experiencePoints: sql`COALESCE(${users.experiencePoints}, 0) + 25`
      })
      .where(eq(users.id, userId));
  }

  async getUserInvites(userId: number): Promise<Invite[]> {
    return await db
      .select()
      .from(invites)
      .where(eq(invites.inviterUserId, userId)) as Invite[];
  }

  // Engagement tracking implementation
  async updateUserEngagement(userId: number, action: string, weight: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        engagementScore: sql`COALESCE(${users.engagementScore}, 0) + ${weight}`,
        lastActive: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(users.id, userId));
  }

  async getTopEngagedUsers(limit: number): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(sql`COALESCE(${users.engagementScore}, 0) DESC`)
      .limit(limit) as User[];
  }

  // Masterclass methods implementation
  async createMasterclassEvent(event: Omit<MasterclassEvent, "id" | "createdAt">): Promise<MasterclassEvent> {
    const [newEvent] = await db.insert(masterclassEvents).values(event).returning() as [MasterclassEvent];
    return newEvent;
  }

  async getMasterclassEvents(): Promise<MasterclassEvent[]> {
    return await db
      .select()
      .from(masterclassEvents)
      .orderBy(sql`${masterclassEvents.scheduledFor} DESC`) as MasterclassEvent[];
  }

  async joinMasterclass(eventId: number, userId: number): Promise<void> {
    await db.insert(masterclassParticipants).values({
      eventId,
      userId,
      status: 'registered'
    });

    // Update user's masterclass participation
    await db
      .update(users)
      .set({
        masterclassParticipation: sql`COALESCE(${users.masterclassParticipation}, '[]'::jsonb) || ${jsonb({
          eventId,
          status: 'registered',
          joinedAt: new Date().toISOString()
        })}`,
        experiencePoints: sql`COALESCE(${users.experiencePoints}, 0) + 100` // Bonus for joining masterclass
      })
      .where(eq(users.id, userId));
  }

  async getEventParticipants(eventId: number): Promise<User[]> {
    const result = await db
      .select({
        user: users,
      })
      .from(masterclassParticipants)
      .innerJoin(users, eq(masterclassParticipants.userId, users.id))
      .where(eq(masterclassParticipants.eventId, eventId)) as { user: User }[];

    return result.map(row => row.user);
  }

  async getUserMasterclasses(userId: number): Promise<MasterclassEvent[]> {
    const result = await db
      .select({
        event: masterclassEvents,
      })
      .from(masterclassParticipants)
      .innerJoin(masterclassEvents, eq(masterclassParticipants.eventId, masterclassEvents.id))
      .where(eq(masterclassParticipants.userId, userId)) as { event: MasterclassEvent }[];

    return result.map(row => row.event);
  }

  async getTopMasterCooperUsers(limit: number): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.level, 5)) // Master Cooper level
      .orderBy(sql`COALESCE(${users.engagementScore}, 0) DESC`)
      .limit(limit) as User[];
  }
}

export const storage = new DatabaseStorage();
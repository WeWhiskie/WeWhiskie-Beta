export const BARREL_LEVELS = {
  1: {
    name: "Virgin Oak",
    description: "Fresh to the whisky world",
    color: "text-amber-500",
    rewards: [
      "Basic review capabilities (max 1 review per day)",
      "View public tasting sessions",
      "Limited community chat access"
    ],
    restrictions: {
      maxDailyReviews: 1,
      canHostTastings: false,
      canJoinPrivateTastings: false,
      canCreateGroups: false,
      maxPhotosPerReview: 1,
      hasDetailedAnalytics: false,
      canAccessMasterclass: false,
    },
    dailyReward: 5
  },
  2: {
    name: "Light Toast",
    description: "Beginning to develop character",
    color: "text-amber-600",
    rewards: [
      "Custom profile badge",
      "Up to 3 reviews per day",
      "Join public tastings",
      "Basic analytics access",
      "Weekly whisky recommendations"
    ],
    restrictions: {
      maxDailyReviews: 3,
      canHostTastings: false,
      canJoinPrivateTastings: false,
      canCreateGroups: false,
      maxPhotosPerReview: 2,
      hasDetailedAnalytics: false,
      canAccessMasterclass: false,
    },
    dailyReward: 10
  },
  3: {
    name: "Medium Toast",
    description: "Rich in experience",
    color: "text-amber-700",
    rewards: [
      "Host live tasting sessions",
      "Up to 5 reviews per day",
      "Extended review features",
      "Create tasting groups",
      "Priority access to special events",
      "Exclusive community forums"
    ],
    restrictions: {
      maxDailyReviews: 5,
      canHostTastings: true,
      canJoinPrivateTastings: true,
      canCreateGroups: true,
      maxPhotosPerReview: 4,
      hasDetailedAnalytics: false,
      canAccessMasterclass: false,
    },
    dailyReward: 15
  },
  4: {
    name: "Heavy Char",
    description: "Deep whisky wisdom",
    color: "text-amber-800",
    rewards: [
      "Verified reviewer badge",
      "Unlimited reviews",
      "Create private tasting groups",
      "Access to expert masterclasses",
      "Enhanced analytics dashboard",
      "Priority support"
    ],
    restrictions: {
      maxDailyReviews: -1, // unlimited
      canHostTastings: true,
      canJoinPrivateTastings: true,
      canCreateGroups: true,
      maxPhotosPerReview: 8,
      hasDetailedAnalytics: true,
      canAccessMasterclass: true,
    },
    dailyReward: 20
  },
  5: {
    name: "Master Cooper",
    description: "Crafting the community",
    color: "text-amber-900",
    rewards: [
      "Mentor badge",
      "Create masterclasses",
      "Beta feature access",
      "Advanced tasting tools",
      "Community moderator status",
      "Premium analytics features"
    ],
    restrictions: {
      maxDailyReviews: -1, // unlimited
      canHostTastings: true,
      canJoinPrivateTastings: true,
      canCreateGroups: true,
      maxPhotosPerReview: -1, // unlimited
      hasDetailedAnalytics: true,
      canAccessMasterclass: true,
    },
    dailyReward: 25
  },
  premium: {
    name: "Premium Member",
    description: "Full access membership",
    color: "text-amber-400",
    rewards: [
      "All features unlocked",
      "Early access to new features",
      "Premium support",
      "No restrictions on usage",
      "Exclusive premium-only events",
      "Custom tasting notes templates"
    ],
    restrictions: {
      maxDailyReviews: -1,
      canHostTastings: true,
      canJoinPrivateTastings: true,
      canCreateGroups: true,
      maxPhotosPerReview: -1,
      hasDetailedAnalytics: true,
      canAccessMasterclass: true,
    },
    dailyReward: 30
  }
} as const;

export type BarrelLevel = keyof typeof BARREL_LEVELS;

export function getBarrelLevel(level: number | 'premium'): typeof BARREL_LEVELS[keyof typeof BARREL_LEVELS] {
  if (level === 'premium') return BARREL_LEVELS.premium;
  return BARREL_LEVELS[Math.min(Math.max(level as number, 1), 5) as Exclude<BarrelLevel, 'premium'>];
}

export function getProgressToNextLevel(points: number): { progress: number; required: number } {
  if (points >= 1000) return { progress: 1000, required: 1000 }; // Max level
  if (points >= 500) return { progress: points - 500, required: 500 }; // Level 4 to 5
  if (points >= 250) return { progress: points - 250, required: 250 }; // Level 3 to 4
  if (points >= 100) return { progress: points - 100, required: 150 }; // Level 2 to 3
  return { progress: points, required: 100 }; // Level 1 to 2
}

export function getDailyReward(level: number | 'premium'): number {
  return getBarrelLevel(level).dailyReward;
}

export function getAvailableRewards(level: number | 'premium'): string[] {
  if (level === 'premium') return BARREL_LEVELS.premium.rewards;
  let rewards: string[] = [];
  for (let i = 1; i <= level; i++) {
    rewards = [...rewards, ...BARREL_LEVELS[i as Exclude<BarrelLevel, 'premium'>].rewards];
  }
  return rewards;
}

export function getRestrictions(level: number | 'premium') {
  return getBarrelLevel(level).restrictions;
}
export const BARREL_LEVELS = {
  1: {
    name: "Virgin Oak",
    description: "Fresh to the whisky world",
    color: "text-amber-500",
    rewards: [
      "Basic review capabilities",
      "Join tasting sessions",
      "Community chat access"
    ],
    dailyReward: 5 // XP points for daily check-in
  },
  2: {
    name: "Light Toast",
    description: "Beginning to develop character",
    color: "text-amber-600",
    rewards: [
      "Custom profile badge",
      "Review reactions",
      "Early access to public tastings",
      "Weekly whisky recommendations"
    ],
    dailyReward: 10
  },
  3: {
    name: "Medium Toast",
    description: "Rich in experience",
    color: "text-amber-700",
    rewards: [
      "Host live tasting sessions",
      "Extended review features",
      "Priority access to special events",
      "Exclusive community forums"
    ],
    dailyReward: 15
  },
  4: {
    name: "Heavy Char",
    description: "Deep whisky wisdom",
    color: "text-amber-800",
    rewards: [
      "Verified reviewer badge",
      "Create tasting groups",
      "Access to expert masterclasses",
      "Enhanced analytics dashboard"
    ],
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
      "Community moderator status"
    ],
    dailyReward: 25
  },
} as const;

export type BarrelLevel = keyof typeof BARREL_LEVELS;

export function getBarrelLevel(level: number) {
  return BARREL_LEVELS[Math.min(Math.max(level, 1), 5) as BarrelLevel];
}

export function getProgressToNextLevel(points: number): { progress: number; required: number } {
  if (points >= 1000) return { progress: 1000, required: 1000 }; // Max level
  if (points >= 500) return { progress: points - 500, required: 500 }; // Level 4 to 5
  if (points >= 250) return { progress: points - 250, required: 250 }; // Level 3 to 4
  if (points >= 100) return { progress: points - 100, required: 150 }; // Level 2 to 3
  return { progress: points, required: 100 }; // Level 1 to 2
}

export function getDailyReward(level: number): number {
  return BARREL_LEVELS[Math.min(Math.max(level, 1), 5) as BarrelLevel].dailyReward;
}

export function getAvailableRewards(level: number): string[] {
  let rewards: string[] = [];
  for (let i = 1; i <= level; i++) {
    rewards = [...rewards, ...BARREL_LEVELS[i as BarrelLevel].rewards];
  }
  return rewards;
}
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AuthForm({
  type,
  onSubmit,
  isLoading,
}: {
  type: "login" | "register";
  onSubmit: (data: InsertUser) => void;
  isLoading: boolean;
}) {
  const form = useForm<InsertUser>({
    resolver: zodResolver(
      type === "login"
        ? insertUserSchema.pick({ username: true, password: true })
        : insertUserSchema
    ),
    defaultValues: {
      username: "",
      password: "",
      bio: "",
      avatarUrl: "",
      location: "",
      isExpert: false,
      email: "",
      followerCount: 0,
      followingCount: 0,
      isVerified: false,
      socialLinks: [],
      expertiseAreas: [],
      level: 1,
      experiencePoints: 0,
      dailyStreak: 0,
      totalReviews: 0,
      totalTastings: 0,
      contributionScore: 0,
      unlockedFeatures: [],
      achievementBadges: [],
      inviteCount: 0,
      engagementScore: 0,
      masterclassParticipation: [],
      isPremium: false
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {type === "login" ? "Sign In" : "Create Account"}
        </Button>
      </form>
    </Form>
  );
}
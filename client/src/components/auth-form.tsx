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

type FormData = Pick<InsertUser, "username" | "password" | "email">;

export function AuthForm({
  type,
  onSubmit,
  isLoading,
}: {
  type: "login" | "register";
  onSubmit: (data: InsertUser) => void;
  isLoading: boolean;
}) {
  const registrationSchema = type === "login"
    ? insertUserSchema.pick({ username: true, password: true })
    : insertUserSchema.pick({ username: true, password: true, email: true });

  const form = useForm<FormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      username: "",
      password: "",
      email: type === "register" ? "" : undefined,
    }
  });

  const handleSubmit = (data: FormData) => {
    const fullData: InsertUser = {
      ...data,
      inviteCode: "BETA2024",
      bio: "",
      avatarUrl: "",
      location: "",
      level: 1,
      experiencePoints: 0,
      dailyStreak: 0,
      totalReviews: 0,
      totalTastings: 0,
      contributionScore: 0,
      unlockedFeatures: [],
      achievementBadges: [],
      followerCount: 0,
      followingCount: 0,
      isVerified: false,
      isPremium: false,
      socialLinks: {},
      expertiseAreas: [],
      inviteCount: 0,
      engagementScore: 0,
      masterclassParticipation: []
    };
    onSubmit(fullData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
        {type === "register" && (
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {type === "login" ? "Sign In" : "Create Account"}
        </Button>
      </form>
    </Form>
  );
}
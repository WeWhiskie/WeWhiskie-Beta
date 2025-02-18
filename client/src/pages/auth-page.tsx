import { useAuth } from "@/hooks/use-auth";
import { AuthForm } from "@/components/auth-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Redirect } from "wouter";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] grid md:grid-cols-2 gap-8 items-center">
      <div className="p-8 bg-card rounded-lg">
        <Tabs defaultValue="login">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Create Account</TabsTrigger>
          </TabsList>
          <div className="mt-8">
            <TabsContent value="login">
              <AuthForm
                type="login"
                onSubmit={(data) => loginMutation.mutate(data)}
                isLoading={loginMutation.isPending}
              />
            </TabsContent>
            <TabsContent value="register">
              <AuthForm
                type="register"
                onSubmit={(data) => registerMutation.mutate(data)}
                isLoading={registerMutation.isPending}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <div className="hidden md:block relative h-full">
        <div
          className="absolute inset-0 bg-cover bg-center rounded-lg"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1549439602-43ebca2327af")',
          }}
        >
          <div className="absolute inset-0 bg-black/60 rounded-lg" />
          <div className="relative p-8 text-white">
            <h2 className="text-3xl font-bold mb-4">
              Join the Whisky Enthusiast Community
            </h2>
            <p className="text-lg text-gray-200">
              Share your reviews, discover new favorites, and connect with fellow
              whisky lovers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

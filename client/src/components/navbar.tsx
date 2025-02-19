import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Video, PenSquare, Radio, Wine, Users } from "lucide-react";

export default function Navbar() {
  const { user, logoutMutation } = useAuth();

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent cursor-pointer">
            WeWhiskie.
          </h1>
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/sessions">
            <Button variant="ghost" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Live Sessions
            </Button>
          </Link>
          {user ? (
            <>
              <Link href="/groups">
                <Button variant="ghost" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Tasting Groups
                </Button>
              </Link>
              <Link href="/recommendations">
                <Button variant="ghost" className="flex items-center gap-2">
                  <Wine className="h-4 w-4" />
                  Recommendations
                </Button>
              </Link>
              <Link href="/review">
                <Button variant="ghost" className="flex items-center gap-2">
                  <PenSquare className="h-4 w-4" />
                  Review
                </Button>
              </Link>
              <Link href="/live">
                <Button variant="ghost" className="flex items-center gap-2">
                  <Radio className="h-4 w-4" />
                  Go Live
                </Button>
              </Link>
              <Link href={`/profile/${user.id}`}>
                <Button variant="ghost">Profile</Button>
              </Link>
              <Button
                variant="ghost"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Link href="/auth">
              <Button>Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
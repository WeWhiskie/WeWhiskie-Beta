import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Video, PenSquare, Radio, Wine, Users, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
          {user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/sessions" className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Live Sessions
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/groups" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Tasting Groups
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/recommendations" className="flex items-center gap-2">
                      <Wine className="h-4 w-4" />
                      Recommendations
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/review" className="flex items-center gap-2">
                      <PenSquare className="h-4 w-4" />
                      Review
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/live" className="flex items-center gap-2">
                      <Radio className="h-4 w-4" />
                      Go Live
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/profile/${user.id}`}>
                      Profile
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
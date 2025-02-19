import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlusIcon, Users } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import type { TastingGroup } from "@shared/schema";

export default function TastingGroups() {
  const { data: groups, isLoading } = useQuery<(TastingGroup & { creator: { username: string } })[]>({
    queryKey: ["/api/groups"],
  });

  if (isLoading) {
    return <div>Loading tasting groups...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Whisky Tasting Groups</h1>
        <Link href="/groups/new">
          <Button>
            <PlusIcon className="w-4 h-4 mr-2" />
            New Group
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups?.map((group) => (
          <Card key={group.id} className="p-6">
            <Link href={`/groups/${group.id}`}>
              {group.imageUrl && (
                <img
                  src={group.imageUrl}
                  alt={group.name}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              <h2 className="text-xl font-semibold mb-2">{group.name}</h2>
              <p className="text-muted-foreground mb-4 line-clamp-2">
                {group.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="w-4 h-4 mr-1" />
                  {group.memberCount} members
                </div>
                <div className="text-sm text-muted-foreground">
                  Created by {group.creator.username}
                </div>
              </div>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}

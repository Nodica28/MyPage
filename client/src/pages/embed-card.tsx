import React from "react";
import {useQuery} from "@tanstack/react-query";
import {useLocation} from "wouter";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";

interface BadgeProfileResponse {
  userProfile: {
    firstName?: string;
    lastName?: string;
    title?: string | null;
    bio?: string | null;
    profileImage?: string | null;
    publicPath: string;
    organizationId?: number | null;
    companyName?: string | null;
    website?: string | null;
    linkedinProfile?: string | null;
    email?: string | null;
  };
  organization: {
    name?: string | null;
    logo?: string | null;
  } | null;
}

export default function EmbedCard(): React.ReactNode {
  const [location] = useLocation();
  const publicPath = location.replace(/^\/embed\//, "");

  const {data} = useQuery<BadgeProfileResponse>({
    queryKey: ["/api/users/badge-profile", publicPath],
    queryFn: async () => {
      const res = await fetch(`/api/users/badge-profile/${publicPath}`);
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    }
  });

  const user = data?.userProfile;
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const title = user?.title || data?.organization?.name || "";

  const profileUrl = `https://app.withbadge.ai/${user?.publicPath || publicPath}`;

  return (
    <div
      className={cn(
        "w-full h-full flex items-center justify-center p-3 bg-transparent"
      )}
    >
      <div className="w-full max-w-[420px] rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 flex items-center gap-3">
          <Avatar className="h-14 w-14">
            {user?.profileImage ? (
              <AvatarImage src={user.profileImage} alt={fullName} />
            ) : (
              <AvatarFallback>
                {fullName
                  ? fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                  : ""}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold truncate">
              {fullName || "Badge User"}
            </div>
            {title && (
              <div className="text-sm text-muted-foreground truncate">
                {title}
              </div>
            )}
          </div>
        </div>
        {user?.bio && (
          <div className="px-4 pb-3 text-sm text-muted-foreground line-clamp-3">
            {user.bio}
          </div>
        )}
        <div className="px-4 pb-4 flex gap-2">
          <Button asChild className="flex-1">
            <a href={profileUrl} target="_blank" rel="noopener noreferrer">
              View Profile
            </a>
          </Button>
          {user?.email && (
            <Button variant="outline" asChild>
              <a href={`mailto:${user.email}`}>Email</a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

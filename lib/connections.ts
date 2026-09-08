import type { ConnectionPerson } from "@/components/social/connection-card";

export type ConnectionTab = "followers" | "following";

export type ConnectionRow = {
  created_at: string;
  person: ConnectionPerson;
};

export function resolveViewerRelationship(options: {
  viewerId: string;
  profileId: string;
  tab: ConnectionTab;
  personId: string;
  followed: ReadonlySet<string>;
  followsViewer: ReadonlySet<string>;
}) {
  return {
    viewer_follows:
      (options.viewerId === options.profileId && options.tab === "following") ||
      options.followed.has(options.personId),
    follows_viewer:
      (options.viewerId === options.profileId && options.tab === "followers") ||
      options.followsViewer.has(options.personId),
  };
}

import type { SocialEntry } from "@/components/social/activity-stream";
import type { ConnectionPerson } from "@/components/social/connection-card";
import type { ProfileLevel } from "@/lib/profile-level";
import type { ListPreview } from "@/lib/lists-types";
export type ReviewSearch = { data: SocialEntry[]; total: number };
export type ListSearch = { data: ListPreview[]; total: number };
export type PeopleSearch = {
  data: ConnectionPerson[];
  total: number;
  levels: (ProfileLevel & { profile_id: string })[];
  shared: { profile_id: string; shared_games: number }[];
};

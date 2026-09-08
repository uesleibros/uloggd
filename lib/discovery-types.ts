import type { FriendPlaying } from "@/lib/friends-playing";
import type { TasteNeighbour } from "@/lib/taste-neighbours-order";
import type { ProfileLevel } from "@/lib/profile-level";
export type DiscoveryPeople = {
  data: {
    friends: FriendPlaying[];
    neighbours: TasteNeighbour[];
    levels: (ProfileLevel & { profile_id: string })[];
  };
};

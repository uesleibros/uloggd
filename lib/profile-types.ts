import type { OrganizationCategory } from "@/lib/organization";
import type { ProfileLevel } from "@/lib/profile-level";
import type { MineralHolding } from "@/lib/minerals";

export type PublicProfile = {
  id: string;
  username: string;
  display_name: string | null;
  pronouns: string | null;
  bio: string | null;
  drawer: string | null;
  thought: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  created_at: string;
  verified: boolean;
  verified_at: string | null;
  account_type: "PERSON" | "ORGANIZATION";
  organization_tagline: string | null;
  organization_category: OrganizationCategory | null;
  organization_url: string | null;
  is_private: boolean;
  youtube_username: string | null;
  instagram_username: string | null;
  twitter_username: string | null;
  twitch_username: string | null;
  twitch_live_visible: boolean;
  steam_id: string | null;
  steam_username: string | null;
  steam_playing_visible: boolean;
  profile_comment_scope: "EVERYONE" | "FOLLOWERS" | "NOBODY";
  library_visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
};

export type ProfileSummary = {
  library: number;
  lists: number;
  reviews: number;
  diary: number;
  screenshots: number;
  followers: number;
  following: number;
  viewer_follows: boolean;
};

export type ProfileResponse = {
  data: PublicProfile;
  suspension: { banned_until: string | null }[];
};

export type ProfileWallet = {
  data: MineralHolding[];
  standing: ProfileLevel | null;
};

export type ProfileLibraryRecord = {
  igdb_id: number;
  status:
    "BACKLOG" | "PLAYING" | "COMPLETED" | "DROPPED" | "ON_HOLD" | "WISHLIST";
  playing: boolean;
  backlog: boolean;
  wishlist: boolean;
  liked: boolean;
  quick_rating: number | null;
  custom_cover_url: string | null;
  updated_at: string;
};

export type ProfileYear = {
  data: {
    sessions: {
      igdb_id: number;
      played_on: string;
      minutes: number | null;
      marks_finish: boolean;
    }[];
    reviews: { rating: number | null; created_at: string }[];
  };
};

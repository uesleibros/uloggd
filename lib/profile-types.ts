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
  /** Which level paid out which mineral, newest level first. */
  grants: {
    level: number;
    mineral: MineralHolding["mineral"];
    created_at: string;
  }[];
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

/**
 * A year read from everything somebody did in it, not only from their diary.
 *
 * `totals` is counted in the database and is whole; every array beside it is
 * capped, because the page draws with the rows and counts with the totals.
 */
export type ProfileYear = {
  data: {
    sessions: {
      igdb_id: number;
      played_on: string;
      minutes: number | null;
      marks_finish: boolean;
    }[];
    reviews: { igdb_id: number; rating: number | null; created_at: string }[];
    /** Library rows that moved in the year, however they moved. */
    library: {
      igdb_id: number;
      status: string;
      quick_rating: number | null;
      liked: boolean;
      started_at: string | null;
      completed_at: string | null;
      added: boolean;
    }[];
    lists: {
      public_id: string;
      name: string;
      kind: string;
      items: number;
      created_at: string;
    }[];
    screenshots: {
      public_id: string;
      igdb_id: number;
      image_url: string;
      width: number | null;
      height: number | null;
      contains_spoilers: boolean;
      sensitive: boolean;
      created_at: string;
    }[];
    journeys: {
      public_id: string;
      igdb_id: number;
      title: string;
      created_at: string;
    }[];
    totals: {
      followers: number;
      following: number;
      likes: number;
      comments: number;
      minerals: number;
      screenshots: number;
      lists: number;
    } | null;
  };
};

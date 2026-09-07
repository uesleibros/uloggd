import type { ProfileLevel } from "@/lib/profile-level";
import type { ProfileJoin } from "@/lib/profile-join";
import type { SocialEntry } from "@/components/social/activity-stream";
import type { JournalImage } from "@/lib/journal-images";
import type { TierlistData } from "@/lib/tierlists";

export type Visibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";
export type CommentScope = "EVERYONE" | "FOLLOWERS" | "NOBODY";
export type ContentAuthor = ProfileJoin & {
  content_comment_scope: CommentScope;
};
export type ContentRecord = {
  id: string;
  public_id: string;
  profile_id: string;
  igdb_id: number;
  game_slug: string;
  created_at: string;
  updated_at: string;
  profiles: ContentAuthor;
  visibility: Visibility;
  comments_scope: CommentScope;
  contains_spoilers: boolean;
};
export type ReviewRecord = ContentRecord & {
  rating: number | null;
  rating_mode: NonNullable<SocialEntry["ratingMode"]> | null;
  recommended: boolean | null;
  title: string | null;
  aspect_ratings: SocialEntry["aspects"];
  mastered: boolean;
  replay: boolean;
  platform: string | null;
  started_on: string | null;
  finished_on: string | null;
  content: string | null;
  journey_id: string | null;
  journeys: { title: string; public_id: string } | null;
};
export type DiaryRecord = ContentRecord & {
  played_on: string;
  ended_on: string | null;
  started_at: string | null;
  minutes: number | null;
  note: string | null;
  marks_start: boolean;
  marks_finish: boolean;
  sensitive: boolean;
  journey_id: string | null;
  journeys: { title: string; public_id: string } | null;
};
export type ScreenshotRecord = ContentRecord & {
  image_url: string | null;
  description: string | null;
  sensitive: boolean;
  width: number;
  height: number;
  deleted_at: string | null;
};
export type JourneyRecord = Pick<
  ContentRecord,
  | "id"
  | "public_id"
  | "profile_id"
  | "igdb_id"
  | "game_slug"
  | "created_at"
  | "updated_at"
  | "profiles"
> & { title: string };
export type ListItem = {
  id: string;
  igdb_id: number;
  game_slug: string;
  position: number;
  note: string | null;
};
export type ListRecord = Pick<
  ContentRecord,
  | "id"
  | "public_id"
  | "profile_id"
  | "profiles"
  | "created_at"
  | "updated_at"
  | "visibility"
  | "comments_scope"
> & {
  name: string;
  description: string | null;
  ranked: boolean;
  kind: "COLLECTION" | "TIERLIST";
  items: ListItem[];
  owned: boolean;
};
export type ContentContext = {
  standing: ProfileLevel | null;
  like: { like_count: number; liked_by_viewer: boolean };
  viewer_follows: boolean;
  custom_cover_scope: string | null;
  covers: {
    profile_id: string;
    igdb_id?: number;
    custom_cover_url: string | null;
  }[];
};
export type ContentResponse<T> = {
  data: T;
  context: ContentContext;
  images?: JournalImage[];
};
export type JourneyResponse = {
  data: JourneyRecord;
  standing: ProfileLevel | null;
  suspended: boolean;
  public_sessions: number;
};
export type JourneySessions = {
  data: DiaryRecord[];
  summary: Pick<
    DiaryRecord,
    "played_on" | "ended_on" | "minutes" | "visibility" | "updated_at"
  >[];
  reviews: Pick<
    ReviewRecord,
    | "public_id"
    | "title"
    | "rating"
    | "rating_mode"
    | "recommended"
    | "created_at"
  >[];
  images: Record<string, JournalImage[]>;
};
export type ListResponse = ContentResponse<ListRecord> & {
  live_ids: number[];
  viewer_states: import("@/lib/profile-types").ProfileLibraryRecord[];
};
export type TierlistResponse = { data: TierlistData };

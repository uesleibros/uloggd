export type ScreenshotPreview = {
  id: string;
  public_id: string;
  igdb_id: number;
  game_slug: string;
  image_url: string;
  description: string | null;
  contains_spoilers: boolean;
  width: number;
  height: number;
  created_at: string;
};
export type ScreenshotGallery = {
  data: ScreenshotPreview[];
  total: number;
  safe_count: number;
  spoiler_count: number;
  matching: number;
  games: { igdb_id: number; game_slug: string }[];
  likes: { content_id: string; like_count: number }[];
  comments: { content_id: string; comment_count: number }[];
};

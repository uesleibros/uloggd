export type IndexProfile = {
  username: string;
  is_private: boolean | null;
  library_visibility: string | null;
};
export type IndexItem = {
  public_id: string;
  game_slug: string | null;
  updated_at: string;
  created_at: string;
  profiles: IndexProfile | null;
  journeys: { public_id: string; updated_at: string } | null;
};
export type SiteIndex = {
  data: {
    reviews: IndexItem[];
    entries: IndexItem[];
    lists: IndexItem[];
    screenshots: IndexItem[];
  };
};

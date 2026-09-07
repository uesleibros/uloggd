export type ActivityOptions = {
  profileId?: string;
  profileIds?: string[];
  gameId?: number;
  limit?: number;
  before?: string;
  kinds?: Array<"review" | "diary" | "screenshot">;
  rating?: "rated" | "great" | "positive" | "mixed" | "low" | "unrated";
  spoilers?: "all" | "hide" | "only";
  order?: "recent" | "oldest" | "rating";
  search?: string;
  offset?: number;
};

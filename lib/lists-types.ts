export type ListVisibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";
export type ListMode = "COLLECTION" | "RANKED";
export type ListSort = "recent" | "oldest" | "name" | "size" | "likes";

export type ListPreview = {
  id: string;
  publicId: string;
  name: string;
  description: string | null;
  visibility: ListVisibility;
  ranked: boolean;
  kind: "COLLECTION" | "TIERLIST";
  /** Miniature tier rows for the tierlist card; absent on collections. */
  tierRows?: {
    label: string;
    color: string;
    covers: { url: string; fallbackUrl: string }[];
  }[];
  count: number;
  covers: { url: string; fallbackUrl: string; name: string }[];
  likes: number;
  /** Replies, so a card can say a conversation is happening on it. */
  comments: number;
  updatedAt: string;
};

export type ListFilters = {
  visibility?: ListVisibility | "ALL";
  mode?: ListMode | "ALL";
  sort?: ListSort;
};

export const LIST_PAGE_SIZE = 24;
export const LIST_PAGE_SIZE_MAX = 48;

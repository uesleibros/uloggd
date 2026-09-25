export type ListVisibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";
/**
 * The three shapes a list actually comes in.
 *
 * `COLLECTION` used to mean "not ranked", which is true of a tierlist too, so
 * filtering for a plain list handed back boards as well. Each of these now
 * names one thing: a list, a list whose order is the point, and a board.
 */
export type ListMode = "COLLECTION" | "RANKED" | "TIERLIST";
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
  /**
   * Whether the reader is one of them.
   *
   * The count alone was all a card had, so it drew an outlined heart come
   * what may, and a list the reader had liked looked exactly like one they
   * had not. The definer function behind the count has always answered this
   * too; only the read dropped it on the way out.
   */
  likedByViewer: boolean;
  /** Replies, so a card can say a conversation is happening on it. */
  comments: number;
  updatedAt: string;
  /**
   * Whose list it is, on listings that span more than one account: search and
   * the public directory. A listing of one person's lists leaves it out, since
   * their name is already above every card in it.
   */
  owner?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    verified: boolean;
  } | null;
};

export type ListFilters = {
  visibility?: ListVisibility | "ALL";
  mode?: ListMode | "ALL";
  sort?: ListSort;
};

export const LIST_PAGE_SIZE = 24;
export const LIST_PAGE_SIZE_MAX = 48;

export type ProfileLists = {
  data: ListPreview[];
  matching: number;
  total: number;
  public: number;
  games: number;
};

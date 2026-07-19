export type ListPreview = {
  id: string;
  name: string;
  description: string | null;
  visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
  count: number;
  covers: { url: string; name: string }[];
  likes: number;
  updatedAt: string;
};

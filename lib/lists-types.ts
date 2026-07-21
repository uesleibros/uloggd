export type ListPreview = {
  id: string;
  publicId: string;
  name: string;
  description: string | null;
  visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
  count: number;
  covers: { url: string; fallbackUrl: string; name: string }[];
  likes: number;
  updatedAt: string;
};

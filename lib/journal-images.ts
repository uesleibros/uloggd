import "server-only";

export type JournalImage = {
  id: string;
  url: string;
  width: number;
  height: number;
  caption: string | null;
};

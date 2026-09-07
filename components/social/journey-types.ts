import type { CommunityScope } from "./community-scope-select";

/**
 * What the day editors are handed and hand back.
 *
 * In their own file because the studio writes them and the editors read them,
 * and a type declared inside the component that imports it is a circular
 * import waiting to be written.
 */

export type Visibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";

/** "images" means the entry is stored and only its gallery failed. */
export type SaveOutcome = "saved" | "images" | "failed";

export type DayPayload = {
  minutes: number | null;
  /** `HH:MM` when the player pinned an hour, empty when the day is enough. */
  time: string;
  note: string;
  marksStart: boolean;
  marksFinish: boolean;
  spoilers: boolean;
  visibility: Visibility;
  commentsScope: CommunityScope;
};

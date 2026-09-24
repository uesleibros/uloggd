import type { AccountSettings } from "@/components/settings/account-settings";
export type AccountProfile = Omit<
  Parameters<typeof AccountSettings>[0]["profile"],
  "birth_date"
>;
export type AccountState = {
  data: {
    suspended: boolean;
    state: {
      banned_at: string;
      banned_until: string | null;
      reason: string | null;
    } | null;
    infractions: number;
    /** The handle, for a screen that cannot open the profile to look it up. */
    username: string | null;
  };
};
export type AccountPeople = {
  data: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  }[];
  page: { total_items: number };
};

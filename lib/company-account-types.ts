import type { ProfileLevel } from "@/lib/profile-level";
export type CompanyAccount = {
  data: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  standing: ProfileLevel | null;
};

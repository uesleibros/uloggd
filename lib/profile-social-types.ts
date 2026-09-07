import type { ProfileComment } from "@/components/social/profile-comments";
import type { MineralHolding } from "@/lib/minerals";
export type ProfileSocial = {
  data: {
    recent_mutual: boolean;
    block_state: { viewer_blocked: boolean; blocked_by_target: boolean };
    comments: ProfileComment[];
    viewer_wallet: MineralHolding[];
    members: {
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      role: "OWNER" | "MANAGER";
    }[];
  };
};

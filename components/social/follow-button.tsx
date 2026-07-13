"use client";

import { UserCheck, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function FollowButton({
  viewerId,
  profileId,
  initial,
  lang,
}: {
  viewerId: string | null;
  profileId: string;
  initial: boolean;
  lang: "pt-BR" | "en";
}) {
  const pt = lang === "pt-BR";
  const router = useRouter();
  const [following, setFollowing] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  if (!viewerId || viewerId === profileId) return null;
  async function toggle() {
    if (pending) return;
    setPending(true);
    setError(false);
    const supabase = createClient();
    const result = following
      ? await supabase
          .from("follows")
          .delete()
          .eq("follower_id", viewerId!)
          .eq("following_id", profileId)
      : await supabase
          .from("follows")
          .insert({ follower_id: viewerId!, following_id: profileId });
    if (result.error) setError(true);
    else {
      setFollowing(!following);
      router.refresh();
    }
    setPending(false);
  }
  return (
    <div className="profile-follow-control">
      <button
        type="button"
        data-following={following || undefined}
        onClick={toggle}
        disabled={pending}
      >
        {following ? <UserCheck size={15} /> : <UserPlus size={15} />}
        {pending
          ? pt
            ? "Salvando…"
            : "Saving…"
          : following
            ? pt
              ? "Seguindo"
              : "Following"
            : pt
              ? "Seguir"
              : "Follow"}
      </button>
      {error && (
        <span role="alert">{pt ? "Tente novamente." : "Try again."}</span>
      )}
    </div>
  );
}

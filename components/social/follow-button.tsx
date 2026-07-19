"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, UserCheck, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function FollowButton({
  viewerId,
  profileId,
  initial,
  mutualRecent = false,
  profileName,
  lang,
}: {
  viewerId: string | null;
  profileId: string;
  initial: boolean;
  mutualRecent?: boolean;
  profileName?: string;
  lang: "pt-BR" | "en";
}) {
  const pt = lang === "pt-BR";
  const router = useRouter();
  const [following, setFollowing] = useState(initial);
  const [pending, setPending] = useState<"follow" | "unfollow" | null>(null);
  const [error, setError] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  if (!viewerId || viewerId === profileId) return null;
  async function follow() {
    if (pending) return;
    setPending("follow");
    setError(false);
    const supabase = createClient();
    const result = await supabase
      .from("follows")
      .insert({ follower_id: viewerId!, following_id: profileId });
    if (result.error) setError(true);
    else {
      setFollowing(true);
      router.refresh();
    }
    setPending(null);
  }
  async function unfollow() {
    if (pending) return;
    setPending("unfollow");
    setError(false);
    const { error: actionError } = await createClient().rpc(
      "unfollow_profile",
      { target_profile: profileId },
    );
    if (actionError) setError(true);
    else {
      setFollowing(false);
      setWarningOpen(false);
      router.refresh();
    }
    setPending(null);
  }
  function toggle() {
    if (!following) {
      void follow();
      return;
    }
    if (mutualRecent) setWarningOpen(true);
    else void unfollow();
  }
  return (
    <div className="profile-follow-control">
      <button
        type="button"
        data-following={following || undefined}
        onClick={toggle}
        disabled={Boolean(pending)}
      >
        {following ? <UserCheck size={15} /> : <UserPlus size={15} />}
        {pending
          ? pending === "follow"
            ? pt
              ? "Seguindo…"
              : "Following…"
            : pt
              ? "Deixando de seguir…"
              : "Unfollowing…"
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
      <Dialog.Root open={warningOpen} onOpenChange={setWarningOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="recent-unfollow-overlay" />
          <Dialog.Content className="recent-unfollow-dialog">
            <Dialog.Close aria-label={pt ? "Fechar" : "Close"}>
              <X size={17} />
            </Dialog.Close>
            <span className="recent-unfollow-mark" aria-hidden>
              <AlertTriangle size={20} />
            </span>
            <Dialog.Title>
              {pt ? "Desfazer conexão recente?" : "Undo recent connection?"}
            </Dialog.Title>
            <Dialog.Description>
              {pt
                ? `Você e ${profileName ?? "esta pessoa"} começaram a se seguir recentemente. Ao deixar de seguir, ela também deixará de seguir você.`
                : `You and ${profileName ?? "this person"} followed each other recently. If you unfollow, they will also stop following you.`}
            </Dialog.Description>
            <footer>
              <Dialog.Close disabled={Boolean(pending)}>
                {pt ? "Manter conexão" : "Keep connection"}
              </Dialog.Close>
              <button
                type="button"
                disabled={Boolean(pending)}
                onClick={() => void unfollow()}
              >
                {pending === "unfollow"
                  ? pt
                    ? "Deixando de seguir…"
                    : "Unfollowing…"
                  : pt
                    ? "Deixar de seguir"
                    : "Unfollow"}
              </button>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

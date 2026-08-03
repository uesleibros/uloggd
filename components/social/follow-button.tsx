"use client";

import * as Dialog from "@/components/ui/dialog";
import {
  AlertTriangle,
  Clock3,
  LoaderCircle,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

export function FollowButton({
  viewerId,
  profileId,
  initial,
  initialRequested = false,
  mutualRecent = false,
  profileName,
  lang,
}: {
  viewerId: string | null;
  profileId: string;
  initial: boolean;
  /** A pending request on a private account. */
  initialRequested?: boolean;
  mutualRecent?: boolean;
  profileName?: string;
  lang: UiLang;
}) {
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  const router = useRouter();
  const [following, setFollowing] = useState(initial);
  const [requested, setRequested] = useState(initialRequested);
  const [pending, setPending] = useState<"follow" | "unfollow" | null>(null);
  const [error, setError] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const signature = `${profileId}:${initial}:${initialRequested}`;
  const [previousSignature, setPreviousSignature] = useState(signature);

  // This component survives client-side navigation between profiles. Keep the
  // local optimistic state, but reset it when the server hands us a different
  // person or a refreshed relationship for the current one.
  if (signature !== previousSignature) {
    setPreviousSignature(signature);
    setFollowing(initial);
    setRequested(initialRequested);
    setPending(null);
    setError(false);
    setWarningOpen(false);
  }

  if (!viewerId || viewerId === profileId) return null;
  // Optimistic: the button flips immediately and reverts if the write fails.
  // The database decides between following outright and queueing a request,
  // because only it knows whether the account is private.
  async function follow() {
    if (pending) return;
    setPending("follow");
    setError(false);
    const { data, error: actionError } = await createClient().rpc(
      "request_follow",
      { target_profile: profileId },
    );
    if (actionError) setError(true);
    else if (data === "requested") setRequested(true);
    else {
      setFollowing(true);
      router.refresh();
    }
    setPending(null);
  }

  async function cancelRequest() {
    if (pending) return;
    setPending("follow");
    setError(false);
    const { error: actionError } = await createClient().rpc(
      "cancel_follow_request",
      { target_profile: profileId },
    );
    if (actionError) setError(true);
    else setRequested(false);
    setPending(null);
  }
  async function unfollow() {
    if (pending) return;
    setPending("unfollow");
    setError(false);
    setFollowing(false);
    const { error: actionError } = await createClient().rpc(
      "unfollow_profile",
      { target_profile: profileId },
    );
    if (actionError) {
      setFollowing(true);
      setError(true);
    } else {
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
        data-requested={(!following && requested) || undefined}
        onClick={requested && !following ? cancelRequest : toggle}
        disabled={Boolean(pending)}
      >
        {pending ? (
          <LoaderCircle className="spin" size={15} aria-hidden />
        ) : following ? (
          <UserCheck size={15} />
        ) : requested ? (
          <Clock3 size={15} />
        ) : (
          <UserPlus size={15} />
        )}
        {following ? t.following : requested ? t.requested : t.follow}
      </button>
      {error && <span role="alert">{t.tryAgain}</span>}
      <Dialog.Root open={warningOpen} onOpenChange={setWarningOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="recent-unfollow-overlay" />
          <Dialog.Content className="recent-unfollow-dialog">
            <Dialog.Close aria-label={t.close}>
              <X size={17} />
            </Dialog.Close>
            <span className="recent-unfollow-mark" aria-hidden>
              <AlertTriangle size={20} />
            </span>
            <Dialog.Title>
              {tri(
                lang,
                "Desfazer conexão recente?",
                "Undo recent connection?",
                "¿Deshacer conexión reciente?",
              )}
            </Dialog.Title>
            <Dialog.Description>
              {pt
                ? `Você e ${profileName ?? "esta pessoa"} começaram a se seguir recentemente. Ao deixar de seguir, ela também deixará de seguir você.`
                : `You and ${profileName ?? "this person"} followed each other recently. If you unfollow, they will also stop following you.`}
            </Dialog.Description>
            <footer>
              <Dialog.Close disabled={Boolean(pending)}>
                {tri(
                  lang,
                  "Manter conexão",
                  "Keep connection",
                  "Mantener conexión",
                )}
              </Dialog.Close>
              <button
                type="button"
                disabled={Boolean(pending)}
                onClick={() => void unfollow()}
              >
                {pending === "unfollow" && (
                  <LoaderCircle className="spin" size={15} aria-hidden />
                )}
                {pending === "unfollow"
                  ? tri(
                      lang,
                      "Deixando de seguir…",
                      "Unfollowing…",
                      "Dejando de seguir…",
                    )
                  : tri(
                      lang,
                      "Deixar de seguir",
                      "Unfollow",
                      "Dejar de seguir",
                    )}
              </button>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

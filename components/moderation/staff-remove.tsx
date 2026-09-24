"use client";

import { LoaderCircle, ShieldX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { tri, type UiLang } from "@/lib/ui-text";
import { useStaff } from "./staff-context";

/** Everything moderation can take down, by the words the database uses. */
export type StaffRemovableKind =
  | "REVIEW"
  | "DIARY"
  | "LIST"
  | "SCREENSHOT"
  | "PROFILE_COMMENT"
  | "CONTENT_COMMENT";

/** Which shape of request each kind needs from the console's own route. */
function body(kind: StaffRemovableKind, id: string) {
  if (kind === "SCREENSHOT")
    return { do: "screenshot", screenshot: id, reason: null };
  if (kind === "PROFILE_COMMENT" || kind === "CONTENT_COMMENT")
    return { do: "comment", comment: id, table: kind, reason: null };
  return { do: "post", kind, post: id, reason: null };
}

/**
 * Taking somebody else's post down, as staff, wherever it is shown.
 *
 * It decides for itself whether to appear: it reads the staff flag from the
 * context the layout sets and the author from its own props, so a feed card, a
 * comment and a detail page all get the same control by rendering the same
 * component, and nothing has to be passed down through four layers of props
 * to make that happen. A page that forgets it is a page where moderation
 * cannot act, and that is exactly how a review ended up being removable from
 * its own page and nowhere else.
 *
 * Two presses, like every other removal here. The reason is written in the
 * console when there is one to write; from a card the audit line carries the
 * action, the moderator and the author, which is what an appeal needs.
 */
export function StaffRemove({
  kind,
  id,
  lang,
  authorId,
  afterRemove,
  onRemoved,
  compact,
}: {
  kind: StaffRemovableKind;
  id: string;
  lang: UiLang;
  /** The author, so staff never sees this on their own post. */
  authorId?: string | null;
  /** Where to go once it is gone, for a page that is about to not exist. */
  afterRemove?: string;
  /** For a list that can drop the row instead of reloading the page. */
  onRemoved?: () => void;
  compact?: boolean;
}) {
  const { staff, viewerId } = useStaff();
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  if (!staff) return null;
  // Their own post carries the author's own controls; two removes side by
  // side, one of which writes an audit line about yourself, is noise.
  if (authorId && viewerId && authorId === viewerId) return null;

  async function remove() {
    if (pending) return;
    if (!armed) {
      setArmed(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setArmed(false), 4000);
      return;
    }
    if (timer.current) window.clearTimeout(timer.current);
    setArmed(false);
    setPending(true);
    setError(false);
    const answer = await fetch("/api/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body(kind, id)),
    });
    if (!answer.ok) {
      setError(true);
      setPending(false);
      return;
    }
    onRemoved?.();
    if (afterRemove) router.replace(afterRemove);
    router.refresh();
  }

  return (
    <button
      type="button"
      className="staff-remove-action"
      data-compact={compact || undefined}
      data-armed={armed || undefined}
      disabled={pending}
      onClick={() => void remove()}
    >
      {pending ? (
        <LoaderCircle className="spin" size={14} aria-hidden />
      ) : (
        <ShieldX size={14} aria-hidden />
      )}
      {error
        ? tri(lang, "Não foi removido", "Not removed", "No se quitó")
        : armed
          ? tri(lang, "Remover mesmo?", "Really remove?", "¿Quitar de verdad?")
          : compact
            ? tri(lang, "Moderar", "Moderate", "Moderar")
            : tri(
                lang,
                "Remover (moderação)",
                "Remove (moderation)",
                "Quitar (moderación)",
              )}
    </button>
  );
}

/**
 * A card that is one big link, with the staff removal laid over its corner.
 *
 * A button inside a link is neither, so the control cannot live in the card.
 * For everybody who is not staff this renders the card exactly as it was,
 * with no wrapper at all, so the grids it sits in are untouched for every
 * reader but the handful who can act.
 */
export function StaffOverlay({
  kind,
  id,
  lang,
  authorId,
  children,
}: {
  kind: StaffRemovableKind;
  id: string;
  lang: UiLang;
  authorId?: string | null;
  children: React.ReactNode;
}) {
  const { staff, viewerId } = useStaff();
  if (!staff || (authorId && viewerId && authorId === viewerId))
    return <>{children}</>;
  return (
    <span className="staff-overlay">
      {children}
      <StaffRemove
        kind={kind}
        id={id}
        lang={lang}
        authorId={authorId}
        compact
      />
    </span>
  );
}

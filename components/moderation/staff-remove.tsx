"use client";

import { LoaderCircle, ShieldX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * Taking somebody else's post down, as staff, from the post itself.
 *
 * Moderation could only reach content through the console, and only content
 * somebody had reported: an admin reading a page of spam had to open the
 * queue, search the account and work from a list of one-line excerpts, or
 * else ban the account and leave what it wrote on the front page. This is the
 * same action the console runs, offered where the decision is actually made.
 *
 * Two presses, like every other removal, and a reason typed into the console
 * is optional here: what matters is that it enters the audit log and tells the
 * author, both of which the database does on its own.
 */
export function StaffRemove({
  kind,
  id,
  lang,
  afterRemove,
}: {
  kind: "REVIEW" | "DIARY" | "LIST";
  id: string;
  lang: UiLang;
  /** Where to go once it is gone, since this page will not exist. */
  afterRemove: string;
}) {
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
      body: JSON.stringify({ do: "post", kind, post: id, reason: null }),
    });
    if (!answer.ok) {
      setError(true);
      setPending(false);
      return;
    }
    router.replace(afterRemove);
    router.refresh();
  }

  return (
    <button
      type="button"
      className="staff-remove-action"
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
          : tri(
              lang,
              "Remover (moderação)",
              "Remove (moderation)",
              "Quitar (moderación)",
            )}
    </button>
  );
}

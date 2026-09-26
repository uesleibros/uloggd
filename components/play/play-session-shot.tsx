"use client";

import { Camera, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import { api, settle } from "@/lib/api-client";
import { prepareImageUpload } from "@/lib/prepare-image-upload";
import type { OpenSession, PlayEvent } from "@/lib/play-session";
import { requestXpRefresh } from "@/lib/xp-feedback";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * A screenshot taken during a session, in one press.
 *
 * The picture is a real uloggd screenshot: its own page, its own visibility,
 * spoiler and sensitive marks, likes, comments and moderation. There is no
 * second place images live. The playlog only points at it, through a SHOT
 * event, which is why this is a file picker and not an editor: everything the
 * screenshot studio asks can still be answered afterwards on the shot's own
 * page, and asking here would be a form in the middle of playing.
 *
 * The visibility it starts at is the session's, because somebody who opened a
 * private session does not expect its pictures to be public.
 */
export function PlaySessionShot({
  session,
  lang,
  onAdded,
  onFailed,
}: {
  session: OpenSession;
  lang: UiLang;
  onAdded: (event: PlayEvent) => void;
  onFailed?: (message: string) => void;
}) {
  const input = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState(false);

  async function send(file: File) {
    if (pending) return;
    setPending(true);
    const fail = () =>
      onFailed?.(
        tri(
          lang,
          "Não deu para enviar a captura.",
          "The screenshot could not be sent.",
          "No se pudo enviar la captura.",
        ),
      );
    try {
      const body = new FormData();
      body.set(
        "image",
        await prepareImageUpload(file, { name: "screenshot.webp" }),
      );
      body.set("gameId", String(session.igdb_id));
      body.set("gameSlug", session.game_slug);
      body.set("description", "");
      body.set("visibility", session.visibility);
      body.set("spoilers", "false");
      body.set("sensitive", "false");
      body.set("sensitiveAuto", "false");
      body.set("commentsScope", "EVERYONE");
      const response = await fetch("/api/screenshots", {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as { id?: string };
      if (!response.ok || !payload.id) throw new Error("upload");

      const { data, error } = await settle(
        api.post<{ data: PlayEvent }>(
          `/journal/sessions/${session.id}/events`,
          { kind: "SHOT", screenshot_public_id: payload.id },
        ),
      );
      if (error || !data) throw new Error("event");
      requestXpRefresh();
      onAdded(data);
    } catch {
      fail();
    } finally {
      setPending(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={pending}
        aria-label={tri(
          lang,
          "Captura desta sessão",
          "Screenshot of this session",
          "Captura de esta sesión",
        )}
      >
        {pending ? (
          <LoaderCircle size={13} className="spin" aria-hidden />
        ) : (
          <Camera size={13} aria-hidden />
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(change) => {
          const file = change.target.files?.[0];
          if (file) void send(file);
        }}
      />
    </>
  );
}

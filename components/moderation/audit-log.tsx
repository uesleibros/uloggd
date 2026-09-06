"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { RelativeTime } from "@/components/relative-time";
import { moderationActionLabel } from "@/lib/moderation";
import { tri, type UiLang } from "@/lib/ui-text";
import type { ModerationAction, ModerationProfile } from "./types";

/**
 * Who did what, in order.
 *
 * Each line used to be the raw enum: "USER BANNED", "REPORT DISMISSED", the
 * same in all three languages. A log is read by people, so it says what
 * somebody did and to whom, and it names both by handle.
 */
export function AuditLog({
  lang,
  actions,
  profiles,
  page,
  pageCount,
  total,
  busy,
  onGo,
}: {
  lang: UiLang;
  actions: ModerationAction[];
  profiles: Map<string, ModerationProfile>;
  page: number;
  pageCount: number;
  total: number;
  busy: boolean;
  onGo: (page: number) => void;
}) {
  return (
    <section className="moderation-section moderation-audit">
      <header>
        <h2>{tri(lang, "Auditoria", "Audit log", "Auditoría")}</h2>
        <p>
          {total === 1
            ? tri(lang, "1 decisão", "1 decision", "1 decisión")
            : tri(
                lang,
                `${total} decisões`,
                `${total} decisions`,
                `${total} decisiones`,
              )}
        </p>
      </header>

      {actions.length === 0 ? (
        <p className="moderation-empty">
          {tri(
            lang,
            "Nenhuma decisão registrada.",
            "No decisions recorded yet.",
            "Ninguna decisión registrada.",
          )}
        </p>
      ) : (
        <ol aria-busy={busy}>
          {actions.map((action) => {
            const actor = profiles.get(action.moderator_id);
            const target = action.target_profile_id
              ? profiles.get(action.target_profile_id)
              : undefined;
            return (
              <li key={action.id}>
                <ShieldCheck size={14} aria-hidden />
                <div>
                  <p>
                    <strong>
                      {moderationActionLabel(action.action, lang)}
                    </strong>
                    {target?.username && (
                      <>
                        {" · "}
                        <Link
                          href={`/${lang}/u/${target.username}`}
                          target="_blank"
                        >
                          @{target.username}
                        </Link>
                      </>
                    )}
                  </p>
                  {action.reason && <q>{action.reason}</q>}
                  <small>
                    {actor?.username ? `@${actor.username}` : "—"}
                    {" · "}
                    <RelativeTime value={action.created_at} lang={lang} />
                  </small>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <Pagination
        jump={false}
        page={page}
        totalPages={pageCount}
        pending={busy}
        lang={lang}
        className="moderation-audit-pagination"
        onGo={onGo}
      />
    </section>
  );
}

import { tri, type UiLang } from "@/lib/ui-text";

/** Real values of reports.status. "ALL" is a view, not a status. */
export const MODERATION_REPORT_STATE_VALUES = [
  "OPEN",
  "REVIEWING",
  "RESOLVED",
  "DISMISSED",
] as const;

export const MODERATION_REPORT_STATUSES = [
  ...MODERATION_REPORT_STATE_VALUES,
  "ALL",
] as const;

export type ModerationStatus = (typeof MODERATION_REPORT_STATUSES)[number];

export function isModerationStatus(value: string): value is ModerationStatus {
  return (MODERATION_REPORT_STATUSES as readonly string[]).includes(value);
}

// Small enough that a page of reports reads as a queue instead of a wall. The
// counts moderators actually work from live in the status tabs, and everything
// past the first page is one click away.
export const MODERATION_PAGE_SIZE = 12;
export const MODERATION_AUDIT_PAGE_SIZE = 12;

/** 1-based, clamped to what the current result set can actually show. */
export function clampPage(raw: unknown, total: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const parsed = Number.parseInt(typeof raw === "string" ? raw : "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return { page: 1, pageCount };
  return { page: Math.min(parsed, pageCount), pageCount };
}

export const MODERATION_BAN_DURATIONS = [
  { value: "1", days: 1 },
  { value: "7", days: 7 },
  { value: "30", days: 30 },
] as const;

export const MODERATION_CONTENT_TYPES = [
  "PROFILE",
  "PROFILE_COMMENT",
  "CONTENT_COMMENT",
  "SCREENSHOT",
] as const;

export type ModerationContentType = (typeof MODERATION_CONTENT_TYPES)[number];

/**
 * The words the console shows for the values the database stores.
 *
 * Every one of these used to reach the screen as its raw enum, uppercased and
 * with the underscores swapped for spaces: HATE SPEECH above a report, USER
 * BANNED in the audit log, PROFILE as a content type. That is the database's
 * vocabulary, not a person's, and it was the same in all three languages on a
 * site that is translated everywhere else.
 */

export function reportReasonLabel(value: string, lang: UiLang) {
  switch (value) {
    case "HARASSMENT":
      return tri(lang, "Assédio", "Harassment", "Acoso");
    case "HATE_SPEECH":
      return tri(lang, "Discurso de ódio", "Hate speech", "Discurso de odio");
    case "SPAM":
      return "Spam";
    case "IMPERSONATION":
      return tri(lang, "Falsidade ideológica", "Impersonation", "Suplantación");
    case "SEXUAL_CONTENT":
      return tri(lang, "Conteúdo sexual", "Sexual content", "Contenido sexual");
    case "CHILD_SAFETY":
      return tri(
        lang,
        "Segurança infantil",
        "Child safety",
        "Seguridad infantil",
      );
    case "SELF_HARM":
      return tri(lang, "Automutilação", "Self-harm", "Autolesión");
    case "VIOLENCE":
      return tri(lang, "Violência", "Violence", "Violencia");
    case "PRIVACY":
      return tri(lang, "Privacidade", "Privacy", "Privacidad");
    case "OTHER":
      return tri(lang, "Outro", "Other", "Otro");
    default:
      return value;
  }
}

/** What the report is about, which decides which evidence the card can show. */
export function reportContentLabel(value: string | null, lang: UiLang) {
  switch (value) {
    case "PROFILE_COMMENT":
      return tri(
        lang,
        "Comentário de perfil",
        "Profile comment",
        "Comentario de perfil",
      );
    case "CONTENT_COMMENT":
      return tri(lang, "Comentário", "Comment", "Comentario");
    case "SCREENSHOT":
      return tri(lang, "Captura", "Screenshot", "Captura");
    case "PROFILE":
    case null:
      return tri(lang, "Perfil", "Profile", "Perfil");
    default:
      return value;
  }
}

export function reportStatusLabel(value: string, lang: UiLang) {
  switch (value) {
    case "OPEN":
      return tri(lang, "Aberta", "Open", "Abierta");
    case "REVIEWING":
      return tri(lang, "Em análise", "Reviewing", "En revisión");
    case "RESOLVED":
      return tri(lang, "Resolvida", "Resolved", "Resuelta");
    case "DISMISSED":
      return tri(lang, "Descartada", "Dismissed", "Descartada");
    default:
      return value;
  }
}

/** A line of the audit log, written as something somebody did. */
export function moderationActionLabel(value: string, lang: UiLang) {
  switch (value) {
    case "REPORT_RESOLVED":
      return tri(
        lang,
        "Resolveu uma denúncia",
        "Resolved a report",
        "Resolvió una denuncia",
      );
    case "REPORT_DISMISSED":
      return tri(
        lang,
        "Descartou uma denúncia",
        "Dismissed a report",
        "Descartó una denuncia",
      );
    case "REPORT_REVIEWING":
      return tri(
        lang,
        "Assumiu uma denúncia",
        "Took a report",
        "Tomó una denuncia",
      );
    case "USER_BANNED":
      return tri(
        lang,
        "Baniu uma conta",
        "Banned an account",
        "Baneó una cuenta",
      );
    case "USER_UNBANNED":
      return tri(
        lang,
        "Desbaniu uma conta",
        "Unbanned an account",
        "Desbaneó una cuenta",
      );
    case "USER_VERIFIED":
      return tri(
        lang,
        "Verificou uma conta",
        "Verified an account",
        "Verificó una cuenta",
      );
    case "USER_UNVERIFIED":
      return tri(
        lang,
        "Retirou uma verificação",
        "Removed a verification",
        "Quitó una verificación",
      );
    case "USER_ORG_REVOKED":
      return tri(
        lang,
        "Revogou uma organização",
        "Revoked an organization",
        "Revocó una organización",
      );
    case "COMMENT_REMOVED":
      return tri(
        lang,
        "Removeu um comentário",
        "Removed a comment",
        "Eliminó un comentario",
      );
    case "SCREENSHOT_REMOVED":
      return tri(
        lang,
        "Removeu uma captura",
        "Removed a screenshot",
        "Eliminó una captura",
      );
    default:
      return value.replaceAll("_", " ").toLowerCase();
  }
}

import type { UiLang } from "@/lib/ui-text";

/**
 * What a push notification says, per kind.
 *
 * Kept apart from the route so the wording can be read and changed without
 * touching delivery, and so a kind added to the database without a line here
 * fails a test rather than reaching someone's lock screen as "uloggd".
 *
 * The recipient's own locale decides the language, since a push arrives with
 * no page and no request headers to infer it from.
 */
export type PushKind =
  | "follow"
  | "review_like"
  | "list_like"
  | "journal_like"
  | "screenshot_like"
  | "profile_comment"
  | "profile_comment_like"
  | "screenshot_comment"
  | "screenshot_comment_like"
  | "post_comment"
  | "post_comment_like"
  | "mineral_transfer"
  | "moderation_comment_removed"
  | "moderation_screenshot_removed"
  | "moderation_warning"
  | "moderation_suspended"
  | "moderation_reinstated";

type Copy = { pt: string; en: string; es: string };

const BODY: Record<PushKind, Copy> = {
  follow: {
    pt: "começou a seguir você",
    en: "started following you",
    es: "empezó a seguirte",
  },
  review_like: {
    pt: "curtiu sua avaliação",
    en: "liked your review",
    es: "le gustó tu reseña",
  },
  list_like: {
    pt: "curtiu sua lista",
    en: "liked your list",
    es: "le gustó tu lista",
  },
  journal_like: {
    pt: "curtiu seu registro",
    en: "liked your journal entry",
    es: "le gustó tu registro",
  },
  screenshot_like: {
    pt: "curtiu sua captura",
    en: "liked your screenshot",
    es: "le gustó tu captura",
  },
  profile_comment: {
    pt: "comentou no seu perfil",
    en: "commented on your profile",
    es: "comentó en tu perfil",
  },
  profile_comment_like: {
    pt: "curtiu seu comentário",
    en: "liked your comment",
    es: "le gustó tu comentario",
  },
  screenshot_comment: {
    pt: "comentou na sua captura",
    en: "commented on your screenshot",
    es: "comentó en tu captura",
  },
  screenshot_comment_like: {
    pt: "curtiu seu comentário",
    en: "liked your comment",
    es: "le gustó tu comentario",
  },
  post_comment: {
    pt: "comentou na sua publicação",
    en: "commented on your post",
    es: "comentó en tu publicación",
  },
  post_comment_like: {
    pt: "curtiu seu comentário",
    en: "liked your comment",
    es: "le gustó tu comentario",
  },
  mineral_transfer: {
    pt: "te enviou minérios",
    en: "sent you minerals",
    es: "te envió minerales",
  },
  moderation_comment_removed: {
    pt: "Um comentário seu foi removido pela moderação",
    en: "A comment of yours was removed by moderation",
    es: "Un comentario tuyo fue eliminado por moderación",
  },
  moderation_screenshot_removed: {
    pt: "Uma captura sua foi removida pela moderação",
    en: "A screenshot of yours was removed by moderation",
    es: "Una captura tuya fue eliminada por moderación",
  },
  moderation_warning: {
    pt: "Você recebeu um aviso da moderação",
    en: "You received a warning from moderation",
    es: "Recibiste un aviso de moderación",
  },
  moderation_suspended: {
    pt: "Sua conta foi suspensa",
    en: "Your account has been suspended",
    es: "Tu cuenta fue suspendida",
  },
  moderation_reinstated: {
    pt: "Sua conta foi liberada",
    en: "Your account has been reinstated",
    es: "Tu cuenta fue restablecida",
  },
};

/**
 * Notices from moderation, which are about the account rather than about
 * something somebody did to it. They are the whole sentence on their own: a
 * moderator's name never appears in front of one.
 */
const SYSTEM = new Set<PushKind>([
  "moderation_comment_removed",
  "moderation_screenshot_removed",
  "moderation_warning",
  "moderation_suspended",
  "moderation_reinstated",
]);

/** Kinds that describe an action by another account rather than a system event. */
const HAS_ACTOR = new Set<PushKind>(
  (Object.keys(BODY) as PushKind[]).filter((kind) => !SYSTEM.has(kind)),
);

export function isPushKind(value: string): value is PushKind {
  return value in BODY;
}

export function pushMessage(
  kind: PushKind,
  actorName: string | null,
  targetTitle: string | null,
  lang: UiLang,
) {
  const tag: keyof Copy = lang === "en" ? "en" : lang === "es" ? "es" : "pt";
  const phrase = BODY[kind][tag];
  const body =
    HAS_ACTOR.has(kind) && actorName ? `${actorName} ${phrase}` : phrase;
  return {
    title: targetTitle || "uloggd",
    body,
  };
}

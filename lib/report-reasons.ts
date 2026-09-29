import type { ComponentType } from "react";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import {
  CircleHelp,
  EyeOff,
  Lock,
  Megaphone,
  MessageSquareWarning,
  ShieldAlert,
  UserRoundX,
  UserX,
} from "lucide-react";

/**
 * One icon per report reason code, shared by every report menu so a reason
 * reads the same whether it is flagged on a list, a screenshot, or a comment.
 * Unknown codes fall back to the neutral "other" icon.
 */
const REASON_ICON: Record<string, ComponentType<{ size?: number }>> = {
  IMPERSONATION: UserRoundX,
  HARASSMENT: UserX,
  HATE_SPEECH: MessageSquareWarning,
  SEXUAL_CONTENT: EyeOff,
  SPAM: Megaphone,
  CHILD_SAFETY: ShieldAlert,
  PRIVACY: Lock,
  OTHER: CircleHelp,
};

export function reportReasonIcon(reason: string): ComponentType<{
  size?: number;
}> {
  return REASON_ICON[reason] ?? CircleHelp;
}

/**
 * What each reason is called.
 *
 * The icons were shared from the start and the words were not: four report
 * menus and the moderation console each wrote the eight labels out, and they
 * had already drifted: the same `IMPERSONATION` read "Falsa identidade" on a
 * profile and "Falsidade ideológica" in the console, which is one code and two
 * accusations.
 *
 * Which reasons a surface offers is still the surface's own decision: a
 * screenshot can be reported for what it shows, a profile for who it claims
 * to be. Only the wording is settled here.
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
      return uiText(lang).privacy;
    case "OTHER":
      return uiText(lang).other;
    default:
      return value;
  }
}

/** The codes a surface offers, each with its word and its mark. */
export function reportReasonOptions(codes: readonly string[], lang: UiLang) {
  return codes.map((code) => ({
    value: code,
    label: reportReasonLabel(code, lang),
    Icon: reportReasonIcon(code),
  }));
}

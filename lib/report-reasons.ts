import type { ComponentType } from "react";
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

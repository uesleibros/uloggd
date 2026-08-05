import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card";
import { workspaceCard } from "@/lib/og-workspace-card";
import { resolveLocale } from "../../dictionaries";

export const alt = "Capturas no uloggd";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

type Props = { params: Promise<{ lang: string; username: string }> };

// The card itself lives in `workspaceCard`: this route, the two beside it and
// their Twitter twins differ only in which word goes on top.
export default async function Image({ params }: Props) {
  const { lang, username } = await params;
  return workspaceCard("shots", username, resolveLocale(lang));
}

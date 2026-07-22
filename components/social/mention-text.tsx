import Link from "next/link";
import type { UiLang } from "@/lib/ui-text";

const mentionPattern = /(^|[^\w])@([a-z0-9_]{3,24})/gi;

export function MentionText({ text, lang }: { text: string; lang: UiLang }) {
  const parts: Array<string | { username: string; prefix: string }> = [];
  let cursor = 0;
  for (const match of text.matchAll(mentionPattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push(text.slice(cursor, index));
    parts.push({ prefix: match[1], username: match[2] });
    cursor = index + match[0].length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts.map((part, index) =>
    typeof part === "string" ? (
      part
    ) : (
      <span key={`${part.username}-${index}`}>
        {part.prefix}
        <Link className="user-mention" href={`/${lang}/u/${part.username}`}>
          @{part.username}
        </Link>
      </span>
    ),
  );
}

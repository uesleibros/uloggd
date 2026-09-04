import twemoji from "@twemoji/api";
import { SKIP, visit } from "unist-util-visit";

const ZERO_WIDTH_JOINER = "\u200D";
const VARIATION_SELECTOR = /\uFE0F/g;
const LITERAL_TAGS = new Set(["code", "pre", "script", "style", "textarea"]);

type TextNode = { type: "text"; value: string };
type ElementNode = {
  type: "element";
  tagName: string;
  properties: Record<string, string>;
  children: unknown[];
};
type AnyNode = { type: string; tagName?: string; value?: string };

function iconId(raw: string) {
  return twemoji.convert.toCodePoint(
    raw.includes(ZERO_WIDTH_JOINER) ? raw : raw.replace(VARIATION_SELECTOR, ""),
  );
}

function split(text: string): (TextNode | ElementNode)[] | null {
  const parts: (TextNode | ElementNode)[] = [];
  let cursor = 0;

  twemoji.replace(text, (...args: unknown[]) => {
    const raw = args[0] as string;
    const offset = args[args.length - 2] as number;
    const id = iconId(raw);
    if (!id) return raw;
    if (offset > cursor)
      parts.push({ type: "text", value: text.slice(cursor, offset) });
    parts.push({
      type: "element",
      tagName: "emoji",
      properties: { src: `${twemoji.base}svg/${id}.svg`, alt: raw },
      children: [],
    });
    cursor = offset + raw.length;
    return raw;
  });

  if (parts.length === 0) return null;
  if (cursor < text.length)
    parts.push({ type: "text", value: text.slice(cursor) });
  return parts;
}

export function rehypeEmoji() {
  return (tree: unknown) => {
    visit(tree as never, (node, index, parent) => {
      const current = node as AnyNode;
      if (current.type === "element" && LITERAL_TAGS.has(current.tagName ?? ""))
        return SKIP;
      if (current.type !== "text" || !parent || index === null) return;
      const value = current.value ?? "";
      if (!value || !twemoji.test(value)) return;
      const parts = split(value);
      if (!parts) return;
      (parent as { children: unknown[] }).children.splice(
        index,
        1,
        ...(parts as unknown[]),
      );
      return index + parts.length;
    });
  };
}

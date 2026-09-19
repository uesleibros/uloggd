import { SKIP, visit } from "unist-util-visit";
import { splitEmoji } from "./emoji-match";

const LITERAL_TAGS = new Set(["code", "pre", "script", "style", "textarea"]);

type TextNode = { type: "text"; value: string };
type ElementNode = {
  type: "element";
  tagName: string;
  properties: Record<string, string>;
  children: unknown[];
};
type AnyNode = { type: string; tagName?: string; value?: string };

function split(text: string): (TextNode | ElementNode)[] | null {
  return (
    splitEmoji(text)?.map((part) =>
      typeof part === "string"
        ? { type: "text" as const, value: part }
        : {
            type: "element" as const,
            tagName: "emoji",
            properties: { src: part.src, alt: part.raw },
            children: [],
          },
    ) ?? null
  );
}

export function rehypeEmoji() {
  return (tree: unknown) => {
    visit(tree as never, (node, index, parent) => {
      const current = node as AnyNode;
      if (current.type === "element" && LITERAL_TAGS.has(current.tagName ?? ""))
        return SKIP;
      if (current.type !== "text" || !parent || index === null) return;
      const value = current.value ?? "";
      if (!value) return;
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

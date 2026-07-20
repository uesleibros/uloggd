"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bug,
  CircleCheck,
  CircleHelp,
  Flame,
  FlaskConical,
  Gamepad2,
  Info,
  Lightbulb,
  NotebookPen,
  OctagonAlert,
} from "lucide-react";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { visit } from "unist-util-visit";

// Ported from the legacy uloggd markdown editor: shortcut syntax becomes
// custom elements that survive sanitization and render as rich components.
const CONTENT_TRANSFORMS: Array<{
  pattern: RegExp;
  replace: string;
}> = [
  {
    pattern: /!game:mini\(([^)\n]+)\)/g,
    replace: '<game-card slug="$1"></game-card>',
  },
  {
    pattern: /!game:grid-auto\(([^)\n]+)\)/g,
    replace: '<game-grid slugs="$1"></game-grid>',
  },
  {
    pattern: /!game:grid\(([^)\n]+)\)/g,
    replace: '<game-grid slugs="$1"></game-grid>',
  },
  {
    pattern: /!game\(([^)\n]+)\)/g,
    replace: '<game-card slug="$1"></game-card>',
  },
];

function processContent(content: string) {
  // Code spans and fences are shielded from every transform.
  const shielded: string[] = [];
  let result = content.replace(/```[\s\S]*?```|`[^`\n]+`/g, (match) => {
    shielded.push(match);
    return `\u0000${shielded.length - 1}\u0000`;
  });
  for (const { pattern, replace } of CONTENT_TRANSFORMS) {
    result = result.replace(pattern, replace);
  }
  result = result.replace(/@(\w[\w.-]{0,38})/g, "<mention>$1</mention>");
  result = result.replace(/\|\|([\s\S]+?)\|\|/g, "<spoiler>$1</spoiler>");
  result = result.replace(/\u0000(\d+)\u0000/g, (_, index) =>
    String(shielded[Number(index)] ?? ""),
  );
  return result;
}

function remarkAlert() {
  return (tree: import("unist").Node) => {
    visit(
      tree,
      (node: import("unist").Node & { name?: string; data?: unknown }) => {
        if (
          node.type === "containerDirective" ||
          node.type === "leafDirective"
        ) {
          const data = ((node.data as Record<string, unknown>) ??= {});
          data.hName = "alert-box";
          data.hProperties = { type: node.name };
        }
      },
    );
  };
}

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "spoiler",
    "mention",
    "center",
    "game-card",
    "game-grid",
    "alert-box",
    "details",
    "summary",
  ],
  attributes: {
    ...defaultSchema.attributes,
    img: ["src", "alt", "width", "height", "loading"],
    "alert-box": ["type"],
    "game-card": ["slug"],
    "game-grid": ["slugs"],
    mention: [],
    spoiler: [],
    center: [],
  },
  protocols: {
    ...defaultSchema.protocols,
    src: ["https"],
  },
};

const remarkPlugins = [remarkGfm, remarkBreaks, remarkDirective, remarkAlert];
const rehypePlugins = [rehypeRaw, [rehypeSanitize, sanitizeSchema]] as never[];

function Spoiler({ children }: { children?: ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      role="button"
      tabIndex={0}
      className="md-spoiler"
      data-revealed={revealed || undefined}
      onClick={() => setRevealed(true)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setRevealed(true);
        }
      }}
      aria-label={revealed ? undefined : "Spoiler"}
    >
      {children}
    </span>
  );
}

const alertVariants: Record<
  string,
  { icon: ComponentType<{ size?: number }>; tone: string }
> = {
  info: { icon: Info, tone: "info" },
  note: { icon: NotebookPen, tone: "info" },
  tip: { icon: Lightbulb, tone: "success" },
  success: { icon: CircleCheck, tone: "success" },
  important: { icon: Flame, tone: "warning" },
  warning: { icon: AlertTriangle, tone: "warning" },
  danger: { icon: OctagonAlert, tone: "danger" },
  bug: { icon: Bug, tone: "danger" },
  question: { icon: CircleHelp, tone: "info" },
  example: { icon: FlaskConical, tone: "neutral" },
  neutral: { icon: Info, tone: "neutral" },
};

function slugLabel(slug: string) {
  return slug
    .trim()
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function MarkdownContent({
  content,
  lang,
}: {
  content: string;
  lang: "pt-BR" | "en";
}) {
  const processed = useMemo(() => processContent(content), [content]);
  const components = useMemo(() => {
    const custom = {
      a: ({ href, children }: { href?: string; children?: ReactNode }) => (
        <a href={href} target="_blank" rel="noreferrer noopener nofollow">
          {children}
        </a>
      ),
      img: (props: { src?: string; alt?: string }) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.src} alt={props.alt ?? ""} loading="lazy" />
      ),
      mention: ({ children }: { children?: ReactNode }) => {
        const username = String(children ?? "").trim();
        if (!username) return null;
        return (
          <Link className="md-mention" href={`/${lang}/u/${username}`}>
            @{username}
          </Link>
        );
      },
      spoiler: ({ children }: { children?: ReactNode }) => (
        <Spoiler>{children}</Spoiler>
      ),
      center: ({ children }: { children?: ReactNode }) => (
        <div className="md-center">{children}</div>
      ),
      "game-card": ({ slug }: { slug?: string }) => {
        const safe = String(slug ?? "").trim();
        if (!/^[a-z0-9-]+$/i.test(safe)) return null;
        return (
          <Link className="md-game-chip" href={`/${lang}/game/${safe}`}>
            <Gamepad2 size={13} aria-hidden />
            {slugLabel(safe)}
          </Link>
        );
      },
      "game-grid": ({ slugs }: { slugs?: string }) => {
        const list = String(slugs ?? "")
          .split(",")
          .map((slug) => slug.trim())
          .filter((slug) => /^[a-z0-9-]+$/i.test(slug))
          .slice(0, 12);
        if (!list.length) return null;
        return (
          <span className="md-game-grid">
            {list.map((slug) => (
              <Link
                className="md-game-chip"
                href={`/${lang}/game/${slug}`}
                key={slug}
              >
                <Gamepad2 size={13} aria-hidden />
                {slugLabel(slug)}
              </Link>
            ))}
          </span>
        );
      },
      "alert-box": ({
        type,
        children,
      }: {
        type?: string;
        children?: ReactNode;
      }) => {
        const variant = alertVariants[type ?? ""] ?? alertVariants.neutral;
        const Icon = variant.icon;
        return (
          <div className="md-alert" data-tone={variant.tone}>
            <span aria-hidden>
              <Icon size={15} />
            </span>
            <div>{children}</div>
          </div>
        );
      },
    };
    return custom as unknown as Components;
  }, [lang]);

  if (!processed.trim()) return null;
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}

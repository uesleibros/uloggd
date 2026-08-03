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
  Star,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ComponentType,
  type ReactNode,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { visit } from "unist-util-visit";
import type { UiLang } from "@/lib/ui-text";
import { primaryGameCompany } from "@/lib/game-company";

// Ported from the legacy uloggd markdown editor: shortcut syntax becomes
// custom elements that survive sanitization and render as rich components.
const CONTENT_TRANSFORMS: Array<{
  pattern: RegExp;
  replace: string;
}> = [
  {
    pattern: /!game:mini\(([^)\n]+)\)/g,
    replace: '<game-card slug="$1" variant="mini"></game-card>',
  },
  {
    pattern: /!game:grid-auto\(([^)\n]+)\)/g,
    replace: '<game-grid slugs="$1" auto="true"></game-grid>',
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

export type MarkdownContentVariant = "showcase" | "review";

function processContent(content: string, variant: MarkdownContentVariant) {
  // Code spans and fences are shielded from every transform.
  const shielded: string[] = [];
  let result = content.replace(/```[\s\S]*?```|`[^`\n]+`/g, (match) => {
    shielded.push(match);
    return `\u0000${shielded.length - 1}\u0000`;
  });
  // Single newlines become <br> via remark-breaks; markdown would otherwise
  // swallow the blank lines beyond the first, so keep them as explicit spacers.
  // Lines holding only spaces count as blank, editors leave those behind
  // constantly and the author still meant them as vertical space.
  result = result.replace(/^[^\S\n]+$/gm, "");
  result = result.replace(
    /\n{3,}/g,
    (run) => `\n\n${"<br />\n\n".repeat(run.length - 2)}`,
  );
  if (variant === "showcase")
    for (const { pattern, replace } of CONTENT_TRANSFORMS)
      result = result.replace(pattern, replace);
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
    "desktop",
    "mobile",
    "dark",
    "light",
    "spoilerimg",
    "pt",
    "en",
    "es",
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
    "game-card": ["slug", "variant"],
    "game-grid": ["slugs", "auto"],
    spoilerimg: ["src", "alt", "width", "height"],
    mention: [],
    spoiler: [],
    center: [],
    desktop: [],
    mobile: [],
    dark: [],
    light: [],
    pt: [],
    en: [],
    es: [],
  },
  protocols: {
    ...defaultSchema.protocols,
    src: ["https"],
  },
};

const REVIEW_TAGS = new Set([
  "a",
  "blockquote",
  "br",
  "code",
  "del",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "img",
  "li",
  "mention",
  "ol",
  "p",
  "pre",
  "spoiler",
  "spoilerimg",
  "strong",
  "ul",
]);

// Reviews deliberately accept a much smaller language than profile showcases.
// The server stores plain Markdown; this render boundary permits only inert
// images alongside prose and strips game embeds, active media and layout
// directives even if someone hand-types them.
const reviewSanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []).filter((tag) => REVIEW_TAGS.has(tag)),
    "mention",
    "spoiler",
    "spoilerimg",
  ],
  attributes: {
    ...defaultSchema.attributes,
    img: ["src", "alt", "loading"],
    mention: [],
    spoiler: [],
    spoilerimg: ["src", "alt"],
  },
  protocols: {
    ...defaultSchema.protocols,
    src: ["https"],
  },
};

const remarkPlugins = [remarkGfm, remarkBreaks, remarkDirective, remarkAlert];
const rehypePlugins = [rehypeRaw, [rehypeSanitize, sanitizeSchema]] as never[];
const reviewRehypePlugins = [
  rehypeRaw,
  [rehypeSanitize, reviewSanitizeSchema],
] as never[];

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

type HastElement = {
  type?: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastElement[];
};

// Tags that keep a paragraph a paragraph; anything else forces a block wrapper.
const INLINE_TAGS = new Set([
  "a",
  "abbr",
  "b",
  "bdo",
  "br",
  "cite",
  "code",
  "del",
  "em",
  "i",
  "img",
  "ins",
  "kbd",
  "mark",
  "mention",
  "q",
  "s",
  "small",
  "span",
  "spoiler",
  "strong",
  "sub",
  "sup",
  "u",
]);

const YOUTUBE_URL =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;

function youtubeId(href?: string) {
  if (!href) return null;
  return href.trim().match(YOUTUBE_URL)?.[1] ?? null;
}

function YouTubeEmbed({ videoId }: { videoId: string }) {
  return (
    <span className="md-video">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title="YouTube"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </span>
  );
}

type MdImageProps = {
  src?: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
};

// The editor can emit <img width="400">; honour it without letting an image
// escape its container on narrow screens.
function sizeStyle({ width, height }: MdImageProps) {
  const style: { width?: string; height?: string } = {};
  if (width) {
    style.width = `min(${Number(width) || 0}px, 100%)`;
    style.height = "auto";
  } else if (height) {
    style.height = `${Number(height) || 0}px`;
    style.width = "auto";
  }
  return Object.keys(style).length ? style : undefined;
}

function slugLabel(slug: string) {
  return slug
    .trim()
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type MarkdownGame = {
  name: string;
  slug: string;
  coverUrl: string;
  heroUrl: string | null;
  summary: string;
  releaseYear: number | null;
  genres: string[];
  platforms: string[];
  developers: string[];
  publishers: string[];
};

const EMPTY_GAMES: Map<string, MarkdownGame | null> = new Map();

// All game slugs in the document resolve through one batched request, like
// the legacy GamesBatchProvider.
const MarkdownGamesContext = createContext<{
  bySlug: Map<string, MarkdownGame | null>;
  ready: boolean;
}>({ bySlug: new Map(), ready: true });

const GAME_SYNTAX = /!game(?::mini|:grid-auto|:grid)?\(([^)\n]+)\)/g;

function cleanSlug(raw: string) {
  return raw.trim().replace(/\+$/, "").toLowerCase();
}

function collectGameSlugs(content: string) {
  const slugs = new Set<string>();
  for (const match of content.matchAll(GAME_SYNTAX)) {
    for (const part of match[1].split(",")) {
      const slug = cleanSlug(part);
      if (/^[a-z0-9-]{1,80}$/.test(slug)) slugs.add(slug);
    }
  }
  return [...slugs].sort();
}

function useMarkdownGame(slug: string) {
  const { bySlug, ready } = useContext(MarkdownGamesContext);
  return { game: bySlug.get(slug) ?? null, ready };
}

function GameCardSkeleton({ variant }: { variant: "card" | "mini" | "tile" }) {
  return (
    <span className={`md-gc-skeleton md-gc-skeleton-${variant}`} aria-hidden />
  );
}

function GameCardError({ slug }: { slug: string }) {
  return (
    <span className="md-gc-error">
      <Gamepad2 size={14} aria-hidden />
      {slugLabel(slug)}
    </span>
  );
}

function MdGameCard({ slug, lang }: { slug: string; lang: UiLang }) {
  const { game, ready } = useMarkdownGame(slug);
  if (!ready) return <GameCardSkeleton variant="card" />;
  if (!game) return <GameCardError slug={slug} />;
  const meta = [primaryGameCompany(game), game.releaseYear].filter(
    Boolean,
  ) as string[];
  return (
    <span className="md-gc">
      {game.heroUrl && (
        <span
          className="md-gc-backdrop"
          style={{ backgroundImage: `url(${game.heroUrl})` }}
          aria-hidden
        />
      )}
      <Link className="md-gc-cover" href={`/${lang}/game/${game.slug}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={game.coverUrl} alt="" loading="lazy" />
      </Link>
      <span className="md-gc-copy">
        <span className="md-gc-title">
          <Link href={`/${lang}/game/${game.slug}`}>{game.name}</Link>
          {game.releaseYear && <b>{game.releaseYear}</b>}
        </span>
        {meta.length > 0 && <small>{meta.join(" • ")}</small>}
        {game.summary && <span className="md-gc-summary">{game.summary}</span>}
        {game.platforms.length > 0 && (
          <small className="md-gc-platforms">
            {game.platforms.slice(0, 4).join(" · ")}
          </small>
        )}
      </span>
    </span>
  );
}

function MdGameMini({ slug, lang }: { slug: string; lang: UiLang }) {
  const { game, ready } = useMarkdownGame(slug);
  if (!ready) return <GameCardSkeleton variant="mini" />;
  if (!game) return <GameCardError slug={slug} />;
  return (
    <Link className="md-gc-mini" href={`/${lang}/game/${game.slug}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={game.coverUrl} alt="" loading="lazy" />
      <span>
        <strong>{game.name}</strong>
        <small>
          {[game.releaseYear, primaryGameCompany(game)]
            .filter(Boolean)
            .join(" • ")}
        </small>
      </span>
    </Link>
  );
}

function MdGameTile({
  slug,
  favorite,
  lang,
}: {
  slug: string;
  favorite: boolean;
  lang: UiLang;
}) {
  const { game, ready } = useMarkdownGame(slug);
  if (!ready) return <GameCardSkeleton variant="tile" />;
  // An unknown slug keeps its place instead of vanishing, so a typo is
  // visible in the grid rather than silently shortening it.
  if (!game)
    return (
      <span className="md-gc-tile md-gc-tile-missing">
        <span className="md-gc-tile-cover">
          <Gamepad2 size={18} aria-hidden />
        </span>
        <strong>{slugLabel(slug)}</strong>
      </span>
    );
  return (
    <Link
      className="md-gc-tile"
      href={`/${lang}/game/${game.slug}`}
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
    >
      <span className="md-gc-tile-cover">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={game.coverUrl} alt="" loading="lazy" draggable={false} />
        {favorite && (
          <b className="md-gc-favorite" aria-hidden>
            <Star size={11} />
          </b>
        )}
      </span>
      <strong>{game.name}</strong>
      {game.releaseYear && <small>{game.releaseYear}</small>}
    </Link>
  );
}

function MdGameRow({
  slugs,
  auto,
  lang,
}: {
  slugs: string;
  auto: boolean;
  lang: UiLang;
}) {
  const items = slugs
    .split(",")
    .map((raw) => ({
      slug: cleanSlug(raw),
      favorite: raw.trim().endsWith("+"),
    }))
    .filter((item) => /^[a-z0-9-]{1,80}$/.test(item.slug))
    .slice(0, 24);
  if (!items.length) return null;
  if (!auto) {
    return (
      <span className="md-gc-row">
        {items.map((item, index) => (
          <MdGameTile
            key={`${item.slug}-${index}`}
            slug={item.slug}
            favorite={item.favorite}
            lang={lang}
          />
        ))}
      </span>
    );
  }
  // The carousel loops a duplicated track, like the legacy grid-auto; the
  // duplicate is aria-hidden so content is only announced once.
  const looped: typeof items = [];
  while (looped.length < Math.max(8, items.length)) looped.push(...items);
  return <MdGameCarousel items={looped} lang={lang} />;
}

function MdGameCarousel({
  items,
  lang,
}: {
  items: Array<{ slug: string; favorite: boolean }>;
  lang: UiLang;
}) {
  const viewport = useRef<HTMLSpanElement>(null);
  const drag = useRef({ pointerId: -1, x: 0, scrollLeft: 0, moved: false });
  const paused = useRef(false);

  function normalizeLoop(node: HTMLSpanElement) {
    const loopWidth = node.scrollWidth / 3;
    if (loopWidth <= 0) return;
    while (node.scrollLeft >= loopWidth * 2) node.scrollLeft -= loopWidth;
    while (node.scrollLeft < loopWidth * 0.25) node.scrollLeft += loopWidth;
  }

  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const reducedMotion =
      document.documentElement.dataset.reduceMotion === "true" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const placeInMiddleCopy = () => {
      const loopWidth = node.scrollWidth / 3;
      if (loopWidth > 0 && node.scrollLeft === 0) node.scrollLeft = loopWidth;
    };
    placeInMiddleCopy();
    const resizeObserver = new ResizeObserver(placeInMiddleCopy);
    resizeObserver.observe(node);
    if (reducedMotion) return () => resizeObserver.disconnect();
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min(now - previous, 40);
      previous = now;
      if (!paused.current) node.scrollLeft += elapsed * 0.04;
      normalizeLoop(node);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, []);

  function onPointerDown(event: ReactPointerEvent<HTMLSpanElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    const node = viewport.current;
    if (!node) return;
    paused.current = true;
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      scrollLeft: node.scrollLeft,
      moved: false,
    };
    node.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLSpanElement>) {
    const node = viewport.current;
    if (!node || drag.current.pointerId !== event.pointerId) return;
    const distance = event.clientX - drag.current.x;
    if (Math.abs(distance) > 4) drag.current.moved = true;
    if (drag.current.moved) {
      event.preventDefault();
      node.scrollLeft = drag.current.scrollLeft - distance;
      normalizeLoop(node);
    }
  }

  function finishDrag(event: ReactPointerEvent<HTMLSpanElement>) {
    if (drag.current.pointerId !== event.pointerId) return;
    drag.current.pointerId = -1;
    const node = viewport.current;
    if (node) normalizeLoop(node);
    paused.current = false;
  }

  function preventDraggedClick(event: ReactMouseEvent<HTMLSpanElement>) {
    if (!drag.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current.moved = false;
  }

  return (
    <span
      className="md-gc-carousel"
      onPointerEnter={() => (paused.current = true)}
      onPointerLeave={(event) => {
        if (drag.current.pointerId < 0) paused.current = false;
        else finishDrag(event);
      }}
    >
      <span
        ref={viewport}
        className="md-gc-carousel-track"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onClickCapture={preventDraggedClick}
      >
        {["a", "b", "c"].map((copy) => (
          <span
            className="md-gc-row md-gc-row-loop"
            aria-hidden={copy !== "b" || undefined}
            key={copy}
          >
            {items.map((item, index) => (
              <MdGameTile
                key={`${copy}-${item.slug}-${index}`}
                slug={item.slug}
                favorite={item.favorite}
                lang={lang}
              />
            ))}
          </span>
        ))}
      </span>
    </span>
  );
}

export function MarkdownContent({
  content,
  lang,
  coverOwnerId,
  variant = "showcase",
}: {
  content: string;
  lang: UiLang;
  coverOwnerId?: string;
  variant?: MarkdownContentVariant;
}) {
  const processed = useMemo(
    () => processContent(content, variant),
    [content, variant],
  );
  const slugs = useMemo(
    () => (variant === "showcase" ? collectGameSlugs(content) : []),
    [content, variant],
  );
  const slugKey = slugs.join(",");
  const requestKey = `${coverOwnerId ?? "viewer"}:${slugKey}`;
  // Keyed by the slug list so a content change resets to loading without an
  // extra render pass.
  const [resolved, setResolved] = useState<{
    key: string;
    bySlug: Map<string, MarkdownGame | null>;
  }>({ key: "", bySlug: EMPTY_GAMES });
  const games = useMemo(() => {
    if (!slugKey) return { bySlug: EMPTY_GAMES, ready: true };
    if (resolved.key === requestKey)
      return { bySlug: resolved.bySlug, ready: true };
    return { bySlug: EMPTY_GAMES, ready: false };
  }, [requestKey, resolved, slugKey]);

  useEffect(() => {
    if (!slugKey) return;
    let active = true;
    const params = new URLSearchParams({ slugs: slugKey });
    if (coverOwnerId) params.set("coverOwner", coverOwnerId);
    fetch(`/api/igdb/games?${params.toString()}`)
      .then((response) => (response.ok ? response.json() : { results: [] }))
      .then((payload: { results?: MarkdownGame[] }) => {
        if (!active) return;
        const bySlug = new Map<string, MarkdownGame | null>(
          slugKey.split(",").map((slug) => [slug, null]),
        );
        for (const game of payload.results ?? []) bySlug.set(game.slug, game);
        setResolved({ key: requestKey, bySlug });
      })
      .catch(() => {
        if (active) setResolved({ key: requestKey, bySlug: EMPTY_GAMES });
      });
    return () => {
      active = false;
    };
  }, [coverOwnerId, requestKey, slugKey]);

  const components = useMemo(() => {
    const custom = {
      // A paragraph holding block-level content (game cards, embeds) becomes a
      // div so the layout is not constrained by inline flow.
      p: ({ children, node }: { children?: ReactNode; node?: HastElement }) => {
        const only = node?.children?.length === 1 ? node.children[0] : null;
        const href =
          only?.type === "element" && only.tagName === "a"
            ? String(only.properties?.href ?? "")
            : only?.type === "text"
              ? only.value
              : "";
        const videoId = variant === "showcase" ? youtubeId(href) : null;
        if (videoId) return <YouTubeEmbed videoId={videoId} />;
        const hasBlock = node?.children?.some(
          (child) =>
            child.type === "element" && !INLINE_TAGS.has(child.tagName ?? ""),
        );
        return hasBlock ? <div>{children}</div> : <p>{children}</p>;
      },
      a: ({ href, children }: { href?: string; children?: ReactNode }) => {
        const videoId = variant === "showcase" ? youtubeId(href) : null;
        if (videoId) return <YouTubeEmbed videoId={videoId} />;
        return (
          <a href={href} target="_blank" rel="noreferrer noopener nofollow">
            {children}
          </a>
        );
      },
      img: (props: MdImageProps) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={props.src}
          alt={props.alt ?? ""}
          loading="lazy"
          style={sizeStyle(props)}
        />
      ),
      table: ({ children }: { children?: ReactNode }) => (
        <div className="md-table-wrap">
          <table>{children}</table>
        </div>
      ),
      details: ({ children }: { children?: ReactNode }) => (
        <details className="md-details">{children}</details>
      ),
      summary: ({ children }: { children?: ReactNode }) => (
        <summary className="md-summary">{children}</summary>
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
      desktop: ({ children }: { children?: ReactNode }) => (
        <div className="md-desktop-only">{children}</div>
      ),
      mobile: ({ children }: { children?: ReactNode }) => (
        <div className="md-mobile-only">{children}</div>
      ),
      // Theme blocks are resolved in CSS, not here: the theme lives on the
      // client and this renders on the server, so picking one at render time
      // would bake whichever theme the server guessed into the HTML.
      dark: ({ children }: { children?: ReactNode }) => (
        <div className="md-dark-only">{children}</div>
      ),
      light: ({ children }: { children?: ReactNode }) => (
        <div className="md-light-only">{children}</div>
      ),
      // Language blocks render only for the reader's current locale, so one
      // drawer can carry both versions of the text.
      pt: ({ children }: { children?: ReactNode }) =>
        lang === "pt-BR" ? <span className="md-lang">{children}</span> : null,
      en: ({ children }: { children?: ReactNode }) =>
        lang === "en" ? <span className="md-lang">{children}</span> : null,
      es: ({ children }: { children?: ReactNode }) =>
        lang === "es" ? <span className="md-lang">{children}</span> : null,
      spoilerimg: (props: MdImageProps) => (
        <Spoiler>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={props.src}
            alt={props.alt ?? ""}
            loading="lazy"
            style={sizeStyle(props)}
          />
        </Spoiler>
      ),
      "game-card": ({ slug, variant }: { slug?: string; variant?: string }) => {
        const safe = cleanSlug(String(slug ?? ""));
        if (!/^[a-z0-9-]{1,80}$/.test(safe)) return null;
        return variant === "mini" ? (
          <MdGameMini slug={safe} lang={lang} />
        ) : (
          <MdGameCard slug={safe} lang={lang} />
        );
      },
      "game-grid": ({ slugs, auto }: { slugs?: string; auto?: string }) => (
        <MdGameRow
          slugs={String(slugs ?? "")}
          auto={auto === "true"}
          lang={lang}
        />
      ),
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
  }, [lang, variant]);

  if (!processed.trim()) return null;
  return (
    <MarkdownGamesContext.Provider value={games}>
      <div className="markdown-body" data-variant={variant}>
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={
            variant === "review" ? reviewRehypePlugins : rehypePlugins
          }
          components={components}
        >
          {processed}
        </ReactMarkdown>
      </div>
    </MarkdownGamesContext.Provider>
  );
}

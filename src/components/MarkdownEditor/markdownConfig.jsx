import { defaultSchema } from "rehype-sanitize"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import rehypeSanitize from "rehype-sanitize"
import { SpoilerText } from "./SpoilerText"
import { SpoilerImage } from "./SpoilerImage"
import { Mention } from "./Mention"
import { GameCard } from "./GameCard"
import { GameGrid } from "./GameGrid"

export const customSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []), 
    "details", "summary", "iframe", "img", "spoiler", "spoilerimg", 
    "div", "center", "mention", "game-card", "game-grid", "svg", "path"
  ],
  attributes: {
    ...defaultSchema.attributes,
    img: ["src", "alt", "width", "height", "loading", "style"],
    spoilerimg: ["src", "alt", "width", "height"],
    iframe: ["src", "title", "allow", "allowfullscreen", "class", "className"],
    details: ["class", "className"],
    summary: ["class", "className"],
    div: [...(defaultSchema.attributes?.div || []), "class", "className", "style", "align"],
    p: ["style", "align"],
    h1: ["style", "align"],
    h2: ["style", "align"],
    h3: ["style", "align"],
    h4: ["style", "align"],
    h5: ["style", "align"],
    h6: ["style", "align"],
    center: [],
    mention: [],
    spoiler: [],
    "game-card": ["slug", "variant"],
    "game-grid": ["slugs"],
    svg: ["className", "class", "fill", "stroke", "viewBox", "strokeWidth", "width", "height"],
    path: ["d", "strokeLinecap", "strokeLinejoin"],
  },
  protocols: {
    ...defaultSchema.protocols,
    src: ["https"],
  },
}

export const remarkPlugins = [remarkGfm]
export const rehypePlugins = [rehypeRaw, [rehypeSanitize, customSchema]]

export const markdownComponents = {
  h1: ({ children }) => <h1 className="text-2xl sm:text-3xl font-bold text-white mt-6 mb-3 pb-2 border-b border-zinc-700">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl sm:text-2xl font-bold text-white mt-5 mb-2 pb-1.5 border-b border-zinc-800">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg sm:text-xl font-semibold text-white mt-4 mb-2">{children}</h3>,
  h4: ({ children }) => <h4 className="text-base sm:text-lg font-semibold text-zinc-200 mt-3 mb-1.5">{children}</h4>,
  h5: ({ children }) => <h5 className="text-sm sm:text-base font-semibold text-zinc-300 mt-3 mb-1">{children}</h5>,
  h6: ({ children }) => <h6 className="text-xs sm:text-sm font-semibold text-zinc-400 mt-2 mb-1">{children}</h6>,
  p: ({ children }) => {
    const childArray = Array.isArray(children) ? children : [children]
    if (childArray.length === 1) {
      const child = childArray[0]
      const href = typeof child === "string" ? child : child?.props?.href
      if (href && typeof href === "string") {
        const ytMatch = href.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/)
        if (ytMatch) {
          return (
            <div className="my-4 aspect-video rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800 shadow-lg">
              <iframe src={`https://www.youtube-nocookie.com/embed/${ytMatch[1]}`} title="YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" />
            </div>
          )
        }
      }
    }
    return <p className="text-sm text-zinc-300 leading-relaxed mb-3">{children}</p>
  },
  a: ({ href, children }) => {
    const ytMatch = href?.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/)
    if (ytMatch) {
      return (
        <div className="my-4 aspect-video rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800 shadow-lg">
          <iframe src={`https://www.youtube-nocookie.com/embed/${ytMatch[1]}`} title="YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" />
        </div>
      )
    }
    return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors">{children}</a>
  },
  strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic text-zinc-300">{children}</em>,
  del: ({ children }) => <del className="text-zinc-500 line-through">{children}</del>,
  blockquote: ({ children }) => <blockquote className="border-l-4 border-indigo-500/50 bg-indigo-500/5 pl-4 py-2 my-3 rounded-r-lg">{children}</blockquote>,
  spoiler: ({ children }) => <SpoilerText>{children}</SpoilerText>,
  spoilerimg: ({ src, alt, width, height }) => <SpoilerImage src={src} alt={alt} width={width} height={height} />,
  details: ({ children }) => <details className="my-3 bg-zinc-800/50 border border-zinc-700 rounded-lg overflow-hidden group">{children}</details>,
  summary: ({ children }) => (
    <summary className="px-4 py-3 text-sm font-medium text-zinc-300 hover:text-white cursor-pointer select-none transition-colors hover:bg-zinc-700/30 flex items-center gap-2">
      <svg className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-90 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
      {children}
    </summary>
  ),
  code: ({ inline, className, children }) => {
    if (inline) return <code className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-pink-400 font-mono">{children}</code>
    return (
      <pre className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 sm:p-4 my-3 overflow-x-auto">
        <code className={`text-xs sm:text-sm text-zinc-300 font-mono ${className || ""}`}>{children}</code>
      </pre>
    )
  },
  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-sm text-zinc-300">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-sm text-zinc-300">{children}</ol>,
  li: ({ children, checked }) => {
    if (checked !== null && checked !== undefined) {
      return (
        <li className="flex items-start gap-2 list-none">
          <input type="checkbox" checked={checked} readOnly className="mt-1 accent-indigo-500 pointer-events-none" />
          <span className={checked ? "text-zinc-500 line-through" : "text-zinc-300"}>{children}</span>
        </li>
      )
    }
    return <li>{children}</li>
  },
  hr: () => <hr className="my-6 border-zinc-700" />,
  img: ({ src, alt, width, height }) => (
    <img
      src={src}
      alt={alt || ""}
      className="max-w-full rounded-lg my-3 border border-zinc-700"
      style={{ width: width ? `min(${width}px, 100%)` : undefined, height: height ? `${height}px` : undefined }}
      loading="lazy"
      onError={(e) => { e.target.onerror = null; e.target.className = "hidden" }}
    />
  ),
  div: ({ align, children }) => {
    const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : ""
    return <div className={alignClass}>{children}</div>
  },
  mention: ({ children }) => <Mention username={children} />,
  center: ({ children }) => <div className="text-center">{children}</div>,
  table: ({ children }) => (
    <div className="overflow-x-auto my-3 -mx-1">
      <table className="w-full text-sm border-collapse border border-zinc-700 rounded-lg overflow-hidden">{children}</table>
    </div>
  ),
  "game-card": ({ slug, variant }) => <GameCard slug={slug} variant={variant} />,
  "game-grid": ({ slugs }) => <GameGrid slugs={slugs} />,
  thead: ({ children }) => <thead className="bg-zinc-800/80">{children}</thead>,
  th: ({ children }) => <th className="px-3 sm:px-4 py-2 text-left text-xs font-semibold text-zinc-300 uppercase tracking-wider border border-zinc-700">{children}</th>,
  td: ({ children }) => <td className="px-3 sm:px-4 py-2 text-sm text-zinc-400 border border-zinc-700">{children}</td>,
  tr: ({ children }) => <tr className="hover:bg-zinc-800/30 transition-colors">{children}</tr>,
}
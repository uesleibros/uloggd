import { defaultSchema } from "rehype-sanitize"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import remarkBreaks from "remark-breaks"
import rehypeSanitize from "rehype-sanitize"
import { SpoilerText } from "./SpoilerText"
import { SpoilerImage } from "./SpoilerImage"
import { Mention } from "./Mention"
import { MarkdownGameCard } from "./MarkdownGameCard"
import { MarkdownGameGrid } from "./MarkdownGameGrid"

export const customSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []), 
    "details", "summary", "iframe", "img", "spoiler", "spoilerimg", 
    "div", "center", "mention", "game-card", "game-grid", "game-grid-auto", "svg", "path", "hr"
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
    hr: [],
    center: [],
    mention: [],
    spoiler: [],
    "game-card": ["slug", "variant"],
    "game-grid": ["slugs"],
    "game-grid-auto": ["slugs"],
    svg: ["className", "class", "fill", "stroke", "viewBox", "strokeWidth", "width", "height"],
    path: ["d", "strokeLinecap", "strokeLinejoin"],
  },
  protocols: {
    ...defaultSchema.protocols,
    src: ["https"],
  },
}

export const remarkPlugins = [remarkGfm, remarkBreaks]
export const rehypePlugins = [rehypeRaw, [rehypeSanitize, customSchema]]

export function createMarkdownComponents(authorRatings = {}) {
  return {
    h1: ({ children }) => <h1 className="text-2xl font-semibold text-white mt-6 mb-4 pb-[0.3em] border-b border-zinc-700 leading-tight">{children}</h1>,
    h2: ({ children }) => <h2 className="text-xl font-semibold text-white mt-6 mb-4 pb-[0.3em] border-b border-zinc-800 leading-tight">{children}</h2>,
    h3: ({ children }) => <h3 className="text-lg font-semibold text-white mt-6 mb-4 leading-snug">{children}</h3>,
    h4: ({ children }) => <h4 className="text-base font-semibold text-zinc-200 mt-6 mb-4 leading-snug">{children}</h4>,
    h5: ({ children }) => <h5 className="text-sm font-semibold text-zinc-300 mt-6 mb-4">{children}</h5>,
    h6: ({ children }) => <h6 className="text-xs font-semibold text-zinc-400 mt-6 mb-4">{children}</h6>,
    p: ({ children, node }) => {
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

      const hasBlock = node?.children?.some(c => 
        c.type === "element" && c.tagName !== "br" && 
        !/^(a|abbr|b|bdo|br|cite|code|em|i|img|kbd|mark|q|s|small|span|strong|sub|sup|u|del|ins|mention|spoiler)$/.test(c.tagName)
      )

      return hasBlock 
        ? <div className="mb-4 leading-relaxed">{children}</div>
        : <p className="mb-4 leading-relaxed">{children}</p>
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
    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
    em: ({ children }) => <em className="italic text-zinc-300">{children}</em>,
    del: ({ children }) => <del className="text-zinc-500 line-through">{children}</del>,
    blockquote: ({ children }) => <blockquote className="border-l-4 border-zinc-600 pl-4 py-0.5 my-4 text-zinc-400 [&>p]:mb-0">{children}</blockquote>,
    spoiler: ({ children }) => <SpoilerText>{children}</SpoilerText>,
    spoilerimg: ({ src, alt, width, height }) => <SpoilerImage src={src} alt={alt} width={width} height={height} />,
    details: ({ children }) => <details className="my-4 bg-zinc-800/50 border border-zinc-700 rounded-lg overflow-hidden group">{children}</details>,
    summary: ({ children }) => (
      <summary className="px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white cursor-pointer select-none transition-colors hover:bg-zinc-700/30 flex items-center gap-2">
        <svg className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-90 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {children}
      </summary>
    ),
    code: ({ inline, className, children }) => {
      if (inline) return <code className="px-[0.4em] py-[0.2em] bg-zinc-800 border border-zinc-700 rounded-md text-[85%] text-pink-400 font-mono">{children}</code>
      return (
        <pre className="bg-zinc-900 border border-zinc-700 rounded-md p-4 my-4 overflow-x-auto">
          <code className={`text-sm text-zinc-300 font-mono leading-snug ${className || ""}`}>{children}</code>
        </pre>
      )
    },
    ul: ({ children }) => <ul className="list-disc pl-[2em] my-4 space-y-0.5 text-zinc-300">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-[2em] my-4 space-y-0.5 text-zinc-300">{children}</ol>,
    li: ({ children, checked }) => {
      if (checked !== null && checked !== undefined) {
        return (
          <li className="flex items-start gap-2 list-none -ml-[2em]">
            <input type="checkbox" checked={checked} readOnly className="mt-1 accent-indigo-500 pointer-events-none" />
            <span className={checked ? "text-zinc-500 line-through" : "text-zinc-300"}>{children}</span>
          </li>
        )
      }
      return <li className="leading-relaxed">{children}</li>
    },
    hr: () => <hr className="my-6 border-zinc-700 border-t-[3px]" />,
    img: ({ src, alt, width, height }) => (
      <img
        src={src}
        alt={alt || ""}
        className="max-w-full rounded-lg my-4 object-contain"
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
    center: ({ children }) => (
      <div className="flex flex-col items-center text-center w-full overflow-hidden">
        {children}
      </div>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto my-4">
        <table className="w-full text-sm border-collapse border border-zinc-700 rounded-lg overflow-hidden">{children}</table>
      </div>
    ),
    "game-card": ({ slug, variant }) => <MarkdownGameCard authorRatings={authorRatings} slug={slug} variant={variant} />,
    "game-grid": ({ slugs }) => <MarkdownGameGrid authorRatings={authorRatings} slugs={slugs} />,
    "game-grid-auto": ({ slugs }) => <MarkdownGameGrid authorRatings={authorRatings} slugs={slugs} autoScroll />,
    thead: ({ children }) => <thead className="bg-zinc-800/80">{children}</thead>,
    th: ({ children }) => <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-300 uppercase tracking-wider border border-zinc-700">{children}</th>,
    td: ({ children }) => <td className="px-3 py-2 text-sm text-zinc-400 border border-zinc-700">{children}</td>,
    tr: ({ children }) => <tr className="hover:bg-zinc-800/30 transition-colors">{children}</tr>,
  }
}
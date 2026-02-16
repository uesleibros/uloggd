import { useMemo, memo } from "react"
import ReactMarkdown from "react-markdown"
import { remarkPlugins, rehypePlugins, markdownComponents } from "./markdownConfig"

export const MarkdownPreview = memo(function MarkdownPreview({ content }) {
  const processedContent = useMemo(() => {
    return content
      .replace(
        /(```[\s\S]*?```|`[^`\n]+`)|\|\|(.+?)\|\|/g,
        (match, code, spoiler) => {
          if (code) return code
          return `<spoiler>${spoiler}</spoiler>`
        }
      )
      .replace(
        /<spoilerimg\s+src="([^"]+)"(?:\s+alt="([^"]*)")?(?:\s+width="([^"]*)")?(?:\s+height="([^"]*)")?\s*\/?>/g,
        (match, src, alt, width, height) => {
          const attrs = [`src="${src}"`]
          if (alt) attrs.push(`alt="${alt}"`)
          if (width) attrs.push(`width="${width}"`)
          if (height) attrs.push(`height="${height}"`)
          return `<spoilerimg ${attrs.join(" ")} />`
        }
      )
      .replace(
        /(```[\s\S]*?```|`[^`\n]+`|\[.*?\]\(.*?\)|https?:\/\/\S+)|(?<![a-zA-Z0-9])@([a-zA-Z0-9_]{2,32})(?![a-zA-Z0-9_])|!game\(([^)\n]+)\)/g,
        (match, skip, username, gameSlug) => {
          if (skip) return skip
          if (username) return `<mention>${username}</mention>`
          if (gameSlug) return `<game-card slug="${gameSlug}"></game-card>`
          return match
        }
      )
  }, [content])

  if (!processedContent.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-600">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p className="text-sm">Nada para visualizar</p>
      </div>
    )
  }

  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={markdownComponents}>
        {processedContent}
      </ReactMarkdown>
    </div>
  )
})
import { useMemo, memo } from "react"
import ReactMarkdown from "react-markdown"
import { remarkPlugins, rehypePlugins, markdownComponents } from "./markdownConfig"

export const MarkdownPreview = memo(function MarkdownPreview({ content }) {
  const processedContent = useMemo(() => {
    return content
      .replace(
        /:::(\w+)\n([\s\S]*?)\n:::/g,
        (match, type, innerContent) => {
          const styles = {
            info: { color: "text-blue-300", border: "border-blue-500/30", bg: "bg-blue-500/10", icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />' },
            warning: { color: "text-amber-300", border: "border-amber-500/30", bg: "bg-amber-500/10", icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />' },
            danger: { color: "text-red-300", border: "border-red-500/30", bg: "bg-red-500/10", icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />' },
            success: { color: "text-emerald-300", border: "border-emerald-500/30", bg: "bg-emerald-500/10", icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />' },
            tip: { color: "text-purple-300", border: "border-purple-500/30", bg: "bg-purple-500/10", icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />' }
          }
          
          const style = styles[type] || styles.info
          
          return `
            <div class="flex gap-3 p-4 my-4 rounded-lg border ${style.border} ${style.bg}">
              <svg class="w-5 h-5 flex-shrink-0 ${style.color}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">${style.icon}</svg>
              <div class="text-sm ${style.color} space-y-1">
                ${innerContent}
              </div>
            </div>
          `
        }
      )
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
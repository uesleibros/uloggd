import { useMemo, memo } from "react"
import ReactMarkdown from "react-markdown"
import { FileText } from "lucide-react"
import { remarkPlugins, rehypePlugins, createMarkdownComponents } from "./markdownConfig"
import { GamesBatchProvider } from "../../../hooks/useGamesBatch"

export const MarkdownPreview = memo(function MarkdownPreview({ content, authorRatings = {} }) {
  const processedContent = useMemo(() => {
    return content
      .replace(
        /<center>([\s\S]*?)(?:<\/center>|(?=<center>)|$)/gi,
        (match, inner) => {
          if (match.endsWith("</center>")) return match
          return `<center>${inner}</center>`
        }
      )
      .replace(
        /:::(\w+)\n([\s\S]*?)\n:::/g,
        (match, type, innerContent) => {
          const styles = {
            note: { 
              color: "text-blue-400", 
              border: "border-blue-500", 
              bg: "bg-blue-500/10", 
              label: "Note",
              icon: '<path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path>' 
            },
            tip: { 
              color: "text-emerald-400", 
              border: "border-emerald-500", 
              bg: "bg-emerald-500/10", 
              label: "Tip",
              icon: '<path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.21c-.04-.292-.216-.615-.55-1.101-.214-.307-.48-.61-.714-.895a6.3 6.3 0 0 1-1.134-2.664C2.5 2.42 4.5 0 8 0c2.25 0 4 1.25 4 3.25a.75.75 0 0 1-1.5 0c0-1.25-1-1.75-2.5-1.75ZM6 13a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5Zm.75 2.5a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z"></path>' 
            },
            important: { 
              color: "text-purple-400", 
              border: "border-purple-500", 
              bg: "bg-purple-500/10", 
              label: "Important",
              icon: '<path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM5 8a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 8Zm2.5-2.25a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75ZM6.5 10.75a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Z"></path>' 
            },
            warning: { 
              color: "text-amber-400", 
              border: "border-amber-500", 
              bg: "bg-amber-500/10", 
              label: "Warning",
              icon: '<path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.978c.579 1.137-.163 2.475-1.542 2.475H1.917C.538 15.5-.204 14.162.375 13.025L6.457 1.047ZM8 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm.75-3V4.5a.75.75 0 0 0-1.5 0V10a.75.75 0 0 0 1.5 0Z"></path>' 
            },
            caution: { 
              color: "text-red-400", 
              border: "border-red-500", 
              bg: "bg-red-500/10", 
              label: "Caution",
              icon: '<path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53L4.47.22Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5H5.31ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path>' 
            }
          }
          
          const typeMap = { info: 'note', danger: 'caution', success: 'tip' }
          const normalizedType = typeMap[type] || type
          const style = styles[normalizedType] || styles.note
          
          return `<div class="my-3 rounded-md border-l-[3px] ${style.border} ${style.bg}"><div class="flex items-center gap-2 px-3 py-1.5 border-b border-white/5 bg-white/5"><svg class="w-4 h-4 flex-shrink-0 ${style.color}" viewBox="0 0 16 16" fill="currentColor">${style.icon}</svg><span class="text-xs font-bold uppercase tracking-wide ${style.color}">${style.label}</span></div><div class="px-3 py-2 text-sm text-zinc-300 leading-relaxed">${innerContent}</div></div>`
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
        /!game:mini\(([^)\n]+)\)/g,
        (match, gameSlug) => `<game-card slug="${gameSlug}" variant="mini"></game-card>`
      )
      .replace(
        /!game:grid-auto\(([^)\n]+)\)/g,
        (match, slugs) => `<game-grid-auto slugs="${slugs}"></game-grid-auto>`
      )
      .replace(
        /!game:grid\(([^)\n]+)\)/g,
        (match, slugs) => `<game-grid slugs="${slugs}"></game-grid>`
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

  const components = useMemo(
    () => createMarkdownComponents(authorRatings),
    [authorRatings]
  )

  if (!processedContent.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-600">
        <FileText className="w-10 h-10" strokeWidth={1} />
        <p className="text-sm">Nada para visualizar</p>
      </div>
    )
  }

  return (
    <GamesBatchProvider>
      <div className="markdown-body">
        <ReactMarkdown 
          remarkPlugins={remarkPlugins} 
          rehypePlugins={rehypePlugins} 
          components={components}
        >
          {processedContent}
        </ReactMarkdown>
      </div>
    </GamesBatchProvider>
  )
})
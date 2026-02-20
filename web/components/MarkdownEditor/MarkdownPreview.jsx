import { useMemo, memo } from "react"
import ReactMarkdown from "react-markdown"
import { FileText } from "lucide-react"
import { remarkPlugins, rehypePlugins, createMarkdownComponents } from "@components/MarkdownEditor/markdownConfig"
import { GamesBatchProvider } from "#hooks/useGamesBatch"

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
        /!game:mini\(([^)\n]+)\)/g,
        (match, slug) => `<game-card slug="${slug}" variant="mini"></game-card>`
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
        /!game\(([^)\n]+)\)/g,
        (match, slug) => `<game-card slug="${slug}"></game-card>`
      )
      .replace(
        /(```[\s\S]*?```|`[^`\n]+`)|\|\|(.+?)\|\|/g,
        (match, code, spoiler) => {
          if (code) return code
          return `<spoiler>${spoiler}</spoiler>`
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
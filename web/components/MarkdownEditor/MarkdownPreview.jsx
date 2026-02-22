import { useMemo, memo } from "react"
import ReactMarkdown from "react-markdown"
import { FileText } from "lucide-react"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import remarkBreaks from "remark-breaks"
import rehypeSanitize from "rehype-sanitize"
import remarkDirective from "remark-directive"
import { remarkAlert } from "./config/remarkAlert"
import { sanitizeSchema } from "./constants"
import { createMarkdownComponents } from "./config/markdownComponents"
import { processContent } from "./utils/processContent"
import { GamesBatchProvider } from "#hooks/useGamesBatch"

const remarkPlugins = [remarkGfm, remarkBreaks, remarkDirective, remarkAlert]
const rehypePlugins = [rehypeRaw, [rehypeSanitize, sanitizeSchema]]

export const MarkdownPreview = memo(function MarkdownPreview({ content, authorRatings = {} }) {
  const processedContent = useMemo(() => processContent(content), [content])
  const components = useMemo(() => createMarkdownComponents(authorRatings), [authorRatings])

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
        <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
          {processedContent}
        </ReactMarkdown>
      </div>
    </GamesBatchProvider>
  )
})

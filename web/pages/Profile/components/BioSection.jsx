import { useState } from "react"
import { FileText, Copy, Check } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { MarkdownPreview } from "@components/MarkdownEditor"

export default function BioSection({ bio, isOwnProfile, onEdit, profileGames = {} }) {
  const { t } = useTranslation("profile")
  const [copied, setCopied] = useState(false)

  if (!bio) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(bio)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-zinc-400" />
            {t("bio.title")}
          </h2>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title={t("bio.copyMarkdown")}
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
      <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-5 sm:p-6">
        <MarkdownPreview content={bio} authorRatings={profileGames} />
      </div>
    </div>
  )

}

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"

export function Keywords({ keywords }) {
  const { t } = useTranslation("game")
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState("")

  if (!keywords?.length) return null

  const INITIAL_SHOW = 10
  const hasMore = keywords.length > INITIAL_SHOW

  const filtered = search.trim()
    ? keywords.filter((k) => k.slug.toLowerCase().includes(search.toLowerCase()))
    : keywords

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-300 tracking-tight">{t("keywords.title")}</h3>
      <div className="flex flex-wrap gap-1.5">
        {keywords.slice(0, INITIAL_SHOW).map((kw) => (
          <span
            key={kw.slug}
            className="px-2.5 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded-full text-xs text-zinc-400"
          >
            {kw.slug}
          </span>
        ))}
        {hasMore && (
          <button
            onClick={() => setShowModal(true)}
            className="px-2.5 py-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 rounded-full transition-colors cursor-pointer"
          >
            +{keywords.length - INITIAL_SHOW}
          </button>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={t("keywords.title")}
        subtitle={String(keywords.length)}
      >
        <div className="px-4 pt-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("keywords.searchPlaceholder")}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
            autoFocus
          />
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {filtered.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {filtered.map((kw) => (
                <span
                  key={kw.slug}
                  className="px-2.5 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded-full text-xs text-zinc-400"
                >
                  {kw.slug}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500 text-center py-8">
              {t("keywords.noResults")}
            </p>
          )}
        </div>
      </Modal>
    </div>
  )
}

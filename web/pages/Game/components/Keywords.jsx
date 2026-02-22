import { useState } from "react"
import { ChevronDown } from "lucide-react"
import Modal from "@components/UI/Modal"

function Keyword({ text }) {
  return (
    <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-800/50 backdrop-blur-sm hover:bg-gray-700/50 border border-zinc-700 hover:border-zinc-600 rounded-full text-sm transition-all duration-200">
      <span className="text-blue-400 text-base">#</span>
      <span className="text-gray-300 hover:text-white">{text}</span>
    </button>
  )
}

function KeywordsModalContent({ keywords }) {
  const [search, setSearch] = useState("")

  const filtered = search.trim()
    ? keywords.filter((k) => k.slug.toLowerCase().includes(search.toLowerCase()))
    : keywords

  return (
    <>
      <div className="px-4 pt-3 flex-shrink-0">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar palavra-chave..."
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
          autoFocus
        />
      </div>
      <div className="p-4 overflow-y-auto flex-1">
        {filtered.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {filtered.map((kw) => (
              <Keyword key={kw.slug} text={kw.slug} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 text-center py-8">
            Nenhuma palavra-chave encontrada
          </p>
        )}
      </div>
    </>
  )
}

export function Keywords({ keywords }) {
  const [showModal, setShowModal] = useState(false)
  if (!keywords?.length) return null

  const INITIAL_SHOW = 10
  const hasMore = keywords.length > INITIAL_SHOW

  return (
    <div className="max-w-sm space-y-3">
      <hr className="my-6 border-zinc-700" />
      <h2 className="text-lg font-semibold text-white mb-3">Palavras-chaves</h2>
      <div className="flex flex-wrap gap-2">
        {keywords.slice(0, INITIAL_SHOW).map((kw) => (
          <Keyword key={kw.slug} text={kw.slug} />
        ))}
        {hasMore && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-700/50 hover:border-blue-600 rounded-full text-sm transition-all duration-200 cursor-pointer"
          >
            <span className="text-blue-400">Ver todas {keywords.length}</span>
            <ChevronDown className="w-4 h-4 text-blue-400" />
          </button>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Palavras-chaves"
        subtitle={String(keywords.length)}
      >
        <KeywordsModalContent keywords={keywords} />
      </Modal>
    </div>
  )
}
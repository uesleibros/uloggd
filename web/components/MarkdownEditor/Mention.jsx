import { useState } from "react"
import { MentionCard } from "@components/MarkdownEditor/MentionCard"

export function Mention({ username }) {
  const [showCard, setShowCard] = useState(false)

  return (
    <>
      <span
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCard(true) }}
        className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded text-sm font-medium transition-colors cursor-pointer no-underline"
      >
        @{username}
      </span>
      {showCard && <MentionCard username={username} onClose={() => setShowCard(false)} />}
    </>
  )
}
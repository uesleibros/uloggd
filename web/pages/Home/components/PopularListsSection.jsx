import { useState, useEffect, useRef } from "react"
import { useTranslation } from "#hooks/useTranslation"
import { ListCard } from "@components/Lists/ListCard"
import DragScrollRow from "@components/UI/DragScrollRow"

function ListCardSkeleton() {
  return (
    <div className="w-64 h-[280px] flex-shrink-0 bg-zinc-800/50 rounded-2xl animate-pulse">
      <div className="h-[200px] flex items-center justify-center">
        <div className="h-[160px] w-[107px] rounded-xl bg-zinc-700/50" />
      </div>
      <div className="px-4 space-y-2">
        <div className="h-4 bg-zinc-700/50 rounded w-3/4" />
        <div className="h-3 bg-zinc-700/50 rounded w-1/2" />
      </div>
    </div>
  )
}

export default function PopularListsSection() {
  const { t } = useTranslation()
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return

    let cancelled = false

    fetch("/api/home/popularLists?limit=10")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setLists(data.lists || [])
          setLoading(false)
          fetchedRef.current = true
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  if (!loading && lists.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">
        {t("home.sections.popularLists")}
      </h2>

      {loading ? (
        <DragScrollRow className="gap-4 pb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <ListCardSkeleton key={i} />
          ))}
        </DragScrollRow>
      ) : (
        <DragScrollRow className="gap-4 pb-2">
          {lists.map((list) => (
            <div key={list.id} className="w-64 flex-shrink-0">
              <ListCard list={list} showOwner />
            </div>
          ))}
        </DragScrollRow>
      )}
    </div>
  )
}

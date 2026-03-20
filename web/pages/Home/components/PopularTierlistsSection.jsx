import { useState, useEffect, useRef } from "react"
import { useTranslation } from "#hooks/useTranslation"
import { TierlistCard } from "@components/Tierlist/TierlistCard"
import DragScrollRow from "@components/UI/DragScrollRow"

function TierlistCardSkeleton() {
  return (
    <div className="w-64 flex-shrink-0 bg-zinc-800/50 rounded-xl animate-pulse">
      <div className="h-24 bg-zinc-700/30" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-zinc-700/50 rounded w-3/4" />
        <div className="h-3 bg-zinc-700/50 rounded w-1/2" />
        <div className="flex justify-between mt-2">
          <div className="h-3 bg-zinc-700/50 rounded w-12" />
          <div className="h-3 bg-zinc-700/50 rounded w-8" />
        </div>
      </div>
    </div>
  )
}

export default function PopularTierlistsSection() {
  const { t } = useTranslation()
  const [tierlists, setTierlists] = useState([])
  const [loading, setLoading] = useState(true)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return

    let cancelled = false

    fetch("/api/home/popularTierlists?limit=10")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setTierlists(data.tierlists || [])
          setLoading(false)
          fetchedRef.current = true
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  if (!loading && tierlists.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">
        {t("home.sections.popularTierlists")}
      </h2>

      {loading ? (
        <DragScrollRow className="gap-4 pb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <TierlistCardSkeleton key={i} />
          ))}
        </DragScrollRow>
      ) : (
        <DragScrollRow className="gap-4 pb-2">
          {tierlists.map((tierlist) => (
            <div key={tierlist.id} className="w-64 flex-shrink-0">
              <TierlistCard tierlist={tierlist} showOwner />
            </div>
          ))}
        </DragScrollRow>
      )}
    </div>
  )
}

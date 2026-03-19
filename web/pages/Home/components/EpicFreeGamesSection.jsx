import { useState, useEffect } from "react"
import { Clock, Gift } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import DragScrollRow from "@components/UI/DragScrollRow"

function CardSkeleton() {
  return (
    <div className="w-48 flex-shrink-0 bg-zinc-800/50 rounded-lg overflow-hidden animate-pulse">
      <div className="h-24 bg-zinc-700/50" />
      <div className="p-2.5 space-y-2">
        <div className="h-3 bg-zinc-700/50 rounded w-3/4" />
        <div className="h-3 bg-zinc-700/50 rounded w-1/2" />
      </div>
    </div>
  )
}

function FreeGameCard({ game, language }) {
  const { t, getLanguageConfig } = useTranslation("home")
  const config = getLanguageConfig(language)

  const isCurrent = game.type === "current"

  const formatPrice = (cents) => {
    if (!cents) return language === "pt" ? "Grátis" : "Free"
    return new Intl.NumberFormat(config.numberLocale, {
      style: "currency",
      currency: game.currencyCode || "USD"
    }).format(cents / 100)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat(config.dateLocale, {
      day: "numeric",
      month: "short"
    }).format(date)
  }

  const getTimeLeft = () => {
    if (!game.endDate) return null
    const now = new Date()
    const end = new Date(game.endDate)
    const hoursLeft = Math.max(0, Math.floor((end - now) / 3600000))

    if (hoursLeft < 24) {
      return t("epic.hoursLeft", { count: hoursLeft })
    }
    const daysLeft = Math.floor(hoursLeft / 24)
    return t("epic.daysLeft", { count: daysLeft })
  }

  return (
    <a
      href={game.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group w-48 flex-shrink-0 bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 rounded-lg overflow-hidden transition-colors"
    >
      <div className="relative h-24 overflow-hidden">
        {game.image ? (
          <img
            src={game.image}
            alt={game.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-zinc-700/50 flex items-center justify-center">
            <Gift className="w-6 h-6 text-zinc-600" />
          </div>
        )}

        {isCurrent ? (
          <div className="absolute top-1.5 left-1.5 bg-emerald-500/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
            {t("epic.freeNow")}
          </div>
        ) : game.startDate && (
          <div className="absolute top-1.5 left-1.5 bg-zinc-900/90 text-zinc-300 text-[10px] font-medium px-1.5 py-0.5 rounded">
            {formatDate(game.startDate)}
          </div>
        )}
      </div>

      <div className="p-2.5">
        <h3 className="text-xs font-medium text-white truncate group-hover:text-indigo-400 transition-colors">
          {game.title}
        </h3>

        <div className="flex items-center gap-1.5 mt-1">
          {game.originalPrice > 0 && (
            <span className="text-[10px] text-zinc-500 line-through">
              {formatPrice(game.originalPrice)}
            </span>
          )}
          <span className="text-xs font-medium text-white">
            {language === "pt" ? "Grátis" : "Free"}
          </span>
        </div>

        {isCurrent && game.endDate && (
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-zinc-500">
            <Clock className="w-3 h-3" />
            <span>{getTimeLeft()}</span>
          </div>
        )}
      </div>
    </a>
  )
}

export default function EpicFreeGamesSection() {
  const { t, language } = useTranslation("home")
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const locale = language === "pt" ? "pt-BR" : "en-US"
  const country = language === "pt" ? "BR" : "US"

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/epicgames/freeGames?locale=${locale}&country=${country}`)
        if (res.ok) {
          setData(await res.json())
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [locale, country])

  if (error || (!loading && !data)) return null

  const hasCurrent = data?.current?.length > 0
  const hasUpcoming = data?.upcoming?.length > 0

  if (!loading && !hasCurrent && !hasUpcoming) {
    return null
  }

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Epic Games</h2>

      {(loading || hasCurrent) && (
        <div>
          <h3 className="text-xs text-zinc-500 uppercase tracking-wide mb-3">
            {t("epic.freeThisWeek")}
          </h3>
          <DragScrollRow className="gap-3 pb-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))
            ) : (
              data.current.map((game) => (
                <FreeGameCard key={game.id} game={game} language={language} />
              ))
            )}
          </DragScrollRow>
        </div>
      )}

      {(loading || hasUpcoming) && (
        <div>
          <h3 className="text-xs text-zinc-500 uppercase tracking-wide mb-3">
            {t("epic.comingSoon")}
          </h3>
          <DragScrollRow className="gap-3 pb-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))
            ) : (
              data.upcoming.map((game) => (
                <FreeGameCard key={game.id} game={game} language={language} />
              ))
            )}
          </DragScrollRow>
        </div>
      )}
    </div>
  )
}

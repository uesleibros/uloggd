import { useState, useEffect } from "react"
import { ExternalLink, Clock, Gift, Calendar } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import DragScrollRow from "@components/UI/DragScrollRow"

function GameCardSkeleton() {
  return (
    <div className="w-52 flex-shrink-0 bg-zinc-800 rounded-xl overflow-hidden animate-pulse">
      <div className="h-28 bg-zinc-700" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-zinc-700 rounded w-3/4" />
        <div className="h-3 bg-zinc-700 rounded w-1/2" />
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
      className={`group w-52 flex-shrink-0 rounded-xl overflow-hidden border transition-all hover:scale-[1.02] hover:shadow-xl ${
        isCurrent 
          ? "bg-gradient-to-b from-zinc-800/90 to-zinc-800/50 border-emerald-500/30 hover:border-emerald-500/50" 
          : "bg-zinc-800/80 border-zinc-700/50 hover:border-zinc-600"
      }`}
    >
      <div className="relative h-28 overflow-hidden">
        {game.image ? (
          <img
            src={game.image}
            alt={game.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
            <Gift className="w-8 h-8 text-zinc-500" />
          </div>
        )}
        
        <div className={`absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1 ${
          isCurrent ? "bg-emerald-500" : "bg-zinc-600"
        }`}>
          {isCurrent ? (
            <>
              <Gift className="w-3 h-3" />
              {t("epic.freeNow")}
            </>
          ) : (
            <>
              <Calendar className="w-3 h-3" />
              {formatDate(game.startDate)}
            </>
          )}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent" />
      </div>

      <div className="p-3">
        <h3 className="text-sm font-medium text-white truncate group-hover:text-emerald-400 transition-colors">
          {game.title}
        </h3>
        
        <div className="flex items-center gap-2 mt-1.5">
          {game.originalPrice > 0 && (
            <span className="text-xs text-zinc-500 line-through">
              {formatPrice(game.originalPrice)}
            </span>
          )}
          <span className={`text-sm font-bold ${isCurrent ? "text-emerald-400" : "text-zinc-400"}`}>
            {language === "pt" ? "Grátis" : "Free"}
          </span>
        </div>

        {isCurrent && game.endDate && (
          <div className="flex items-center gap-1 mt-2 text-[10px] text-zinc-500">
            <Clock className="w-3 h-3" />
            <span>{getTimeLeft()}</span>
          </div>
        )}

        <div className="flex items-center gap-1 mt-2 text-[10px] text-zinc-500">
          <ExternalLink className="w-3 h-3" />
          <span>Epic Games</span>
        </div>
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
      <h2 className="text-xl font-semibold text-white mb-4">Epic Games</h2>
      {(loading || hasCurrent) && (
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
            <Gift className="w-4 h-4 text-emerald-400" />
            {t("epic.freeThisWeek")}
          </h3>
          <DragScrollRow className="gap-3 pb-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <GameCardSkeleton key={i} />
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
          <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            {t("epic.comingSoon")}
          </h3>
          <DragScrollRow className="gap-3 pb-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <GameCardSkeleton key={i} />
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
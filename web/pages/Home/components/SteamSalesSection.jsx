import { useState, useEffect } from "react"
import { Clock } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import DragScrollRow from "@components/UI/DragScrollRow"

function CardSkeleton() {
  return (
    <div className="w-44 flex-shrink-0 bg-zinc-800/50 rounded-lg overflow-hidden animate-pulse">
      <div className="h-20 bg-zinc-700/50" />
      <div className="p-2.5 space-y-2">
        <div className="h-3 bg-zinc-700/50 rounded w-3/4" />
        <div className="h-3 bg-zinc-700/50 rounded w-1/2" />
      </div>
    </div>
  )
}

function SpotlightCard({ spotlight }) {
  return (
    <a
      href={spotlight.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex-shrink-0 w-64 rounded-lg overflow-hidden bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-colors"
    >
      <div className="relative h-32 overflow-hidden">
        <img
          src={spotlight.image}
          alt={spotlight.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 p-3">
          <h3 className="text-sm font-medium text-white line-clamp-1">{spotlight.name}</h3>
        </div>
      </div>
    </a>
  )
}

function DailyDealCard({ game, language }) {
  const { t, getLanguageConfig } = useTranslation("home")
  const config = getLanguageConfig(language)

  const formatPrice = (cents) => {
    if (!cents) return language === "pt" ? "Grátis" : "Free"
    return new Intl.NumberFormat(config.numberLocale, {
      style: "currency",
      currency: game.currency || (language === "pt" ? "BRL" : "USD")
    }).format(cents / 100)
  }

  const timeLeft = game.discountExpiration
    ? Math.max(0, Math.floor((game.discountExpiration * 1000 - Date.now()) / 3600000))
    : null

  return (
    <a
      href={game.steamUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-4 p-4 bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 rounded-lg transition-colors"
    >
      <img
        src={game.image}
        alt={game.name}
        className="w-40 h-20 object-cover rounded flex-shrink-0"
      />
      <div className="flex flex-col justify-center min-w-0">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
          {t("steam.dailyDeal")}
        </span>
        <h3 className="text-sm font-medium text-white truncate group-hover:text-indigo-400 transition-colors">
          {game.name}
        </h3>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-medium px-1.5 py-0.5 rounded">
            -{game.discountPercent}%
          </span>
          <span className="text-xs text-zinc-500 line-through">
            {formatPrice(game.originalPrice)}
          </span>
          <span className="text-sm font-medium text-white">
            {formatPrice(game.finalPrice)}
          </span>
        </div>
        {timeLeft !== null && timeLeft > 0 && (
          <div className="flex items-center gap-1 mt-1.5 text-[11px] text-zinc-500">
            <Clock className="w-3 h-3" />
            <span>{t("steam.hoursLeft", { count: timeLeft })}</span>
          </div>
        )}
      </div>
    </a>
  )
}

function GameCard({ game, language, rank }) {
  const { getLanguageConfig } = useTranslation()
  const config = getLanguageConfig(language)

  const formatPrice = (cents) => {
    if (!cents) return language === "pt" ? "Grátis" : "Free"
    return new Intl.NumberFormat(config.numberLocale, {
      style: "currency",
      currency: game.currency || (language === "pt" ? "BRL" : "USD")
    }).format(cents / 100)
  }

  return (
    <a
      href={game.steamUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group w-44 flex-shrink-0 bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 rounded-lg overflow-hidden transition-colors"
    >
      <div className="relative h-20 overflow-hidden">
        <img
          src={game.image}
          alt={game.name}
          className="w-full h-full object-cover"
        />
        {rank && (
          <div className="absolute top-1.5 left-1.5 bg-zinc-900/90 text-white text-[10px] font-medium w-5 h-5 rounded flex items-center justify-center">
            {rank}
          </div>
        )}
        {game.discounted && (
          <div className="absolute top-1.5 right-1.5 bg-emerald-500/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
            -{game.discountPercent}%
          </div>
        )}
      </div>

      <div className="p-2.5">
        <h3 className="text-xs font-medium text-white truncate group-hover:text-indigo-400 transition-colors">
          {game.name}
        </h3>
        <div className="flex items-center gap-1.5 mt-1">
          {game.discounted ? (
            <>
              <span className="text-[10px] text-zinc-500 line-through">
                {formatPrice(game.originalPrice)}
              </span>
              <span className="text-xs font-medium text-white">
                {formatPrice(game.finalPrice)}
              </span>
            </>
          ) : (
            <span className="text-xs text-zinc-400">
              {formatPrice(game.finalPrice)}
            </span>
          )}
        </div>
      </div>
    </a>
  )
}

export default function SteamSalesSection() {
  const { t, language } = useTranslation("home")
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const steamLang = language === "pt" ? "portuguese" : "english"
  const countryCode = language === "pt" ? "br" : "us"

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/steam/sales?cc=${countryCode}&lang=${steamLang}`)
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
  }, [countryCode, steamLang])

  if (error || (!loading && !data)) return null

  const hasSpotlights = data?.spotlights?.length > 0
  const hasDailyDeal = data?.dailyDeal
  const hasSpecials = data?.specials?.length > 0
  const hasTopSellers = data?.topSellers?.length > 0

  if (!loading && !hasSpotlights && !hasDailyDeal && !hasSpecials && !hasTopSellers) {
    return null
  }

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Steam</h2>

      {(loading || hasSpotlights) && (
        <div>
          <h3 className="text-xs text-zinc-500 uppercase tracking-wide mb-3">
            {t("steam.spotlights")}
          </h3>
          <DragScrollRow className="gap-3 pb-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-64 h-32 flex-shrink-0 bg-zinc-800/50 rounded-lg animate-pulse" />
              ))
            ) : (
              data.spotlights.map((s, i) => (
                <SpotlightCard key={i} spotlight={s} />
              ))
            )}
          </DragScrollRow>
        </div>
      )}

      {(loading || hasDailyDeal) && (
        <div>
          {loading ? (
            <div className="h-24 bg-zinc-800/50 rounded-lg animate-pulse" />
          ) : (
            <DailyDealCard game={data.dailyDeal} language={language} />
          )}
        </div>
      )}

      {(loading || hasSpecials) && (
        <div>
          <h3 className="text-xs text-zinc-500 uppercase tracking-wide mb-3">
            {t("steam.specials")}
          </h3>
          <DragScrollRow className="gap-3 pb-2">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))
            ) : (
              data.specials.map((game) => (
                <GameCard key={game.id} game={game} language={language} />
              ))
            )}
          </DragScrollRow>
        </div>
      )}

      {(loading || hasTopSellers) && (
        <div>
          <h3 className="text-xs text-zinc-500 uppercase tracking-wide mb-3">
            {t("steam.topSellers")}
          </h3>
          <DragScrollRow className="gap-3 pb-2">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))
            ) : (
              data.topSellers.map((game, i) => (
                <GameCard key={game.id} game={game} language={language} rank={i + 1} />
              ))
            )}
          </DragScrollRow>
        </div>
      )}
    </div>
  )
}

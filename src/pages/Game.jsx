import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useParams, Link } from "react-router-dom"
import usePageMeta from "../../hooks/usePageMeta"
import { PlatformList } from "../components/Game/PlatformBadge"
import RatingBadge from "../components/Game/RatingBadge"
import GameCard from "../components/Game/GameCard"
import Lightbox from "../components/UI/Lightbox"
import { formatDateLong } from "../../utils/formatDate"
import DragScrollRow from "../components/UI/DragScrollRow"
import PageBanner from "../components/Layout/PageBanner"
import ReviewButton from "../components/Game/ReviewButton"
import GameReviews from "../components/Game/GameReviews"

function GameSkeleton() {
  return (
    <div>
      <PageBanner height="game" />
      <div className="mx-auto pt-[22vw] sm:pt-[20vw] md:pt-32 pb-16">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          <div className="flex-shrink-0 flex flex-row md:flex-col gap-4 md:gap-0">
            <div className="w-32 h-48 sm:w-48 sm:h-72 md:w-64 md:h-96 rounded-lg bg-zinc-800 animate-pulse flex-shrink-0" />
            <div className="flex-1 md:hidden space-y-3 pt-1">
              <div className="h-7 w-48 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
              <div className="flex gap-4">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="w-11 h-11 rounded-full bg-zinc-800 animate-pulse" />
                    <div className="h-3 w-8 bg-zinc-800 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="hidden md:block flex-shrink-0">
            <div className="mt-6 space-y-3">
              <div className="h-5 w-40 bg-zinc-800 rounded animate-pulse" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="h-10 w-10 bg-zinc-800 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="hidden md:block">
              <div className="h-10 w-80 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse mt-3 mb-6" />
              <div className="flex gap-6 mb-4">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="w-14 h-14 rounded-full bg-zinc-800 animate-pulse" />
                    <div className="h-3 w-10 bg-zinc-800 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-zinc-800/50 border border-zinc-700 animate-pulse mb-6">
              <div className="px-5 py-4 border-b border-zinc-700/50 flex justify-between">
                <div className="h-4 w-32 bg-zinc-700 rounded" />
                <div className="h-6 w-16 bg-zinc-700 rounded-lg" />
              </div>
              <div className="p-5 flex gap-5">
                <div className="h-9 w-36 bg-zinc-700 rounded" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-24 bg-zinc-700 rounded" />
                  <div className="h-3 w-48 bg-zinc-700 rounded" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 h-[72px] animate-pulse" />
              ))}
            </div>

            <div className="h-px bg-zinc-700 my-6" />

            <div className="space-y-3">
              <div className="h-5 w-20 bg-zinc-800 rounded animate-pulse" />
              <div className="space-y-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="h-4 bg-zinc-800 rounded animate-pulse" style={{ width: `${85 - i * 10}%` }} />
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex gap-2">
                  <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse flex-shrink-0" />
                  <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
                </div>
              ))}
            </div>

            <div className="h-px bg-zinc-700 my-6" />

            <div className="space-y-3">
              <div className="h-5 w-36 bg-zinc-800 rounded animate-pulse" />
              <div className="h-3 w-full bg-zinc-800/50 rounded animate-pulse" />
              <div className="space-y-2.5">
                {[75, 90, 100].map((w, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-4 w-10 bg-zinc-800 rounded animate-pulse" />
                    </div>
                    <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-zinc-700 animate-pulse" style={{ width: `${w}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-zinc-700 my-6" />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-44 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-20 bg-zinc-800/50 rounded animate-pulse" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="aspect-video bg-zinc-800 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, children }) {
  if (!children) return null
  return (
    <div className="flex flex-col sm:flex-row gap-0.5 sm:gap-2">
      <span className="text-sm text-zinc-500 sm:w-28 flex-shrink-0">{label}</span>
      <span className="text-sm text-zinc-300">{children}</span>
    </div>
  )
}

function Websites({ websites }) {
  if (!websites?.length) return null

  return (
    <div className="mt-4 space-y-3 max-w-sm">
      <h3 className="text-lg font-semibold text-white">Conexões</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {websites.map((site, i) => (
          <a
            key={i}
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 group"
            title={site.label}
          >
            <img
              src={`https://www.igdb.com/icons/${site.type}.svg`}
              alt={site.label}
              className="w-6 h-6 object-contain flex-shrink-0"
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <span className="text-sm text-zinc-400 group-hover:text-white break-words flex-1">{site.label}</span>
            <svg className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 flex-shrink-0 self-start mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  )
}

function StatCard({ value, label }) {
  if (!value) return null
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-zinc-300 mt-1">{label}</div>
    </div>
  )
}

function AgeRatings({ ratings }) {
  if (!ratings?.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2 max-w-sm">
      {ratings.map((rating, i) => (
        <div key={i} className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 flex flex-col items-center space-y-2">
          <img
            className="w-5 h-5 object-contain select-none"
            src={`https://www.igdb.com/icons/rating_icons/${rating.category}/${rating.category}_${rating.rating}.png`}
            alt={`${rating.category.toUpperCase()} rated ${rating.rating.toUpperCase()}`}
            onError={(e) => { e.target.style.display = 'none' }}
          />
        </div>
      ))}
    </div>
  )
}

function HowLongToBeat({ hltb, loading }) {
  if (loading) {
    return (
      <div>
        <hr className="my-6 border-zinc-700" />
        <h2 className="text-lg font-semibold text-white">Tempo para zerar</h2>
        <p className="text-xs text-zinc-500 mb-4">
          Os tempos exibidos são estimativas baseadas em dados reportados pela comunidade do HowLongToBeat e podem não refletir com precisão a sua experiência.
        </p>
        <div className="space-y-2.5">
          {[75, 90, 100].map((w, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-10 bg-zinc-800 rounded animate-pulse" />
              </div>
              <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-zinc-700 animate-pulse" style={{ width: `${w}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="h-3 w-28 bg-zinc-800 rounded animate-pulse mt-4" />
      </div>
    )
  }

  const bars = hltb ? [
    { label: "História", hours: hltb.times?.main, color: "bg-blue-500", hoverColor: "group-hover:bg-blue-400" },
    { label: "História +", hours: hltb.times?.mainExtra, color: "bg-purple-500", hoverColor: "group-hover:bg-purple-400" },
    { label: "Completista", hours: hltb.times?.completionist, color: "bg-amber-500", hoverColor: "group-hover:bg-amber-400" },
  ].filter(b => b.hours) : []

  if (!bars.length) {
    return (
      <div>
        <hr className="my-6 border-zinc-700" />
        <h2 className="text-lg font-semibold text-white">Tempo para zerar</h2>
        <p className="text-xs text-zinc-500 mb-4">
          Os tempos exibidos são estimativas baseadas em dados reportados pela comunidade do HowLongToBeat e podem não refletir com precisão a sua experiência.
        </p>
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <img className="object-contain h-10 w-10 select-none" src="/problem.png" />
          <p className="text-sm text-zinc-500">Sem dados de tempo disponíveis</p>
        </div>
      </div>
    )
  }

  const max = Math.max(...bars.map(b => b.hours))

  return (
    <div>
      <hr className="my-6 border-zinc-700" />
      <h2 className="text-lg font-semibold text-white">Tempo para zerar</h2>
      <p className="text-xs text-zinc-500 mb-4">
        Os tempos exibidos são estimativas baseadas em dados reportados pela comunidade do HowLongToBeat e podem não refletir com precisão a sua experiência. O tempo real pode variar de acordo com o estilo de jogo, nível de dificuldade e outros fatores individuais.
      </p>
      <div className="space-y-2.5">
        {bars.map(bar => (
          <div key={bar.label} className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-zinc-400">{bar.label}</span>
              <span className="text-sm font-semibold text-white tabular-nums">
                {Math.round(bar.hours)}<span className="text-zinc-500 font-normal text-xs ml-0.5">h</span>
              </span>
            </div>
            <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${bar.color} ${bar.hoverColor} transition-all duration-500`} style={{ width: `${(bar.hours / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <a
        href={`https://howlongtobeat.com/game/${hltb.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 mt-4 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
      >
        via HowLongToBeat
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  )
}

function Keywords({ keywords }) {
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
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
      {showModal && <KeywordsModal keywords={keywords} onClose={() => setShowModal(false)} />}
    </div>
  )
}

function KeywordsModal({ keywords, onClose }) {
  const [search, setSearch] = useState("")

  useEffect(() => {
    const sw = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = "hidden"
    if (sw > 0) document.body.style.paddingRight = `${sw}px`
    return () => { document.body.style.overflow = ""; document.body.style.paddingRight = "" }
  }, [])

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", fn)
    return () => window.removeEventListener("keydown", fn)
  }, [onClose])

  const filtered = search.trim()
    ? keywords.filter(k => k.slug.toLowerCase().includes(search.toLowerCase()))
    : keywords

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h3 className="text-lg font-semibold text-white">
            Palavras-chaves <span className="text-sm text-zinc-500 font-normal ml-2">{keywords.length}</span>
          </h3>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-4 pt-3">
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
              {filtered.map((kw) => <Keyword key={kw.slug} text={kw.slug} />)}
            </div>
          ) : (
            <p className="text-sm text-zinc-500 text-center py-8">Nenhuma palavra-chave encontrada</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

function Keyword({ text }) {
  return (
    <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-800/50 backdrop-blur-sm hover:bg-gray-700/50 border border-zinc-700 hover:border-zinc-600 rounded-full text-sm transition-all duration-200">
      <span className="text-blue-400 text-base">#</span>
      <span className="text-gray-300 hover:text-white">{text}</span>
    </button>
  )
}

function RelatedGamesSection({ game }) {
  const tabs = [
    { key: "dlcs", label: "DLCs", data: game.dlcs },
    { key: "expansions", label: "Expansões", data: game.expansions },
    { key: "standalone", label: "Standalone", data: game.standalone_expansions },
    { key: "remakes", label: "Remakes", data: game.remakes },
    { key: "remasters", label: "Remasters", data: game.remasters },
    { key: "altNames", label: "Nomes Alternativos", data: game.alternative_names },
    { key: "videos", label: "Vídeos", data: game.videos },
    { key: "similar", label: "Similares", data: game.similar_games },
  ].filter(t => t.data?.length > 0)

  const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? null)

  if (!tabs.length) return null

  const current = tabs.find(t => t.key === activeTab) ?? tabs[0]

  return (
    <div className="mt-12 md:mt-16">
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-white">Conteúdo relacionado</h2>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                activeTab === tab.key
                  ? "bg-white text-black"
                  : "bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700/60 border border-zinc-700"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs ${activeTab === tab.key ? "text-zinc-600" : "text-zinc-500"}`}>{tab.data.length}</span>
            </button>
          ))}
        </div>
      </div>
      <hr className="my-4 border-zinc-700" />
      <div>
        {current.key === "altNames" && (
          <div className="flex flex-wrap gap-2">
            {current.data.map((alt, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                <span className="text-sm text-zinc-300">{alt.name}</span>
                {alt.comment && <span className="text-xs text-zinc-500">({alt.comment})</span>}
              </div>
            ))}
          </div>
        )}
        {current.key === "videos" && <VideoGrid videos={current.data} />}
        {current.key !== "altNames" && current.key !== "videos" && (
          <DragScrollRow className="gap-4 pb-2">
            {current.data.map(g => <GameCard key={g.id} game={g} draggable={false} />)}
          </DragScrollRow>
        )}
      </div>
    </div>
  )
}

function VideoGrid({ videos }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? videos : videos.slice(0, 4)

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {visible.map(v => (
          <div key={v.video_id} className="relative z-0 aspect-video rounded-lg overflow-hidden bg-zinc-800">
            <iframe
              src={`https://www.youtube.com/embed/${v.video_id}`}
              title={v.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        ))}
      </div>
      {videos.length > 4 && (
        <button onClick={() => setShowAll(!showAll)} className="mt-3 cursor-pointer text-sm text-zinc-500 hover:text-white transition-colors">
          {showAll ? "Mostrar menos" : `Ver todos (${videos.length})`}
        </button>
      )}
    </>
  )
}

export default function Game() {
  const { slug } = useParams()
  const [game, setGame] = useState(null)
  const [hltb, setHltb] = useState(null)
  const [hltbLoading, setHltbLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [lightboxImages, setLightboxImages] = useState([])
  const [showFullSummary, setShowFullSummary] = useState(false)

  usePageMeta(game ? {
    title: `${game.name} - uloggd`,
    description: game.summary || `Veja informações sobre ${game.name} no uloggd`,
    image: game.cover?.url ? `https:${game.cover.url}` : undefined
  } : undefined)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setHltb(null)
    setHltbLoading(true)

    fetch("/api/igdb?action=game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug })
    })
      .then(res => {
        if (!res.ok) throw new Error("not found")
        return res.json()
      })
      .then(data => {
        setGame(data)
        setLoading(false)

        fetch("/api/hltb/game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            altNames: data.alternative_names?.map(a => a.name) || [],
            year: data.first_release_date ? new Date(data.first_release_date * 1000).getFullYear() : null,
            platforms: data.platforms?.map(p => p.name) || null
          })
        })
          .then(r => r.ok ? r.json() : null)
          .then(h => { setHltb(h); setHltbLoading(false) })
          .catch(() => { setHltb(null); setHltbLoading(false) })
      })
      .catch(() => { setError("Jogo não encontrado"); setLoading(false) })
  }, [slug])

  function openLightbox(images, index) {
    setLightboxImages(images)
    setLightboxIndex(index)
  }

  if (loading) return <GameSkeleton />

  if (error || !game) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <h1 className="text-2xl font-bold text-white">Jogo não encontrado</h1>
        <Link to="/" className="text-sm text-zinc-400 hover:text-white transition-colors">Voltar ao início</Link>
      </div>
    )
  }

  const allMedia = [...(game.screenshots || []), ...(game.artworks || [])]
  const summaryTruncated = game.summary?.length > 500
  const bannerImage = game.screenshots?.length > 0 ? `https:${game.screenshots[0].url}` : null

  return (
    <div>
      <PageBanner image={bannerImage} height="game" />
      <div className="mx-auto pt-[22vw] sm:pt-[20vw] md:pt-32 pb-16">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          <div className="flex-shrink-0">
            <div className="flex flex-row md:flex-col gap-4 md:gap-0">
              {game.cover ? (
                <img src={`https:${game.cover.url}`} alt={game.name} className="w-32 sm:w-48 md:w-64 rounded-lg shadow-2xl bg-zinc-800 select-none flex-shrink-0" />
              ) : (
                <div className="w-32 h-48 sm:w-48 sm:h-72 md:w-64 md:h-96 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                  <span className="text-zinc-500 text-xs sm:text-sm text-center px-2">{game.name}</span>
                </div>
              )}

              <div className="flex-1 md:hidden min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{game.name}</h1>
                {game.first_release_date && (
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1.5">{formatDateLong(game.first_release_date)}</p>
                )}
                <div className="flex gap-4 mt-3">
                  <RatingBadge score={game.total_rating} label="Total" size="sm" />
                  <RatingBadge score={game.aggregated_rating} label="Crítica" size="sm" />
                  <RatingBadge score={game.rating} label="Usuários" size="sm" />
                </div>
              </div>
            </div>

            <div className="mt-4 md:hidden">
              <ReviewButton game={game} />
            </div>

            {game.parent_game && (
              <>
                <Link
                  to={`/game/${game.parent_game.slug}`}
                  className="mt-6 flex items-center gap-3 px-4 py-3 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 group"
                >
                  {game.parent_game.cover ? (
                    <img src={`https:${game.parent_game.cover.url}`} alt={game.parent_game.name} className="w-10 h-14 rounded object-cover bg-zinc-700 flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-14 rounded bg-zinc-700 flex-shrink-0" />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs text-zinc-500 uppercase tracking-wide">Jogo principal</span>
                    <span className="text-sm text-zinc-300 group-hover:text-white transition-colors truncate">{game.parent_game.name}</span>
                  </div>
                  <svg className="w-4 h-4 text-zinc-500 group-hover:text-white ml-auto flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <hr className="my-6 border-zinc-700" />
              </>
            )}

            {game.ageRatings?.length > 0 && (
              <div className="mt-4">
                <h2 className="text-lg font-semibold text-white mb-4">Classificações de Idade</h2>
                <AgeRatings ratings={game.ageRatings} />
              </div>
            )}

            <Websites websites={game.websites} />
            <hr className="my-6 border-zinc-700" />

            {game.platforms?.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">Plataformas</h2>
                <PlatformList
                  platforms={game.platforms}
                  variant="badge"
                  className="max-w-sm"
                  badgeClassName="hover:bg-zinc-700/50 transition-colors"
                />
              </div>
            )}

            <Keywords keywords={game.keywords} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="hidden md:block">
              <h1 className="text-4xl font-bold text-white">{game.name}</h1>
              {game.first_release_date && (
                <p className="text-sm text-zinc-400 mt-2 mb-6">{formatDateLong(game.first_release_date)}</p>
              )}
              <div className="flex gap-6 mb-6">
                <RatingBadge score={game.total_rating} label="Total" />
                <RatingBadge score={game.aggregated_rating} label="Crítica" />
                <RatingBadge score={game.rating} label="Usuários" />
              </div>
            </div>

            <div className="hidden md:block mb-6">
              <ReviewButton game={game} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard value={game.total_rating_count} label="Avaliações" />
              <StatCard value={game.hypes} label="Hype" />
              <StatCard value={game.platforms?.length} label="Plataforma(s)" />
            </div>

            {game.summary && (
              <div>
                <hr className="my-6 border-zinc-700" />
                <h2 className="text-lg font-semibold text-white mb-2">Sobre</h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {summaryTruncated && !showFullSummary ? game.summary.slice(0, 500) + "." : game.summary}
                </p>
                {summaryTruncated && (
                  <button onClick={() => setShowFullSummary(!showFullSummary)} className="text-sm cursor-pointer text-zinc-500 hover:text-white mt-2 transition-colors">
                    {showFullSummary ? "Mostrar menos" : "Ler mais"}
                  </button>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2">
              <InfoRow label="Desenvolvedora">{game.developers?.join(", ")}</InfoRow>
              <InfoRow label="Publicadora">{game.publishers?.join(", ")}</InfoRow>
              <InfoRow label="Gêneros">{game.genres?.map(g => g.name).join(", ")}</InfoRow>
              <InfoRow label="Temas">{game.themes?.map(t => t.name).join(", ")}</InfoRow>
              <InfoRow label="Modos">{game.game_modes?.map(m => m.name).join(", ")}</InfoRow>
              <InfoRow label="Engine">{game.game_engines?.map(e => e.name).join(", ")}</InfoRow>
            </div>

            <HowLongToBeat hltb={hltb} loading={hltbLoading} />

            {allMedia.length > 0 && (
              <div>
                <hr className="my-6 border-zinc-700" />
                <h2 className="text-lg font-semibold text-white mb-4">
                  Capturas de tela/Artes
                  <span className="text-sm text-zinc-500 font-normal ml-2">
                    {allMedia.length} {allMedia.length === 1 ? "imagem" : "imagens"}
                  </span>
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {allMedia.slice(0, 9).map((img, i) => (
                    <img
                      key={img.image_id}
                      src={`https:${img.url}`}
                      alt=""
                      onClick={() => openLightbox(allMedia, i)}
                      className="rounded-lg w-full object-cover aspect-video bg-zinc-800 cursor-pointer hover:brightness-75 transition-all"
                    />
                  ))}
                </div>
                {allMedia.length > 9 && (
                  <button onClick={() => openLightbox(allMedia, 9)} className="mt-3 cursor-pointer text-sm text-zinc-500 hover:text-white transition-colors">
                    Ver todas ({allMedia.length})
                  </button>
                )}
              </div>
            )}

            <hr className="my-6 border-zinc-700" />

            <GameReviews gameId={game.id} />
          </div>
        </div>
        <RelatedGamesSection game={game} />
      </div>

      <Lightbox
        images={lightboxImages}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onPrev={() => setLightboxIndex(i => i > 0 ? i - 1 : lightboxImages.length - 1)}
        onNext={() => setLightboxIndex(i => i < lightboxImages.length - 1 ? i + 1 : 0)}
      />
    </div>
  )

}

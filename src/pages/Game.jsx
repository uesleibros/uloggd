import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useParams, Link } from "react-router-dom"
import usePageMeta from "../../hooks/usePageMeta"
import { PLATFORMS_MAP } from "../../data/platformsMapper.js"
import PacmanLoading from "../components/PacmanLoading"
import RatingBadge from "../components/RatingBadge"
import GameCard from "../components/GameCard"
import Lightbox from "../components/Lightbox"
import { formatDateLong } from "../../utils/formatDate"
import DragScrollRow from "../components/DragScrollRow.jsx"

function InfoRow({ label, children }) {
  if (!children) return null
  return (
    <div className="flex gap-2">
      <span className="text-sm text-zinc-500 w-28 flex-shrink-0">{label}</span>
      <span className="text-sm text-zinc-300">{children}</span>
    </div>
  )
}

function Websites({ websites }) {
  if (!websites || websites.length === 0) return null;

  return (
    <div className="mt-4 space-y-3 max-w-sm">
      <h3 className="text-lg font-semibold text-white">Conexões</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {websites.map((site, index) => (
          <WebsiteLink key={index} site={site} />
        ))}
      </div>
    </div>
  );
}

function WebsiteLink({ site }) {
  return (
    <a
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
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />
      <span className="text-sm text-zinc-400 group-hover:text-white break-words flex-1">
        {site.label}
      </span>
      <svg className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 flex-shrink-0 self-start mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
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
  if (!ratings || ratings.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 max-w-sm">
      {ratings.map((rating, index) => (
        <AgeRatingCard key={index} rating={rating} />
      ))}
    </div>
  );
}

function Keywords({ keywords }) {
  if (!keywords || keywords.length === 0) return null;

  const [showModal, setShowModal] = useState(false);
  const INITIAL_SHOW = 10;
  const hasMore = keywords.length > INITIAL_SHOW;

  return (
    <div className="max-w-sm space-y-3">
      <hr className="my-6 border-zinc-700" />
      <h2 className="text-lg font-semibold text-white mb-3">Palavras-chaves</h2>
      <div className="flex flex-wrap gap-2">
        {keywords.slice(0, INITIAL_SHOW).map((keyword) => (
          <Keyword key={keyword.slug} text={keyword.slug} />
        ))}

        {hasMore && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-700/50 hover:border-blue-600 rounded-full text-sm transition-all duration-200 cursor-pointer"
          >
            <span className="text-blue-400">
              Ver todas {keywords.length}
            </span>
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {showModal && (
        <KeywordsModal keywords={keywords} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

function KeywordsModal({ keywords, onClose }) {
  const [search, setSearch] = useState("")

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  const filtered = search.trim()
    ? keywords.filter(k => k.slug.toLowerCase().includes(search.toLowerCase()))
    : keywords

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h3 className="text-lg font-semibold text-white">
            Palavras-chaves
            <span className="text-sm text-zinc-500 font-normal ml-2">{keywords.length}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
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
              {filtered.map((keyword) => (
                <Keyword key={keyword.slug} text={keyword.slug} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500 text-center py-8">
              Nenhuma palavra-chave encontrada
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

function Keyword({ text }) {
  return (
    <div className="relative inline-block">
      <button 
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-800/50 backdrop-blur-sm hover:bg-gray-700/50 border border border-zinc-700 hover:border-zinc-600 rounded-full text-sm transition-all duration-200"
      >
        <span className="text-blue-400 text-base">#</span>
        <span className="text-gray-300 hover:text-white">{text}</span>
      </button>
    </div>
  );
}

function AgeRatingCard({ rating }) {
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 flex flex-col items-center space-y-2">
      <img 
        className="w-5 h-5 object-contain select-none"
        src={`https://www.igdb.com/icons/rating_icons/${rating.category}/${rating.category}_${rating.rating}.png`}
        alt={`${rating.category.toUpperCase()} rating icon rated ${rating.rating.toUpperCase()}`}
        aria-label={rating.rating.toUpperCase()}
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />
    </div>
  );
}

function RelatedGamesSection({ game }) {
  const tabs = [
    { key: "dlcs",        label: "DLCs",         data: game.dlcs },
    { key: "expansions",  label: "Expansões",    data: game.expansions },
    { key: "standalone",  label: "Standalone",   data: game.standalone_expansions },
    { key: "remakes",     label: "Remakes",      data: game.remakes },
    { key: "remasters",   label: "Remasters",    data: game.remasters },
    { key: "videos",      label: "Vídeos",      data: game.videos },
    { key: "similar",     label: "Similares",    data: game.similar_games },
  ].filter(t => t.data?.length > 0)

  const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? null)

  if (tabs.length === 0) return null

  const current = tabs.find(t => t.key === activeTab) ?? tabs[0]

  return (
    <div className="mt-16">
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-white">Conteúdo relacionado</h2>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                ${activeTab === tab.key
                  ? "bg-white text-black"
                  : "bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700/60 border border-zinc-700"
                }
              `}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs ${activeTab === tab.key ? "text-zinc-600" : "text-zinc-500"}`}>
                {tab.data.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <hr className="my-4 border-zinc-700" />

      <div>
        {current.key === "videos" && <VideoGrid videos={current.data} />}
        {current.key !== "videos" && <GameCardGrid games={current.data} />}
      </div>
    </div>
  )
}

function VideoGrid({ videos }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? videos : videos.slice(0, 4)

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
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
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 cursor-pointer text-sm text-zinc-500 hover:text-white transition-colors"
        >
          {showAll ? "Mostrar menos" : `Ver todos (${videos.length})`}
        </button>
      )}
    </>
  )
}

function GameCardGrid({ games }) {
  return (
    <DragScrollRow className="gap-4 pb-2">
      {games.map(g => (
        <GameCard key={g.id} game={g} draggable={false} />
      ))}
    </DragScrollRow>
  )
}

export default function Game() {
  const { slug } = useParams()
  const [game, setGame] = useState(null)
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

    fetch("/api/igdb/game", {
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
      })
      .catch(() => {
        setError("Jogo não encontrado")
        setLoading(false)
      })
  }, [slug])

  function openLightbox(images, index) {
    setLightboxImages(images)
    setLightboxIndex(index)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <PacmanLoading />
    </div>
  )

  if (error || !game) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <h1 className="text-2xl font-bold text-white">Jogo não encontrado</h1>
        <Link to="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
          Voltar ao início
        </Link>
      </div>
    )
  }

  const allMedia = [...(game.screenshots || []), ...(game.artworks || [])]
  const summaryTruncated = game.summary?.length > 500

  return (
    <div>
      {game.screenshots?.length > 0 && (
        <div className="absolute z-[-1] top-0 left-0 h-[262px] w-full overflow-hidden">
          <img
            src={`https:${game.screenshots[0].url}`}
            alt=""
            className="select-none pointer-events-none absolute z-[-2] inset-0 h-full w-full object-cover"
          />
          <div id="main-gradient" />
          <div id="gradient" />
        </div>
      )}

      <div className="mx-auto pt-32 pb-16">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-shrink-0">
            {game.cover ? (
              <img
                src={`https:${game.cover.url}`}
                alt={game.name}
                className="w-64 rounded-lg shadow-2xl bg-zinc-800 select-none"
              />
            ) : (
              <div className="w-64 h-96 rounded-lg bg-zinc-800 flex items-center justify-center">
                <span className="text-zinc-500">{game.name}</span>
              </div>
            )}

            {game.parent_game && (
              <>
                <Link
                  to={`/game/${game.parent_game.slug}`}
                  className="mt-6 flex items-center gap-3 px-4 py-3 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 group"
                >
                  {game.parent_game.cover ? (
                    <img
                      src={`https:${game.parent_game.cover.url}`}
                      alt={game.parent_game.name}
                      className="w-10 h-14 rounded object-cover bg-zinc-700 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-14 rounded bg-zinc-700 flex-shrink-0" />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs text-zinc-500 uppercase tracking-wide">Jogo principal</span>
                    <span className="text-sm text-zinc-300 group-hover:text-white transition-colors truncate">
                      {game.parent_game.name}
                    </span>
                  </div>
                  <svg
                    className="w-4 h-4 text-zinc-500 group-hover:text-white ml-auto flex-shrink-0 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <hr className="my-6 border-zinc-700" />
              </>
            )}

            {game.ageRatings?.length > 0 && (
              <div className="mt-4 ">
                <h2 className="text-lg font-semibold text-white mb-4">Classificações de Idade</h2>
                <AgeRatings ratings={game.ageRatings} />
              </div>
            )}

            <Websites websites={game.websites} />
            <hr className="my-6 border-zinc-700" />
            {game.platforms?.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">Plataformas</h2>
                <div className="flex flex-wrap max-w-sm gap-2">
                  {game.platforms.map(p => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-700/50 transition-colors bg-zinc-800/50 border border-zinc-700 rounded-lg"
                    >
                      {PLATFORMS_MAP[p.id] && (
                        <img
                          src={`/platforms_out/${PLATFORMS_MAP[p.id]}.png`}
                          alt={p.name}
                          className="w-5 h-5 brightness-0 invert object-contain select-none"
                        />
                      )}
                      <span className="text-sm text-zinc-300">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Keywords keywords={game.keywords} />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-4xl font-bold text-white">{game.name}</h1>

            {game.first_release_date && (
              <p className="text-sm text-zinc-400 mt-2">
                {formatDateLong(game.first_release_date)}
              </p>
            )}

            <div className="flex gap-6 mt-6">
              <RatingBadge score={game.total_rating} label="Total" />
              <RatingBadge score={game.aggregated_rating} label="Crítica" />
              <RatingBadge score={game.rating} label="Usuários" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              <StatCard
                value={game.total_rating_count}
                label="Avaliações"
              />
              <StatCard
                value={game.hypes}
                label="Hype"
              />
              <StatCard
                value={game.platforms?.length}
                label="Plataforma(s)"
              />
            </div>

            {game.summary && (
              <div>
                <hr className="my-6 border-zinc-700" />
                <h2 className="text-lg font-semibold text-white mb-2">Sobre</h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {summaryTruncated && !showFullSummary
                    ? game.summary.slice(0, 500) + "..."
                    : game.summary
                  }
                </p>
                {summaryTruncated && (
                  <button
                    onClick={() => setShowFullSummary(!showFullSummary)}
                    className="text-sm cursor-pointer text-zinc-500 hover:text-white mt-2 transition-colors"
                  >
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
            </div>

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
                  <button
                    onClick={() => openLightbox(allMedia, 9)}
                    className="mt-3 cursor-pointer text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    Ver todas ({allMedia.length})
                  </button>
                )}
              </div>
            )}
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













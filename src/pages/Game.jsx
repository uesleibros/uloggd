import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import usePageMeta from "../../hooks/usePageMeta"
import PacmanLoading from "../components/PacmanLoading"
import RatingBadge from "../components/RatingBadge"
import PlatformIcons from "../components/PlatformIcons"
import GameCard from "../components/GameCard"
import Lightbox from "../components/Lightbox"
import { formatDateLong } from "../../utils/formatDate"

function InfoRow({ label, children }) {
  if (!children) return null
  return (
    <div className="flex gap-2">
      <span className="text-sm text-zinc-500 w-28 flex-shrink-0">{label}</span>
      <span className="text-sm text-zinc-300">{children}</span>
    </div>
  )
}

function GameCardRow({ title, games }) {
  if (!games?.length) return null

  return (
    <div className="mt-12">
      <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {games.map(g => (
          <GameCard key={g.id} game={g} />
        ))}
      </div>
    </div>
  )
}

function Websites({ websites }) {
  if (!websites || websites.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
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
    <div className="bg-zinc-700/50 rounded-lg px-4 py-3 text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-zinc-300 mt-1">{label}</div>
    </div>
  )
}

function VideoSection({ videos }) {
  if (!videos?.length) return null

  return (
    <div className="mt-12">
      <h2 className="text-lg font-semibold text-white mb-4">Vídeos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {videos.slice(0, 4).map(v => (
          <div key={v.video_id} className="relative aspect-video rounded-lg overflow-hidden bg-zinc-800">
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
    </div>
  )
}

function AgeRatings({ ratings }) {
  if (!ratings || ratings.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {ratings.map((rating, index) => (
        <AgeRatingCard key={index} rating={rating} />
      ))}
    </div>
  );
}

function Keywords({ keywords }) {
  if (!keywords || keywords.length === 0) return null;

  const [showAll, setShowAll] = useState(false);
  const INITIAL_SHOW = 10;
  
  const visibleKeywords = showAll ? keywords : keywords.slice(0, INITIAL_SHOW);
  const hasMore = keywords.length > INITIAL_SHOW;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {visibleKeywords.map((keyword) => (
          <Keyword key={keyword.slug} text={keyword.slug} />
        ))}
        
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-700/50 hover:border-blue-600 rounded-full text-sm transition-all duration-200"
          >
            {showAll ? (
              <>
                <span className="text-blue-400">Ver menos</span>
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            ) : (
              <>
                <span className="text-blue-400">
                  Ver mais {keywords.length - INITIAL_SHOW}
                </span>
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function Keyword({ text }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative inline-block">
      <button 
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-700/50 backdrop-blur-sm hover:bg-gray-700/80 border border border-zinc-700 hover:border-zinc-600 rounded-full text-sm transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span className="text-blue-400 text-base">#</span>
        <span className="text-gray-300 hover:text-white">{text}</span>
      </button>
      
      {isHovered && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-xs text-gray-400 rounded whitespace-nowrap pointer-events-none">
          Clique para buscar por "{text}"
        </div>
      )}
    </div>
  );
}

function AgeRatingCard({ rating }) {
  return (
    <div className="bg-zinc-700/50 rounded-lg p-3 flex flex-col items-center space-y-2 hover:bg-zinc-600/50 transition-colors">
      <span className="text-xs text-gray-400 font-medium">
        {rating.region}
      </span>
      <img 
        className="w-10 h-10 object-contain select-none"
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
        console.log(data)
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

      <div className="max-w-5xl mx-auto px-4 pt-32 pb-16">
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
              <Link
                to={`/game/${game.parent_game.slug}`}
                className="text-sm text-zinc-500 hover:text-white transition-colors"
              >
                ← {game.parent_game.name}
              </Link>
            )}

            {game.ageRatings?.length > 0 && (
              <div className="mt-4 ">
                <h2 className="text-lg font-semibold text-white mb-4">Classificações de Idade</h2>
                <AgeRatings ratings={game.ageRatings} />
              </div>
            )}

            <Websites websites={game.websites} />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-4xl font-bold text-white">{game.name}</h1>

            {game.first_release_date && (
              <p className="text-sm text-zinc-400 mt-2">
                {formatDateLong(game.first_release_date)}
              </p>
            )}

            <div className="mt-2">
              <PlatformIcons icons={game.platformIcons} max={10} size="w-5" />
            </div>

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
                value={game.follows}
                label="Seguindo"
              />
              <StatCard
                value={game.hypes}
                label="Hype"
              />
              <StatCard
                value={game.platforms?.length}
                label="Plataformas"
              />
            </div>

            {game.summary && (
              <div className="mt-6">
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

            <Keywords keywords={game.keywords} />
          </div>
        </div>

        {allMedia.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-white mb-4">
              Mídia
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

        <VideoSection videos={game.videos} />

        <GameCardRow title="DLCs" games={game.dlcs} />
        <GameCardRow title="Expansões" games={game.expansions} />
        <GameCardRow title="Expansões standalone" games={game.standalone_expansions} />
        <GameCardRow title="Remakes" games={game.remakes} />
        <GameCardRow title="Remasters" games={game.remasters} />

        {game.similar_games?.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-white mb-4">Jogos similares</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {game.similar_games.map(sg => (
                <GameCard key={sg.id} game={sg} />
              ))}
            </div>
          </div>
        )}
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

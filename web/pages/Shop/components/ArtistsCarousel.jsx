import { useTranslation } from "#hooks/useTranslation"

export default function ArtistsCarousel({ artists }) {
  const { t } = useTranslation("shop")
  const fallbackAvatar = "https://cdn.discordapp.com/embed/avatars/0.png"

  if (!artists || artists.length === 0) return null

  const duplicated = artists.length < 6
    ? [...artists, ...artists, ...artists, ...artists]
    : [...artists, ...artists]

  return (
    <>
      <style>{`
        @keyframes artistsMarquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
      `}</style>

      <div className="mb-8">
        <div className="mb-3">
          <p className="text-xs font-medium text-zinc-400">{t("artists.title")}</p>
          <p className="text-xs text-zinc-600">{t("artists.subtitle")}</p>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/40">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-zinc-950 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-zinc-950 to-transparent z-10" />

          <div
            className="flex w-max gap-3 px-3 py-3"
            style={{ animation: `artistsMarquee ${Math.max(artists.length * 4, 18)}s linear infinite` }}
            onMouseEnter={e => { e.currentTarget.style.animationPlayState = "paused" }}
            onMouseLeave={e => { e.currentTarget.style.animationPlayState = "running" }}
          >
            {duplicated.map((artist, index) => {
              const content = (
                <div className="flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-800/40 px-3 py-2 min-w-[180px] hover:bg-zinc-800/70 transition-colors">
                  <img
                    src={artist.avatar_url || fallbackAvatar}
                    alt={artist.name}
                    className="w-9 h-9 rounded-full object-cover select-none"
                    draggable={false}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{artist.name}</p>
                    <p className="text-[11px] text-zinc-500 truncate">
                      {t("artists.defaultLabel")}
                    </p>
                  </div>
                </div>
              )

              return artist.url ? (
                <a
                  key={`${artist.id}-${index}`}
                  href={artist.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                  aria-label={`${artist.name} - ${t("artists.visit")}`}
                >
                  {content}
                </a>
              ) : (
                <div key={`${artist.id}-${index}`}>{content}</div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
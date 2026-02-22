import { ExternalLink } from "lucide-react"

export function Websites({ websites }) {
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
              onError={(e) => {
                e.target.style.display = "none"
              }}
            />
            <span className="text-sm text-zinc-400 group-hover:text-white break-words flex-1">
              {site.label}
            </span>
            <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 flex-shrink-0 self-start mt-0.5" />
          </a>
        ))}
      </div>
    </div>
  )
}
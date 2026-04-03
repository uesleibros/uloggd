import { ExternalLink } from "lucide-react"

export function Websites({ websites }) {
  if (!websites?.length) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-300 tracking-tight">Links</h3>
      <div className="space-y-1">
        {websites.map((site, i) => (
          <a
            key={i}
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-2.5 py-2 -mx-2.5 rounded-lg hover:bg-zinc-800/60 transition-colors group"
          >
            <img
              src={`https://www.igdb.com/icons/${site.type}.svg`}
              alt=""
              className="w-5 h-5 object-contain flex-shrink-0"
              onError={(e) => { e.target.style.display = "none" }}
            />
            <span className="text-sm text-zinc-400 group-hover:text-white transition-colors truncate flex-1">
              {site.label || "Website"}
            </span>
            <ExternalLink className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 group-hover:text-zinc-400 transition-all flex-shrink-0" />
          </a>
        ))}
      </div>
    </div>
  )
}

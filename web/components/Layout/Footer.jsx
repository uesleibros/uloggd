import { Link } from "react-router-dom"
import { useTranslation } from "#hooks/useTranslation"

const LINKS = {
  sobre: [
    { key: "badges", to: "/about/badges" },
  ],
}

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="mt-20 border-t border-zinc-800/50">
      <div className="mx-auto px-4 py-12" style={{ maxWidth: 1080 }}>
        <div className="flex flex-col md:flex-row md:justify-between gap-8">
          <div className="max-w-xs">
            <Link to="/" className="text-lg font-bold text-white">
              uloggd
            </Link>
            <p className="mt-3 text-sm text-zinc-500 leading-relaxed">
              {t("footer.description")}
            </p>
            <a
              href="https://www.igdb.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              {t("footer.igdb")}
            </a>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              {t("footer.about")}
            </h3>
            <ul className="space-y-2.5">
              {LINKS.sobre.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    {t(`footer.${link.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-zinc-800/50 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="text-xs text-zinc-600">
              {t("footer.rights", { year: new Date().getFullYear() })}
            </p>
            <span className="text-zinc-800">·</span>
            <span className="text-xs text-zinc-700">v1.1.0</span>
          </div>

          <a
            href="https://github.com/uesleibros/uloggd"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-600 hover:text-white transition-colors"
            aria-label="GitHub"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  )
}

import { Link } from "react-router-dom"

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-zinc-800/50">
      <div className="mx-auto px-4 py-8" style={{ maxWidth: 1180 }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-end gap-2">
              <Link to="/" className="text-lg font-bold text-white">
                uloggd
              </Link>
              <span className="text-xs mb-1 text-zinc-600">v1.0.6</span>
            </div>
            <p className="mt-2 text-sm text-zinc-500 max-w-sm">
              Dados de jogos fornecidos por{" "}
              <a
                href="https://www.igdb.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 font-bold hover:text-white transition-colors"
              >
                IGDB
              </a>
            </p>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-zinc-800/50 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} uloggd. Todos os direitos reservados.
          </p>
          <a
            href="https://github.com/uesleibros/uloggd"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-600 hover:text-white transition-colors"
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
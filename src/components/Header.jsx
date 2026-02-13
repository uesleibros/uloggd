import { Link, useNavigate } from "react-router-dom"
import { useEffect, useRef, useState } from "react"

export default function Header() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const timeoutRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://rawg.io/api/games?page_size=20&page=1&key=c542e67aec3a4340908f9de9e86038af&search=${encodeURIComponent(
            query
          )}`
        )
        const data = await res.json()
        setResults(data.results || [])
        setOpen(true)
      } catch (err) {
        console.error(err)
      }
    }, 400)

    return () => clearTimeout(timeoutRef.current)
  }, [query])

  function handleSelect(slug) {
    setQuery("")
    setOpen(false)
    setMobileMenuOpen(false)
    navigate(`/game/${slug}`)
  }

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        
        <div className="flex items-center gap-2">
          <Link to="/" className="text-2xl font-bold text-white hover:text-zinc-300 transition-colors">
            uloggd
          </Link>
        </div>

        <nav className="ml-8 hidden md:flex items-center gap-1 text-sm">
          <Link 
            to="#" 
            className="px-3 py-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
          >
            Games
          </Link>
          <Link 
            to="#" 
            className="px-3 py-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
          >
            Tierlists
          </Link>
        </nav>

        <div className="hidden md:flex relative ml-auto items-center gap-4">
          
          <div className="relative">
            <div className="relative">
              <svg 
                className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${focused ? 'text-zinc-300' : 'text-zinc-500'}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => {
                  setFocused(true)
                  query && setOpen(true)
                }}
                onBlur={() => {
                  setFocused(false)
                  setTimeout(() => setOpen(false), 150)
                }}
                placeholder="Procurar jogos..."
                className={`
                  h-8 w-48 lg:w-64 rounded-md bg-zinc-800/80 pl-9 pr-3 text-sm text-white 
                  placeholder-zinc-500 outline-none border transition-all duration-200
                  ${focused 
                    ? 'border-zinc-600 bg-zinc-800 w-56 lg:w-72' 
                    : 'border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800'
                  }
                `}
              />
            </div>

            {open && results.length > 0 && (
              <ul className="absolute top-full right-0 z-50 mt-1.5 w-72 lg:w-80 max-h-72 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
                {results.map((item) => (
                  <li
                    key={item.id}
                    onMouseDown={() => handleSelect(item.slug)}
                    style={{ borderLeftColor: `#${item.dominant_color}` }}
                    className="border border-l-5 cursor-pointer px-3 py-2.5 border-b border-zinc-800 last:border-0 hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {item.background_image && (
                        <img 
                          src={item.background_image} 
                          alt=""
                          className="h-10 w-8 rounded object-cover bg-zinc-800"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-white truncate">
                          {item.name}
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {item.released}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link 
            to="/login"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Log in
          </Link>
          
          <Link 
            to="/signup"
            className="h-8 px-4 rounded-md bg-zinc-100 text-sm font-medium text-zinc-900 flex items-center hover:bg-white transition-colors"
          >
            Sign up
          </Link>
        </div>

        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
        >
          {mobileMenuOpen ? (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      <div 
        className={`
          md:hidden overflow-hidden transition-all duration-300 ease-out
          ${mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="px-4 py-4 space-y-4">
          
          <div className="relative">
            <svg 
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query && setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder="Procurar jogos..."
              className="h-10 w-full rounded-md bg-zinc-800 pl-10 pr-3 text-sm text-white placeholder-zinc-500 outline-none border border-zinc-700"
            />

            {open && results.length > 0 && (
              <ul className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-64 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
                {results.map((item) => (
                  <li
                    key={item.id}
                    onMouseDown={() => handleSelect(item.slug)}
                    style={{ borderLeftColor: `#${item.dominant_color}` }}
                    className="cursor-pointer px-3 py-2.5 border-b border-zinc-800 last:border-0 hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {item.background_image && (
                        <img 
                          src={item.background_image} 
                          alt=""
                          className="h-10 w-8 rounded object-cover bg-zinc-800"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-white truncate">
                          {item.name}
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {item.released}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <nav className="flex flex-col gap-1">
            <Link 
              to="#" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            >
              Games
            </Link>
            <Link 
              to="#" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            >
              Tierlists
            </Link>
          </nav>

          <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
            <Link 
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Log in
            </Link>
            
            <Link 
              to="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="h-10 rounded-md bg-zinc-100 text-sm font-medium text-zinc-900 flex items-center justify-center hover:bg-white transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
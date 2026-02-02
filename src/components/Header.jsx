import { Link, useNavigate } from "react-router-dom"
import { useEffect, useRef, useState } from "react"

export default function Header() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
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
          `https://backloggd.com/autocomplete.json?filter_editions=true&query=${encodeURIComponent(
            query
          )}`
        )
        const data = await res.json()
        setResults(data.suggestions || [])
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
    navigate(`/game/${slug}`)
  }

  return (
    <header className="sticky top-0 z-50 mb-5 w-full">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4">
        
        {/* Logo */}
        <div className="flex items-center gap-2 text-white font-semibold">
          <Link to="/" className="text-3xl font-bold">
            uloggd
          </Link>
        </div>

        {/* Nav */}
        <nav className="ml-8 hidden md:flex items-center gap-6 text-sm text-zinc-400">
          <Link to="#" className="hover:text-white transition">Games</Link>
          <Link to="#" className="hover:text-white transition">Tierlists</Link>
        </nav>

        {/* Right */}
        <div className="relative ml-auto flex items-center gap-4">
          
          {/* Search */}
          <div className="relative hidden md:block">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query && setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder="Procurar jogos..."
              className="h-8 w-64 rounded-md bg-zinc-900 px-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-700"
            />

            {open && results.length > 0 && (
              <ul className="absolute top-full z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 shadow-lg">
                {results.map((item) => (
                  <li
                    key={item.data.id}
                    onMouseDown={() => handleSelect(item.data.slug)}
                    className="cursor-pointer px-3 py-2 text-sm hover:bg-zinc-800"
                  >
                    <div className="font-medium text-white">
                      {item.data.title}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {item.data.year}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>
    </header>
  )
}

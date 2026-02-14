import { Link, useNavigate } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import PlatformIcons from "./PlatformIcons"
import { formatDateShort } from "../../utils/formatDate"

function SearchIcon({ focused }) {
  return (
    <svg 
      className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${focused ? 'text-zinc-300' : 'text-zinc-500'}`}
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="h-6 w-6 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
    </div>
  )
}

function SearchResultItem({ item, onSelect }) {
  return (
    <li
      onMouseDown={() => onSelect(item.slug)}
      className="cursor-pointer px-3 py-2.5 border-b border-zinc-800 last:border-0 hover:bg-zinc-800 transition-colors"
    >
      <div className="flex items-center gap-3">
        {item.cover ? (
          <img 
            src={`https:${item.cover.url}`} 
            alt=""
            className="h-12 w-9 rounded object-cover bg-zinc-800 flex-shrink-0"
          />
        ) : (
          <div className="h-12 w-9 rounded bg-zinc-800 flex-shrink-0" />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-white truncate">
              {item.name}
            </span>
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            {item.first_release_date && (
              <div className="text-xs text-zinc-500">
                {formatDateShort(item.first_release_date)}
              </div>
            )}
            <PlatformIcons icons={item.platformIcons} />
          </div>
        </div>
      </div>
    </li>
  )
}

function SearchResults({ results, loading, open, onSelect, className = "" }) {
  if (!open) return null
  
  return (
    <ul className={`absolute top-full z-50 mt-1.5 max-h-80 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl ${className}`}>
      {loading ? (
        <LoadingSpinner />
      ) : results.length > 0 ? (
        results.map((item) => (
          <SearchResultItem key={item.id} item={item} onSelect={onSelect} />
        ))
      ) : (
        <li className="px-3 py-4 text-sm text-zinc-500 text-center">
          Nenhum resultado encontrado
        </li>
      )}
    </ul>
  )
}

function SearchInput({ 
  query, 
  onChange, 
  onFocus, 
  onBlur, 
  focused = false,
  variant = "desktop" 
}) {
  const baseClasses = "rounded-md bg-zinc-800 text-sm text-white placeholder-zinc-500 outline-none border"
  
  const variants = {
    desktop: `h-8 w-48 lg:w-64 bg-zinc-800/80 pl-9 pr-3 transition-all duration-200 ${
      focused 
        ? 'border-zinc-600 bg-zinc-800 w-56 lg:w-72' 
        : 'border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800'
    }`,
    mobile: "h-10 w-full pl-10 pr-3 border-zinc-700"
  }

  return (
    <div className="relative">
      <SearchIcon focused={focused} />
      <input
        type="text"
        value={query}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="Procurar jogos..."
        className={`${baseClasses} ${variants[variant]}`}
      />
    </div>
  )
}

function NavLink({ to, onClick, children, className = "" }) {
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={`px-3 py-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all ${className}`}
    >
      {children}
    </Link>
  )
}

function MenuToggle({ isOpen, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
    >
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {isOpen ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        )}
      </svg>
    </button>
  )
}

function AuthButtons({ onNavigate, variant = "desktop" }) {
  const handleClick = () => onNavigate?.()
  
  if (variant === "mobile") {
    return (
      <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
        <Link 
          to="/login"
          onClick={handleClick}
          className="px-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Log in
        </Link>
        <Link 
          to="/signup"
          onClick={handleClick}
          className="h-10 rounded-md bg-zinc-100 text-sm font-medium text-zinc-900 flex items-center justify-center hover:bg-white transition-colors"
        >
          Sign up
        </Link>
      </div>
    )
  }

  return (
    <>
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
    </>
  )
}

const NAV_ITEMS = [
  { to: "#", label: "Games" },
  { to: "#", label: "Tierlists" }
]

export default function Header() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const timeoutRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    setOpen(true)
    clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          "/api/igdb/games",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ query })
          }
        )
        const data = await res.json()
        setResults(data || [])
        setOpen(true)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
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

  function handleFocus(hasQuery) {
    setFocused(true)
    if (hasQuery) setOpen(true)
  }

  function handleBlur() {
    setFocused(false)
    setTimeout(() => setOpen(false), 150)
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false)
  }

  return (
    <header className="w-full">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2">
        <nav className="hidden md:flex ml-auto items-center gap-1 text-sm">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.label} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex relative items-center gap-4">
          <div className="relative">
            <SearchInput
              query={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => handleFocus(!!query)}
              onBlur={handleBlur}
              focused={focused}
              variant="desktop"
            />
            <SearchResults 
              results={results} 
              loading={loading}
              open={open && (loading || results.length > 0 || query.trim())}
              onSelect={handleSelect}
              className="right-0 w-80 lg:w-96"
            />
          </div>
          <AuthButtons />
        </div>

        <MenuToggle 
          isOpen={mobileMenuOpen} 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
        />
      </div>

      <div 
        className={`
          md:hidden transition-all duration-300 ease-out
          ${mobileMenuOpen ? 'max-h-[80vh] opacity-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'}
        `}
      >
        <div className="px-4 py-4 space-y-4">
          <div className="relative">
            <SearchInput
              query={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => handleFocus(!!query)}
              onBlur={handleBlur}
              variant="mobile"
            />
            <SearchResults 
              results={results}
              loading={loading}
              open={open && (loading || results.length > 0 || query.trim())}
              onSelect={handleSelect}
              className="left-0 right-0"
            />
          </div>

          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink 
                key={item.label} 
                to={item.to} 
                onClick={closeMobileMenu}
                className="py-2"
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <AuthButtons variant="mobile" onNavigate={closeMobileMenu} />
        </div>
      </div>
    </header>
  )
}
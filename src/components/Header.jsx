import { Link, useNavigate } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import PlatformIcons from "./PlatformIcons"
import { formatDateShort } from "../../utils/formatDate"
import { supabase } from "../../lib/supabase"

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

function UserDropdown({ user, onSignOut }) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-zinc-800 transition-colors"
      >
        <img
          src={user.avatar || `https://cdn.discordapp.com/embed/avatars/0.png`}
          alt={user.username}
          className="h-7 w-7 rounded-full"
        />
        <span className="text-sm text-white hidden sm:block">{user.username}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-md bg-zinc-900 border border-zinc-700 shadow-lg">
          <div className="py-1">
            <Link
              to="/profile"
              className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
              onClick={() => setOpen(false)}
            >
              Perfil
            </Link>
            <Link
              to="/settings"
              className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
              onClick={() => setOpen(false)}
            >
              Configurações
            </Link>
            <hr className="my-1 border-zinc-700" />
            <button
              onClick={onSignOut}
              className="block w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AuthButtons({ user, onNavigate, variant = "desktop" }) {
  const handleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: window.location.origin
        }
      })
      
      if (error) throw error
    } catch (error) {
      console.error('Error signing in:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      onNavigate?.()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }
  
  if (variant === "mobile") {
    if (user) {
      return (
        <div className="pt-2 border-t border-zinc-800 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <img
              src={user.avatar || `https://cdn.discordapp.com/embed/avatars/0.png`}
              alt={user.username}
              className="h-8 w-8 rounded-full"
            />
            <span className="text-sm text-white">{user.username}</span>
          </div>
          <Link to="/profile" className="block px-3 py-2 text-sm text-zinc-400 hover:text-white">
            Perfil
          </Link>
          <Link to="/settings" className="block px-3 py-2 text-sm text-zinc-400 hover:text-white">
            Configurações
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:text-red-300"
          >
            Sair
          </button>
        </div>
      )
    }

    return (
      <div className="pt-2 border-t border-zinc-800">
        <button 
          onClick={handleSignIn}
          className="h-10 w-full rounded-md bg-indigo-500 text-sm font-medium text-white flex items-center justify-center gap-2 hover:bg-indigo-600 transition-colors"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
          </svg>
          Entrar com Discord
        </button>
      </div>
    )
  }

  if (user) {
    return <UserDropdown user={user} onSignOut={handleSignOut} />
  }

  return (
    <button 
      onClick={handleSignIn}
      className="h-8 px-4 rounded-md bg-indigo-500 hover:bg-indigo-600 text-sm font-medium text-white flex items-center gap-2 transition-colors"
    >
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
      </svg>
      Entrar
    </button>
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
  const [user, setUser] = useState(null)
  const timeoutRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          discordId: session.user.user_metadata.provider_id,
          username: session.user.user_metadata.full_name,
          avatar: session.user.user_metadata.avatar_url,
          email: session.user.email
        })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          discordId: session.user.user_metadata.provider_id,
          username: session.user.user_metadata.full_name,
          avatar: session.user.user_metadata.avatar_url,
          email: session.user.email
        })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

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
          "/api/igdb/autocomplete",
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
        
        <div className="flex items-center gap-2">
          <Link to="/" className="text-2xl font-bold text-white hover:text-zinc-300 transition-colors">
            uloggd
          </Link>
        </div>
        
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
          <AuthButtons user={user} />
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

          <AuthButtons user={user} variant="mobile" onNavigate={closeMobileMenu} />
        </div>
      </div>
    </header>
  )
}

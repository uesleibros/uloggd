import { Link, useNavigate } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import PlatformIcons from "./PlatformIcons"
import { formatDateShort } from "../../utils/formatDate"
import { supabase } from "../../lib/supabase"
import UserDisplay from "./UserDisplay"
import SettingsModal from "./SettingsModal"
import { useAuth } from "../../hooks/useAuth"

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

function DropdownItem({ to, onClick, icon, label, variant = "default" }) {
  const variants = {
    default: "text-zinc-300 hover:text-white hover:bg-zinc-800/80",
    danger: "text-red-400 hover:text-red-300 hover:bg-red-500/10",
  }

  const content = (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer ${variants[variant]}`}>
      <span className="w-5 h-5 flex items-center justify-center text-zinc-500">{icon}</span>
      <span>{label}</span>
    </div>
  )

  if (to) {
    return <Link to={to} onClick={onClick}>{content}</Link>
  }

  return <button onClick={onClick} className="w-full text-left">{content}</button>
}

function UserDropdown({ user, onSignOut }) {
  const [open, setOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open])

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
            open ? "bg-zinc-800 ring-1 ring-zinc-700" : "hover:bg-zinc-800/60"
          }`}
        >
          <UserDisplay user={user} size="sm" showBadges={false} showUsername={false} />
          <span className="text-sm text-white hidden sm:block max-w-[120px] truncate">{user.username}</span>
          <svg
            className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          className={`absolute right-0 mt-2 w-64 rounded-xl bg-zinc-900 border border-zinc-700/80 shadow-2xl shadow-black/40 transition-all duration-200 origin-top-right z-50 ${
            open
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
          }`}
        >
          <div className="p-3 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <UserDisplay user={user} size="md" showBadges={true} showUsername={false} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-white truncate">{user.username}</span>
                  {(user.is_verified || user.is_moderator) && (
                    <div className="flex items-center gap-1">
                      {user.is_verified && (
                        <img src="/badges/verified.png" alt="Verificado" className="w-3.5 h-3.5 select-none" draggable={false} />
                      )}
                      {user.is_moderator && (
                        <img src="/badges/moderator.png" alt="Moderador" className="w-3.5 h-3.5 select-none" draggable={false} />
                      )}
                    </div>
                  )}
                </div>
                <span className="text-xs text-zinc-500 truncate block">{user.email}</span>
              </div>
            </div>
          </div>

          <div className="p-1.5">
            <DropdownItem
              to={`/u/${user.username}`}
              onClick={() => setOpen(false)}
              label="Meu perfil"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              }
            />
            <DropdownItem
              onClick={() => {
                setOpen(false)
                setSettingsOpen(true)
              }}
              label="Configurações"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
          </div>

          <div className="p-1.5 border-t border-zinc-800">
            <DropdownItem
              onClick={() => { setOpen(false); onSignOut() }}
              label="Sair"
              variant="danger"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              }
            />
          </div>
        </div>
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  )
}

function AuthButtons({ user, loading, onNavigate, variant = "desktop" }) {
  const handleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
    } catch (error) {
      console.error("Error signing in:", error)
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      onNavigate?.()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  if (loading) {
    if (variant === "mobile") {
      return (
        <div className="pt-2 border-t border-zinc-800">
          <div className="h-10 w-full rounded-md bg-zinc-800 animate-pulse" />
        </div>
      )
    }
    return <div className="h-8 w-24 rounded-md bg-zinc-800 animate-pulse" />
  }

  if (variant === "mobile") {
    if (user) {
      return (
        <div className="pt-3 border-t border-zinc-800 space-y-1">
          <div className="flex items-center gap-3 px-3 py-3 mb-1 bg-zinc-800/40 rounded-lg">
            <UserDisplay user={user} size="lg" showBadges={true} showUsername={false} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-white truncate">{user.username}</span>
                {(user.is_verified || user.is_moderator) && (
                  <div className="flex items-center gap-1">
                    {user.is_verified && (
                      <img src="/badges/verified.png" alt="Verificado" className="w-3.5 h-3.5 select-none" draggable={false} />
                    )}
                    {user.is_moderator && (
                      <img src="/badges/moderator.png" alt="Moderador" className="w-3.5 h-3.5 select-none" draggable={false} />
                    )}
                  </div>
                )}
              </div>
              <span className="text-xs text-zinc-500 truncate block">{user.email}</span>
            </div>
          </div>

          <DropdownItem
            to={`/u/${user.username}`}
            label="Meu perfil"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            }
          />
          <DropdownItem
            to="/settings"
            label="Configurações"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />

          <div className="pt-1 mt-1 border-t border-zinc-800">
            <DropdownItem
              onClick={handleSignOut}
              label="Sair"
              variant="danger"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              }
            />
          </div>
        </div>
      )
    }

    return (
      <div className="pt-2 border-t border-zinc-800">
        <button
          onClick={handleSignIn}
          className="h-10 w-full rounded-md bg-indigo-500 text-sm font-medium text-white flex items-center justify-center gap-2 hover:bg-indigo-600 transition-colors cursor-pointer"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
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
      className="h-8 cursor-pointer px-4 rounded-md bg-indigo-500 hover:bg-indigo-600 text-sm font-medium text-white flex items-center gap-2 transition-colors"
    >
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
      </svg>
      Entrar
    </button>
  )
}

const NAV_ITEMS = [
  { to: "#", label: "Games" },
  { to: "#", label: "Tierlists" },
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

  const { user, loading: authLoading } = useAuth()

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
        const res = await fetch("/api/igdb/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        })
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
          <AuthButtons user={user} loading={authLoading} />
        </div>

        <MenuToggle isOpen={mobileMenuOpen} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} />
      </div>

      <div
        className={`md:hidden transition-all duration-300 ease-out ${
          mobileMenuOpen ? "max-h-[80vh] opacity-100 overflow-visible" : "max-h-0 opacity-0 overflow-hidden"
        }`}
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
              <NavLink key={item.label} to={item.to} onClick={closeMobileMenu} className="py-2">
                {item.label}
              </NavLink>
            ))}
          </nav>

          <AuthButtons user={user} loading={authLoading} variant="mobile" onNavigate={closeMobileMenu} />
        </div>
      </div>
    </header>
  )
}
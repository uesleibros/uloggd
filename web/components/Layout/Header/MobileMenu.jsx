import { Link } from "react-router-dom"
import { X, Menu } from "lucide-react"
import { SearchBar } from "./SearchBar"
import { AuthButtons } from "./AuthButtons"

export function MenuToggle({ isOpen, onClick }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
    >
      {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
    </button>
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

export function MobileMenu({ isOpen, scrolled, navItems, user, authLoading, onClose }) {
  return (
    <div
      className={`md:hidden overflow-hidden transition-all duration-300 ease-out border-b ${
        isOpen
          ? "max-h-[80vh] opacity-100 border-zinc-800/80"
          : "max-h-0 opacity-0 border-transparent"
      } ${scrolled ? "bg-zinc-900/75 backdrop-blur-xl" : "bg-zinc-900/95 backdrop-blur-xl"}`}
    >
      <div className={`px-4 py-4 space-y-4 mx-auto transition-all duration-300 ${
        isOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      }`} style={{ maxWidth: 1080 }}>
        <SearchBar variant="mobile" onSelect={onClose} />

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink key={item.label} to={item.to} onClick={onClose} className="py-2">
              {item.label}
            </NavLink>
          ))}
        </nav>

        <AuthButtons user={user} loading={authLoading} variant="mobile" onNavigate={onClose} />
      </div>
    </div>
  )
}

export { NavLink }
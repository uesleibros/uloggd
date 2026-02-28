import { Link } from "react-router-dom"
import { X, Menu } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { SearchBar } from "./SearchBar"
import { AuthButtons } from "./AuthButtons"
import { useRef, useEffect, useState } from "react"

export function MenuToggle({ isOpen, onClick }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
    >
      <div className="relative h-6 w-6">
        <X
          className={`h-6 w-6 absolute inset-0 transition-all duration-300 ${
            isOpen
              ? "opacity-100 rotate-0 scale-100"
              : "opacity-0 rotate-90 scale-75"
          }`}
        />
        <Menu
          className={`h-6 w-6 absolute inset-0 transition-all duration-300 ${
            isOpen
              ? "opacity-0 -rotate-90 scale-75"
              : "opacity-100 rotate-0 scale-100"
          }`}
        />
      </div>
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
  const { t } = useTranslation()
  const contentRef = useRef(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (isOpen && contentRef.current) {
      setHeight(contentRef.current.scrollHeight)
    } else {
      setHeight(0)
    }
  }, [isOpen])

  return (
    <div
      className={`md:hidden overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] border-b ${
        isOpen
          ? "opacity-100 border-zinc-800/80"
          : "opacity-0 border-transparent"
      } ${scrolled ? "bg-zinc-900/75 backdrop-blur-xl" : "bg-zinc-900/95 backdrop-blur-xl"}`}
      style={{
        maxHeight: isOpen ? height : 0,
        transitionProperty: "max-height, opacity, border-color",
      }}
    >
      <div
        ref={contentRef}
        className="px-4 py-4 space-y-4 mx-auto"
        style={{ maxWidth: 1080 }}
      >
        <div
          className={`transition-all duration-300 delay-75 ${
            isOpen ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
          }`}
        >
          <SearchBar variant="mobile" onSelect={onClose} placeholder={t("header.search.placeholder")} />
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item, i) => (
            <div
              key={item.label}
              className={`transition-all duration-300 ${
                isOpen ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
              }`}
              style={{ transitionDelay: isOpen ? `${100 + i * 50}ms` : "0ms" }}
            >
              <NavLink to={item.to} onClick={onClose} className="py-2">
                {item.label}
              </NavLink>
            </div>
          ))}
        </nav>

        <div
          className={`transition-all duration-300 ${
            isOpen ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
          }`}
          style={{
            transitionDelay: isOpen ? `${100 + navItems.length * 50 + 50}ms` : "0ms",
          }}
        >
          <AuthButtons user={user} loading={authLoading} variant="mobile" onNavigate={onClose} />
        </div>
      </div>
    </div>
  )
}

export { NavLink }


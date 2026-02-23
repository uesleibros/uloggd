import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "#hooks/useAuth"
import NotificationBell from "@components/User/Notifications/NotificationBell"
import { SearchBar } from "./SearchBar"
import { AuthButtons } from "./AuthButtons"
import { MobileMenu, MenuToggle, NavLink } from "./MobileMenu"

const NAV_ITEMS = []

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 8)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  function closeMobileMenu() {
    setMobileMenuOpen(false)
  }

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-zinc-900/75 backdrop-blur-xl border-b border-zinc-800/80 shadow-lg shadow-black/20"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-14 items-center gap-2 px-4 md:px-16" style={{ maxWidth: 1180 }}>
        <Link to="/" className="text-2xl font-bold text-white hover:text-zinc-300 transition-colors">
          uloggd
        </Link>

        <nav className="hidden md:flex ml-auto items-center gap-1 text-sm">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.label} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex relative items-center gap-2">
          <SearchBar variant="desktop" />
          {user && <NotificationBell />}
          <AuthButtons user={user} loading={authLoading} />
        </div>

        <div className="flex md:hidden items-center gap-1 ml-auto">
          {user && <NotificationBell />}
          <MenuToggle isOpen={mobileMenuOpen} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} />
        </div>
      </div>

      {mobileMenuOpen && (
        <MobileMenu
          isOpen={mobileMenuOpen}
          scrolled={scrolled}
          navItems={NAV_ITEMS}
          user={user}
          authLoading={authLoading}
          onClose={closeMobileMenu}
        />
      )}
    </header>
  )
}
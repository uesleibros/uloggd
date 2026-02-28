import { useState, useRef, useEffect } from "react"
import { useTranslation } from "#hooks/useTranslation"
import { Globe, Check, ChevronDown } from "lucide-react"

export default function LanguageSwitcher({ 
  compact = false, 
  showFlag = true,
  showName = true,
  variant = "dropdown",
  className = "",
}) {
  const { language, setLanguage, languages, languageConfig } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }

    function handleEscape(e) {
      if (e.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  const currentConfig = languageConfig[language]

  if (variant === "buttons") {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {languages.map((lang) => {
          const config = languageConfig[lang]
          const isActive = language === lang

          return (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                isActive
                  ? "bg-white text-black"
                  : "bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700/60 border border-zinc-700"
              }`}
            >
              {showFlag && <span>{config.flag}</span>}
              {showName && !compact && <span>{config.nativeName}</span>}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700 transition-colors cursor-pointer"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {compact ? (
          <span className="text-base">{currentConfig.flag}</span>
        ) : (
          <>
            {showFlag && <span className="text-base">{currentConfig.flag}</span>}
            {!showFlag && <Globe className="w-4 h-4 text-zinc-400" />}
            {showName && <span className="text-sm text-white">{currentConfig.nativeName}</span>}
            <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      {open && (
        <div 
          className="absolute right-0 top-full mt-1.5 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-xl z-50 min-w-[160px] animate-in fade-in slide-in-from-top-2 duration-150"
          role="listbox"
          aria-activedescendant={language}
        >
          {languages.map((lang) => {
            const config = languageConfig[lang]
            const isActive = language === lang

            return (
              <button
                key={lang}
                id={lang}
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  setLanguage(lang)
                  setOpen(false)
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm cursor-pointer transition-colors ${
                  isActive
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                }`}
              >
                <span className="text-base">{config.flag}</span>
                <span className="flex-1">{config.nativeName}</span>
                {isActive && <Check className="w-4 h-4 text-indigo-400" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
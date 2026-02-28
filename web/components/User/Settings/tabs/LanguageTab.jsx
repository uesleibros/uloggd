import { useTranslation } from "#hooks/useTranslation"
import { Check } from "lucide-react"

const LANGUAGES = {
  pt: { name: "Português", nativeName: "Português", flag: "🇧🇷" },
  en: { name: "English", nativeName: "English", flag: "🇺🇸" },
}

export default function LanguageTab() {
  const { language, setLanguage, languages } = useTranslation()

  return (
    <div>
      <h2 className="text-lg font-semibold text-white">Idioma</h2>
      <p className="text-sm text-zinc-500 mt-1 mb-6">Escolha o idioma da interface.</p>

      <div className="space-y-2">
        {languages.map((lang) => {
          const config = LANGUAGES[lang]
          const isActive = language === lang

          return (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                isActive
                  ? "bg-indigo-500/10 border-indigo-500/50"
                  : "bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600"
              }`}
            >
              <span className="text-2xl">{config.flag}</span>
              <div className="flex-1 text-left">
                <p className={`text-sm font-medium ${isActive ? "text-white" : "text-zinc-300"}`}>
                  {config.nativeName}
                </p>
                <p className="text-xs text-zinc-500">{config.name}</p>
              </div>
              {isActive && (
                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
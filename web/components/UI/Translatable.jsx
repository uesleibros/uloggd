import { useState, useEffect } from "react"
import { Languages, Loader2 } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"

export default function Translatable({ children, className = "", truncate = 0 }) {
  const { t, language } = useTranslation()
  const [translated, setTranslated] = useState(null)
  const [showTranslated, setShowTranslated] = useState(false)
  const [detectedLang, setDetectedLang] = useState(null)
  const [translating, setTranslating] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const text = typeof children === "string" ? children : ""

  useEffect(() => {
    setTranslated(null)
    setShowTranslated(false)
    setDetectedLang(null)
  }, [language, text])

  if (!text) return null

  const shouldShowButton = detectedLang !== language
  const isTruncated = truncate > 0 && text.length > truncate
  const displayText = showTranslated && translated ? translated : text
  const visibleText = isTruncated && !expanded ? displayText.slice(0, truncate) + "." : displayText

  async function handleTranslate() {
    if (translated) {
      setShowTranslated(!showTranslated)
      return
    }

    setTranslating(true)

    try {
      const res = await fetch("/api/translate/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, target: language }),
      })

      const data = await res.json()

      if (res.ok) {
        setTranslated(data.translation)
        setDetectedLang(data.detectedLang)
        setShowTranslated(data.detectedLang !== language)
      }
    } catch {}
    finally {
      setTranslating(false)
    }
  }

  return (
    <div>
      <p className={className}>{visibleText}</p>

      <div className="flex items-center gap-3 mt-2 flex-wrap">
        {isTruncated && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            {expanded ? t("translate.showLess") : t("translate.readMore")}
          </button>
        )}

        {shouldShowButton && (
          <button
            onClick={handleTranslate}
            disabled={translating}
            className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium transition-all border cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
              translated
                ? "bg-zinc-700/60 border-zinc-600 text-white"
                : "bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
            }`}
          >
            {translating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Languages className="w-3 h-3 group-hover:rotate-12 transition-transform" />
            )}
            {translating
              ? t("translate.translating")
              : translated
              ? showTranslated
                ? t("translate.showOriginal")
                : t("translate.showTranslation")
              : t("translate.button")}
          </button>
        )}

        {showTranslated && translated && (
          <span className="text-[10px] text-zinc-600">{t("translate.auto")}</span>
        )}
      </div>
    </div>
  )
}

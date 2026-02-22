import { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import twemoji from "@twemoji/api"

export default function TwemojiProvider() {
  const { pathname } = useLocation()
  const parsingRef = useRef(false)

  function parse() {
    if (parsingRef.current) return
    parsingRef.current = true

    try {
      document.querySelectorAll("body > *").forEach(el => {
        if (
          el.classList.contains("cm-editor") ||
          el.querySelector(".cm-editor") ||
          el.closest("[data-no-twemoji]")
        ) return

        twemoji.parse(el, {
          folder: "svg",
          ext: ".svg",
          base: "https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/",
          callback: (icon, options) => `${options.base}${options.size}/${icon}${options.ext}`,
        })
      })
    } catch (err) {
      console.warn("[Twemoji] parse error:", err)
    } finally {
      parsingRef.current = false
    }
  }

  useEffect(() => {
    const id = requestAnimationFrame(parse)
    return () => cancelAnimationFrame(id)
  }, [pathname])

  useEffect(() => {
    let timeout
    const observer = new MutationObserver((mutations) => {
      const shouldSkip = mutations.some(m =>
        m.target.closest?.(".cm-editor") ||
        m.target.closest?.("[data-no-twemoji]") ||
        m.type === "characterData"
      )

      if (shouldSkip) return

      clearTimeout(timeout)
      timeout = setTimeout(parse, 150)
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      observer.disconnect()
      clearTimeout(timeout)
    }
  }, [])

  return null
}

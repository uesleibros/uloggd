import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import twemoji from "@twemoji/api"

export default function TwemojiProvider() {
  const { pathname } = useLocation()

  function parse() {
    twemoji.parse(document.body, {
      folder: "svg",
      ext: ".svg",
      base: "https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/",
      callback: (icon, options) => {
        return `${options.base}${options.size}/${icon}${options.ext}`
      },
    })
  }

  useEffect(() => {
    const id = requestAnimationFrame(parse)
    return () => cancelAnimationFrame(id)
  }, [pathname])

  useEffect(() => {
    let timeout
    const observer = new MutationObserver(() => {
      clearTimeout(timeout)
      timeout = setTimeout(parse, 100)
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
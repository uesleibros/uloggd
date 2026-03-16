import { useEffect } from "react"

const defaults = {
  title: "uloggd - Track, Rate & Share Your Game Collection",
  description: "Track your gaming journey, rate games, write reviews, create lists & tier lists, track playtime with journals, and monitor achievements from Steam, PlayStation & RetroAchievements.",
  image: "/banner.jpg",
}

export default function usePageMeta({ title, description, image } = {}) {
  useEffect(() => {
    const t = title || defaults.title
    const d = description || defaults.description
    const i = image || defaults.image

    document.title = t

    const tags = {
      'meta[name="description"]': d,
      'meta[itemprop="name"]': t,
      'meta[itemprop="description"]': d,
      'meta[itemprop="image"]': i,
      'meta[property="og:title"]': t,
      'meta[property="og:description"]': d,
      'meta[property="og:image"]': i,
      'meta[property="og:image:alt"]': t,
      'meta[name="twitter:title"]': t,
      'meta[name="twitter:description"]': d,
      'meta[name="twitter:image"]': i,
      'meta[name="twitter:image:alt"]': t,
    }

    Object.entries(tags).forEach(([selector, value]) => {
      const el = document.querySelector(selector)
      if (el) {
        if (el.hasAttribute("content")) el.setAttribute("content", value)
      }
    })

    let canonical = document.querySelector('link[rel="canonical"]')
    if (canonical) {
      canonical.setAttribute("href", window.location.href.split("?")[0])
    }

    return () => {
      document.title = defaults.title
      Object.entries(tags).forEach(([selector]) => {
        const el = document.querySelector(selector)
        if (el) {
          const key = selector.includes("image") ? defaults.image
            : selector.includes("description") ? defaults.description
            : defaults.title
          if (el.hasAttribute("content")) el.setAttribute("content", key)
        }
      })
      if (canonical) {
        canonical.setAttribute("href", window.location.origin)
      }
    }
  }, [title, description, image])
}

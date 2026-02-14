import { useEffect } from "react"

const defaults = {
  title: "uloggd - A Video Game Collection Tracker",
  description: "Mantenha uma lista virtual de jogos da sua coleção, depois avalie e comente os que você já jogou para compartilhar com seus amigos!",
  image: "/banner.png"
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
      'meta[name="twitter:title"]': t,
      'meta[name="twitter:description"]': d,
      'meta[name="twitter:image"]': i
    }

    Object.entries(tags).forEach(([selector, value]) => {
      const el = document.querySelector(selector)
      if (el) {
        if (el.hasAttribute("content")) el.setAttribute("content", value)
      }
    })

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
    }
  }, [title, description, image])
}
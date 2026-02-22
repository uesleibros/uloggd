import { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import twemoji from "@twemoji/api"

const TWEMOJI_OPTIONS = {
  folder: "svg",
  ext: ".svg",
  base: "https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/",
  callback: (icon, options) => {
    return `${options.base}${options.size}/${icon}${options.ext}`
  },
}

export default function TwemojiProvider() {
  const { pathname } = useLocation()
  const parsingRef = useRef(false)

  useEffect(() => {
    const parse = () => {
      if (parsingRef.current) return
      parsingRef.current = true

      try {
        document.querySelectorAll("body > *").forEach((el) => {
          if (el.classList.contains("cm-editor") || el.querySelector(".cm-editor")) return

          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
              if (node.parentElement?.closest(".cm-editor")) return NodeFilter.FILTER_REJECT
              if (node.parentElement?.classList?.contains("twemoji")) return NodeFilter.FILTER_REJECT
              if (node.parentElement?.tagName === "SCRIPT") return NodeFilter.FILTER_REJECT
              if (node.parentElement?.tagName === "STYLE") return NodeFilter.FILTER_REJECT
              if (/[\u{1F000}-\u{1FFFF}|\u{2600}-\u{27BF}|\u{FE00}-\u{FEFF}]/u.test(node.textContent)) {
                return NodeFilter.FILTER_ACCEPT
              }
              return NodeFilter.FILTER_REJECT
            },
          })

          const textNodes = []
          while (walker.nextNode()) textNodes.push(walker.currentNode)

          textNodes.forEach((textNode) => {
            if (!textNode.parentElement) return
            const wrapper = document.createElement("span")
            wrapper.className = "twemoji"
            wrapper.textContent = textNode.textContent
            textNode.parentElement.replaceChild(wrapper, textNode)
            twemoji.parse(wrapper, TWEMOJI_OPTIONS)
          })
        })
      } finally {
        parsingRef.current = false
      }
    }

    const id = requestAnimationFrame(parse)
    return () => cancelAnimationFrame(id)
  }, [pathname])

  useEffect(() => {
    let timeout

    const parse = () => {
      if (parsingRef.current) return
      parsingRef.current = true

      try {
        document.querySelectorAll("body > *").forEach((el) => {
          if (el.classList.contains("cm-editor") || el.querySelector(".cm-editor")) return

          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
              if (node.parentElement?.closest(".cm-editor")) return NodeFilter.FILTER_REJECT
              if (node.parentElement?.classList?.contains("twemoji")) return NodeFilter.FILTER_REJECT
              if (node.parentElement?.tagName === "SCRIPT") return NodeFilter.FILTER_REJECT
              if (node.parentElement?.tagName === "STYLE") return NodeFilter.FILTER_REJECT
              if (/[\u{1F000}-\u{1FFFF}|\u{2600}-\u{27BF}|\u{FE00}-\u{FEFF}]/u.test(node.textContent)) {
                return NodeFilter.FILTER_ACCEPT
              }
              return NodeFilter.FILTER_REJECT
            },
          })

          const textNodes = []
          while (walker.nextNode()) textNodes.push(walker.currentNode)

          textNodes.forEach((textNode) => {
            if (!textNode.parentElement) return
            const wrapper = document.createElement("span")
            wrapper.className = "twemoji"
            wrapper.textContent = textNode.textContent
            textNode.parentElement.replaceChild(wrapper, textNode)
            twemoji.parse(wrapper, TWEMOJI_OPTIONS)
          })
        })
      } finally {
        parsingRef.current = false
      }
    }

    const observer = new MutationObserver((mutations) => {
      const relevant = mutations.some((m) => {
        if (m.target.closest?.(".cm-editor")) return false
        if (m.target.closest?.(".twemoji")) return false
        if (m.addedNodes.length === 0) return false
        return Array.from(m.addedNodes).some(
          (n) => n.nodeType === Node.ELEMENT_NODE && !n.classList?.contains("twemoji")
        )
      })

      if (!relevant) return

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

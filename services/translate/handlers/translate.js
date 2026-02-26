import { getCache, setCache } from "#lib/cache.js"

export async function handleTranslate(req, res) {
  const { text, target = "pt" } = req.query

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "missing text" })
  }

  if (text.length > 5000) {
    return res.status(400).json({ error: "text too long" })
  }

  const cacheKey = `translate_${target}_${Buffer.from(text).toString("base64").slice(0, 100)}`
  const cached = await getCache(cacheKey)
  if (cached) return res.json(cached)

  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text)}`
    )

    const data = await response.json()

    if (!Array.isArray(data) || !data[0]) {
      return res.status(500).json({ error: "invalid response" })
    }

    const result = {
      translation: data[0].map(item => item[0]).join(""),
      detectedLang: data[2]
    }

    await setCache(cacheKey, result, 604800)
    res.json(result)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "translation failed" })
  }
}

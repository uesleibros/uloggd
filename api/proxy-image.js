export default async function handler(req, res) {
  const { url } = req.query

  if (!url) {
    return res.status(400).json({ error: "URL required" })
  }

  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch image" })
    }

    const buffer = await response.arrayBuffer()

    res.setHeader("Content-Type", response.headers.get("content-type") || "image/jpeg")
    res.setHeader("Cache-Control", "public, max-age=31536000")
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.send(Buffer.from(buffer))
  } catch (error) {
    console.error("Proxy error:", error)
    res.status(500).json({ error: "Failed to fetch image" })
  }
}

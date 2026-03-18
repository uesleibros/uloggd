export async function handleBlogArticles(req, res) {
  try {
    const response = await fetch("https://dev.to/api/articles/me/published", {
      headers: {
        "api-key": process.env.DEVTO_API_KEY
      }
    })
    const data = await response.json()
    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}

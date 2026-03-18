export async function handleBlogArticles(req, res) {
  try {
    const response = await fetch("https://dev.to/api/articles?username=uloggd")
    const data = await response.json()
    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}

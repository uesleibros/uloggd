import { handleBlogArticles } from "#services/blog/handlers/articles.js"

const ACTIONS = {
	articles: { handler: handleBlogArticles, method: "GET", auth: false }
}

export async function blogHandler(req, res) {
	const entry = ACTIONS[req.action]
	if (!entry) return res.status(404).json({ error: "action not found" })

	if (req.method !== entry.method)
		return res.status(405).end()

	return entry.handler(req, res)
}

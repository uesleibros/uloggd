import {
	searchByUsername,
	resolveStreams,
	formatSearchProfile,
} from "#models/users/index.js"

export async function handleSearch(req, res) {
	const { query, limit = 20, offset = 0, sort = "relevance" } = req.query

	if (!query?.trim()) return res.json({ results: [], total: 0 })

	try {
		const { data, total } = await searchByUsername(query, {
			limit: Number(limit),
			offset: Number(offset),
			sort
		})
		const streamsMap = await resolveStreams(data)

		const results = data.map(u =>
			formatSearchProfile(u, { stream: streamsMap[u.user_id] })
		)

		res.json({ results, total })
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}
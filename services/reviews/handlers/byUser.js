import { supabase } from "#lib/supabase-ssr.js"
import { query } from "#lib/igdbWrapper.js"

export async function handleByUser(req, res) {
	const { userId, sortBy = "recent", page = 1, limit = 20 } = req.query
	if (!userId) return res.status(400).json({ error: "userId required" })

	const pageNum = Number(page)
	const limitNum = Number(limit)
	const offset = (pageNum - 1) * limitNum

	try {
		let q = supabase
			.from("reviews")
			.select("*", { count: "exact" })
			.eq("user_id", userId)
			.range(offset, offset + limitNum - 1)

		if (sortBy === "rating") {
			q = q
				.order("rating", { ascending: false, nullsFirst: false })
				.order("created_at", { ascending: false })
		} else {
			q = q.order("created_at", { ascending: false })
		}

		const { data: reviews, count, error } = await q
		if (error) throw error

		const gameIds = [...new Set((reviews || []).map(r => r.game_id))]
		const journeyIds = [...new Set((reviews || []).map(r => r.journey_id).filter(Boolean))]

		const games = {}
		const journeys = {}

		if (gameIds.length > 0) {
			const gamesData = await query(
				"games",
				`fields id, name, slug, cover.url, cover.image_id; where id = (${gameIds.join(",")}); limit ${gameIds.length};`
			)

			gamesData?.forEach(game => {
				games[game.id] = {
					id: game.id,
					name: game.name,
					slug: game.slug,
					cover: game.cover ? {
						url: game.cover.url?.replace("t_thumb", "t_cover_big"),
						image_id: game.cover.image_id,
					} : null,
				}
			})
		}

		if (journeyIds.length > 0) {
			const { data: journeysData } = await supabase
				.from("journeys")
				.select(`
					id,
					title,
					platform_id,
					created_at,
					journey_entries(id, played_on, hours, minutes)
				`)
				.in("id", journeyIds)

			journeysData?.forEach(journey => {
				const entries = journey.journey_entries || []
				const totalMinutes = entries.reduce((acc, e) => acc + (e.hours || 0) * 60 + (e.minutes || 0), 0)
				const sortedDates = entries.map(e => e.played_on).sort()

				journeys[journey.id] = {
					id: journey.id,
					title: journey.title,
					platform_id: journey.platform_id,
					total_sessions: entries.length,
					total_minutes: totalMinutes,
					first_session: sortedDates[0] || null,
					last_session: sortedDates[sortedDates.length - 1] || null,
				}
			})
		}

		res.json({
			reviews: reviews || [],
			games,
			journeys,
			total: count,
			page: pageNum,
			totalPages: Math.ceil((count || 0) / limitNum),
		})
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}
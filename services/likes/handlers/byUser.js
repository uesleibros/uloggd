import { supabase } from "#lib/supabase-ssr.js"
import { query } from "#lib/igdbWrapper.js"
import { findManyByIdsMinimal, formatMinimalUserMap } from "#models/users/index.js"

export async function handleByUser(req, res) {
	const { userId, type = "games", page = 1, limit = 24 } = req.body
	if (!userId) return res.status(400).json({ error: "userId required" })

	const offset = (page - 1) * limit

	try {
		if (type === "games") {
			const { data: likedGamesData, count } = await supabase
				.from("user_games")
				.select("game_id, game_slug", { count: "exact" })
				.eq("user_id", userId)
				.eq("liked", true)
				.order("updated_at", { ascending: false })
				.range(offset, offset + limit - 1)

			const gameIds = likedGamesData?.map(g => g.game_id) || []
			const gamesMap = {}

			if (gameIds.length > 0) {
				const gamesData = await query(
					"games",
					`fields id, name, slug, cover.url, cover.image_id; where id = (${gameIds.join(",")}); limit ${gameIds.length};`
				)

				gamesData?.forEach(game => {
					gamesMap[game.id] = {
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

			const likedGames = (likedGamesData || [])
				.map(g => gamesMap[g.game_id])
				.filter(Boolean)

			res.json({
				games: likedGames,
				total: count || 0,
				page,
				totalPages: Math.ceil((count || 0) / limit),
			})
		} else if (type === "reviews") {
			const { data: likedReviewsData, count } = await supabase
				.from("review_likes")
				.select("review_id", { count: "exact" })
				.eq("user_id", userId)
				.order("created_at", { ascending: false })
				.range(offset, offset + limit - 1)

			const reviewIds = likedReviewsData?.map(l => l.review_id) || []
			let reviews = []

			if (reviewIds.length > 0) {
				const { data } = await supabase
					.from("reviews")
					.select("*")
					.in("id", reviewIds)
				reviews = data || []
			}

			const gameIds = [...new Set(reviews?.map(r => r.game_id) || [])]
			const gamesMap = {}

			if (gameIds.length > 0) {
				const gamesData = await query(
					"games",
					`fields id, name, slug, cover.url, cover.image_id; where id = (${gameIds.join(",")}); limit ${gameIds.length};`
				)

				gamesData?.forEach(game => {
					gamesMap[game.id] = {
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

			const userIds = [...new Set(reviews?.map(r => r.user_id) || [])]
			let users = {}

			if (userIds.length > 0) {
				const profiles = await findManyByIdsMinimal(userIds)
				users = formatMinimalUserMap(profiles)
			}

			res.json({
				reviews,
				games: gamesMap,
				users,
				total: count || 0,
				page,
				totalPages: Math.ceil((count || 0) / limit),
			})
		} else {
			res.status(400).json({ error: "invalid type" })
		}
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}
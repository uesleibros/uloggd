import { supabase } from "#lib/supabase-ssr.js"
import { query } from "#lib/igdbWrapper.js"
import { DEFAULT_AVATAR_URL } from "#services/users/constants.js"

export async function handleByUser(req, res) {
	const { userId } = req.body
	if (!userId) return res.status(400).json({ error: "userId required" })

	try {
		const { data: likedGamesData } = await supabase
			.from("user_games")
			.select("game_id, game_slug")
			.eq("user_id", userId)
			.eq("liked", true)

		const { data: likedReviewsData } = await supabase
			.from("review_likes")
			.select("review_id")
			.eq("user_id", userId)
			.order("created_at", { ascending: false })

		const reviewIds = likedReviewsData?.map(l => l.review_id) || []
		let reviews = []
		if (reviewIds.length > 0) {
			const { data } = await supabase
				.from("reviews")
				.select("*")
				.in("id", reviewIds)
			reviews = data || []
		}

		const gameIds = [
			...new Set([
				...(likedGamesData?.map(g => g.game_id) || []),
				...(reviews?.map(r => r.game_id) || []),
			])
		]

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

		const userIds = [...new Set(reviews?.map(r => r.user_id) || [])]
		const users = {}
		if (userIds.length > 0) {
			const { data: usersData } = await supabase
				.from("users")
				.select("user_id, username, avatar, avatar_decoration")
				.in("user_id", userIds)

			usersData?.forEach(u => {
				users[u.user_id] = {
					username: u.username,
					avatar: u.avatar || DEFAULT_AVATAR_URL,
					avatar_decoration: u.avatar_decoration,
				}
			})
		}

		res.json({
			likedGames,
			likedReviews: reviews,
			games: gamesMap,
			users,
		})
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}
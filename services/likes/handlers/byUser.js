import { supabase } from "#lib/supabase-ssr.js"
import { query } from "#lib/igdbWrapper.js"
import { findManyByIdsMinimal, formatMinimalUserMap } from "#models/users/index.js"

export async function handleByUser(req, res) {
	const { userId, type = "games", page = 1, limit = 24 } = req.query
	if (!userId) return res.status(400).json({ error: "userId required" })

	const pageNum = Number(page)
	const limitNum = Number(limit)
	const offset = (pageNum - 1) * limitNum

	try {
		if (type === "games") {
			const { data: likedGamesData, count } = await supabase
				.from("user_games")
				.select("game_id, game_slug", { count: "exact" })
				.eq("user_id", userId)
				.eq("liked", true)
				.order("updated_at", { ascending: false })
				.range(offset, offset + limitNum - 1)

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

			return res.json({
				games: likedGames,
				total: count || 0,
				page: pageNum,
				totalPages: Math.ceil((count || 0) / limitNum),
			})
		}

		if (type === "reviews") {
			const { data: likedReviewsData, count } = await supabase
				.from("review_likes")
				.select("review_id", { count: "exact" })
				.eq("user_id", userId)
				.order("created_at", { ascending: false })
				.range(offset, offset + limitNum - 1)

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

			return res.json({
				reviews,
				games: gamesMap,
				users,
				total: count || 0,
				page: pageNum,
				totalPages: Math.ceil((count || 0) / limitNum),
			})
		}

		if (type === "lists") {
			const { data: likedListsData, count } = await supabase
				.from("list_likes")
				.select("list_id", { count: "exact" })
				.eq("user_id", userId)
				.order("created_at", { ascending: false })
				.range(offset, offset + limitNum - 1)

			const listIds = likedListsData?.map(l => l.list_id) || []
			let lists = []

			if (listIds.length > 0) {
				const { data } = await supabase
					.from("lists")
					.select("id, user_id, title, description, is_public, ranked, created_at, updated_at")
					.in("id", listIds)
					.eq("is_public", true)

				lists = data || []
			}

			const listIdsFound = lists.map(l => l.id)

			const { data: itemsData } = await supabase
				.from("list_items")
				.select("list_id, game_slug, position")
				.in("list_id", listIdsFound)
				.order("position", { ascending: true })

			const itemsByList = {}
			itemsData?.forEach(item => {
				if (!itemsByList[item.list_id]) itemsByList[item.list_id] = []
				if (itemsByList[item.list_id].length < 5) {
					itemsByList[item.list_id].push(item.game_slug)
				}
			})

			const { data: countsData } = await supabase
				.from("list_items")
				.select("list_id")
				.in("list_id", listIdsFound)

			const countsByList = {}
			countsData?.forEach(item => {
				countsByList[item.list_id] = (countsByList[item.list_id] || 0) + 1
			})

			const ownerIds = [...new Set(lists.map(l => l.user_id))]
			let owners = {}

			if (ownerIds.length > 0) {
				const profiles = await findManyByIdsMinimal(ownerIds)
				owners = formatMinimalUserMap(profiles)
			}

			const formattedLists = lists.map(list => ({
				...list,
				game_slugs: itemsByList[list.id] || [],
				games_count: countsByList[list.id] || 0,
				owner: owners[list.user_id] || null,
			}))

			return res.json({
				lists: formattedLists,
				total: count || 0,
				page: pageNum,
				totalPages: Math.ceil((count || 0) / limitNum),
			})
		}

		if (type === "tierlists") {
			const { data: likedTierlistsData, count } = await supabase
				.from("tierlist_likes")
				.select("tierlist_id", { count: "exact" })
				.eq("user_id", userId)
				.order("created_at", { ascending: false })
				.range(offset, offset + limitNum - 1)

			const tierlistIds = likedTierlistsData?.map(l => l.tierlist_id) || []
			let tierlists = []

			if (tierlistIds.length > 0) {
				const { data } = await supabase
					.from("tierlists")
					.select("id, user_id, title, description, is_public, created_at, updated_at")
					.in("id", tierlistIds)
					.eq("is_public", true)

				tierlists = data || []
			}

			const tierlistIdsFound = tierlists.map(t => t.id)

			const { data: tiersData } = await supabase
				.from("tierlist_tiers")
				.select("id, tierlist_id, label, color, position")
				.in("tierlist_id", tierlistIdsFound)
				.order("position", { ascending: true })

			const tierIds = tiersData?.map(t => t.id) || []

			const { data: itemsData } = await supabase
				.from("tierlist_items")
				.select("id, tier_id, game_slug, position")
				.in("tier_id", tierIds)
				.order("position", { ascending: true })

			const itemsByTier = {}
			itemsData?.forEach(item => {
				if (!itemsByTier[item.tier_id]) itemsByTier[item.tier_id] = []
				if (itemsByTier[item.tier_id].length < 6) {
					itemsByTier[item.tier_id].push(item)
				}
			})

			const tiersByTierlist = {}
			const countsByTierlist = {}

			tiersData?.forEach(tier => {
				if (!tiersByTierlist[tier.tierlist_id]) tiersByTierlist[tier.tierlist_id] = []
				tiersByTierlist[tier.tierlist_id].push({
					id: tier.id,
					label: tier.label,
					color: tier.color,
					position: tier.position,
					items: itemsByTier[tier.id] || []
				})
			})

			itemsData?.forEach(item => {
				const tier = tiersData?.find(t => t.id === item.tier_id)
				if (tier) {
					countsByTierlist[tier.tierlist_id] = (countsByTierlist[tier.tierlist_id] || 0) + 1
				}
			})

			const ownerIds = [...new Set(tierlists.map(t => t.user_id))]
			let owners = {}

			if (ownerIds.length > 0) {
				const profiles = await findManyByIdsMinimal(ownerIds)
				owners = formatMinimalUserMap(profiles)
			}

			const formattedTierlists = tierlists.map(tierlist => ({
				...tierlist,
				tiers_preview: tiersByTierlist[tierlist.id] || [],
				games_count: countsByTierlist[tierlist.id] || 0,
				owner: owners[tierlist.user_id] || null,
			}))

			return res.json({
				tierlists: formattedTierlists,
				total: count || 0,
				page: pageNum,
				totalPages: Math.ceil((count || 0) / limitNum),
			})
		}

		res.status(400).json({ error: "invalid type" })
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}
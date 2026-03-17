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
						cover:
							game.cover && typeof game.cover.url === "string"
								? {
										url: game.cover.url.replace("t_thumb", "t_cover_big"),
										image_id: game.cover.image_id,
								  }
								: null,
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

			const gameIds = [...new Set(reviews.map(r => r.game_id))]
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
						cover:
							game.cover && typeof game.cover.url === "string"
								? {
										url: game.cover.url.replace("t_thumb", "t_cover_big"),
										image_id: game.cover.image_id,
								  }
								: null,
					}
				})
			}

			const userIds = [...new Set(reviews.map(r => r.user_id))]
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

			if (listIds.length === 0) {
				return res.json({
					lists: [],
					total: count || 0,
					page: pageNum,
					totalPages: Math.ceil((count || 0) / limitNum),
				})
			}

			const { data } = await supabase
				.from("lists")
				.select("id, user_id, title, description, is_public, ranked, created_at, updated_at")
				.in("id", listIds)
				.eq("is_public", true)

			const lists = data || []
			const listIdsFound = lists.map(l => String(l.id))

			let itemsByList = {}
			let countsByList = {}

			if (listIdsFound.length > 0) {
				const { data: itemsData } = await supabase
					.from("list_items")
					.select("list_id, game_slug, position")
					.in("list_id", listIdsFound)
					.order("position", { ascending: true })

				itemsData?.forEach(item => {
					const lid = String(item.list_id)
					if (!itemsByList[lid]) itemsByList[lid] = []
					if (itemsByList[lid].length < 5) {
						itemsByList[lid].push(item.game_slug)
					}
				})

				const { data: countsData } = await supabase
					.from("list_items")
					.select("list_id")
					.in("list_id", listIdsFound)

				countsData?.forEach(item => {
					const lid = String(item.list_id)
					countsByList[lid] = (countsByList[lid] || 0) + 1
				})
			}

			const ownerIds = [...new Set(lists.map(l => l.user_id))]
			let owners = {}

			if (ownerIds.length > 0) {
				const profiles = await findManyByIdsMinimal(ownerIds)
				owners = formatMinimalUserMap(profiles)
			}

			const formattedLists = lists.map(list => {
				const lid = String(list.id)
				return {
					...list,
					id: lid,
					game_slugs: itemsByList[lid] || [],
					games_count: countsByList[lid] || 0,
					owner: owners[list.user_id] || null,
				}
			})

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

			if (tierlistIds.length === 0) {
				return res.json({
					tierlists: [],
					total: count || 0,
					page: pageNum,
					totalPages: Math.ceil((count || 0) / limitNum),
				})
			}

			const { data } = await supabase
				.from("tierlists")
				.select("id, user_id, title, description, is_public, created_at, updated_at")
				.in("id", tierlistIds)
				.eq("is_public", true)

			const tierlists = data || []
			const tierlistIdsFound = tierlists.map(t => String(t.id))

			let tiersByTierlist = {}
			let countsByTierlist = {}

			if (tierlistIdsFound.length > 0) {
				const { data: tiersData } = await supabase
					.from("tierlist_tiers")
					.select("id, tierlist_id, label, color, position")
					.in("tierlist_id", tierlistIdsFound)
					.order("position", { ascending: true })

				const tierIds = tiersData?.map(t => String(t.id)) || []

				let itemsByTier = {}

				if (tierIds.length > 0) {
					const { data: itemsData } = await supabase
						.from("tierlist_items")
						.select("id, tier_id, game_slug, position")
						.in("tier_id", tierIds)
						.order("position", { ascending: true })

					itemsData?.forEach(item => {
						const tid = String(item.tier_id)
						if (!itemsByTier[tid]) itemsByTier[tid] = []
						if (itemsByTier[tid].length < 6) {
							itemsByTier[tid].push(item)
						}
					})

					itemsData?.forEach(item => {
						const tier = tiersData?.find(t => String(t.id) === String(item.tier_id))
						if (tier) {
							const tlid = String(tier.tierlist_id)
							countsByTierlist[tlid] = (countsByTierlist[tlid] || 0) + 1
						}
					})
				}

				tiersData?.forEach(tier => {
					const tlid = String(tier.tierlist_id)
					const tid = String(tier.id)
					if (!tiersByTierlist[tlid]) tiersByTierlist[tlid] = []
					tiersByTierlist[tlid].push({
						id: tid,
						label: tier.label,
						color: tier.color,
						position: tier.position,
						items: itemsByTier[tid] || []
					})
				})
			}

			const ownerIds = [...new Set(tierlists.map(t => t.user_id))]
			let owners = {}

			if (ownerIds.length > 0) {
				const profiles = await findManyByIdsMinimal(ownerIds)
				owners = formatMinimalUserMap(profiles)
			}

			const formattedTierlists = tierlists.map(tierlist => {
				const tlid = String(tierlist.id)
				return {
					...tierlist,
					id: tlid,
					tiers_preview: tiersByTierlist[tlid] || [],
					games_count: countsByTierlist[tlid] || 0,
					owner: owners[tierlist.user_id] || null,
				}
			})

			return res.json({
				tierlists: formattedTierlists,
				total: count || 0,
				page: pageNum,
				totalPages: Math.ceil((count || 0) / limitNum),
			})
		}

		if (type === "screenshots") {
			const { data: likedScreenshotsData, count } = await supabase
				.from("screenshot_likes")
				.select("screenshot_id", { count: "exact" })
				.eq("user_id", userId)
				.order("created_at", { ascending: false })
				.range(offset, offset + limitNum - 1)

			const screenshotIds = likedScreenshotsData?.map(l => l.screenshot_id) || []

			if (screenshotIds.length === 0) {
				return res.json({
					screenshots: [],
					total: count || 0,
					page: pageNum,
					totalPages: Math.ceil((count || 0) / limitNum),
				})
			}

			const { data } = await supabase
				.from("screenshots")
				.select("id, user_id, image_url, caption, game_id, game_slug, game_name, is_spoiler, created_at")
				.in("id", screenshotIds)

			const screenshots = data || []

			const orderedScreenshots = screenshotIds
				.map(id => screenshots.find(s => s.id === id))
				.filter(Boolean)

			return res.json({
				screenshots: orderedScreenshots,
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
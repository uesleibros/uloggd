import { usersHandler } from "#routers/users.js"
import { userGamesHandler } from "#routers/userGames.js"
import { backloggdHandler } from "#routers/backloggd.js"
import { psnImportHandler } from "#routers/psnImport.js"
import { notificationsHandler } from "#routers/notifications.js"
import { howlongtobeatHandler } from "#routers/howlongtobeat.js"
import { igdbHandler } from "#routers/igdb.js"
import { reviewsHandler } from "#routers/reviews.js"
import { listsHandler } from "#routers/lists.js"
import { translateHandler } from "#routers/translate.js"
import { likesHandler } from "#routers/likes.js"
import { verificationHandler } from "#routers/verification.js"
import { badgesHandler } from "#routers/badges.js"
import { moderationHandler } from "#routers/moderation.js"
import { pricesHandler } from "#routers/prices.js"
import { tierlistsHandler } from "#routers/tierlists.js"
import { chestHandler } from "#routers/chest.js"
import { transactionsHandler } from "#routers/transactions.js"
import { passkeyHandler } from "#routers/passkey.js"
import { shopHandler } from "#routers/shop.js"
import { journeysHandler } from "#routers/journeys.js"
import { commentsHandler } from "#routers/comments.js"
import { screenshotsHandler } from "#routers/screenshots.js"
import { statsHandler } from "#routers/stats.js"

import { steamHandler } from "#routers/connections/steam.js"
import { twitchHandler } from "#routers/connections/twitch.js"
import { nintendoHandler } from "#routers/connections/nintendo.js"
import { psnHandler } from "#routers/connections/psn.js"
import { epicGamesHandler } from "#routers/connections/epicgames.js"
import { retroachievementsHandler } from "#routers/connections/retroachievements.js"

const SERVICES = {
	users: usersHandler,
	userGames: userGamesHandler,
	backloggd: backloggdHandler,
	psnImport: psnImportHandler,
	notifications: notificationsHandler,
	howlongtobeat: howlongtobeatHandler,
	igdb: igdbHandler,
	reviews: reviewsHandler,
	lists: listsHandler,
	twitch: twitchHandler,
	nintendo: nintendoHandler,
	psn: psnHandler,
	epicgames: epicGamesHandler,
	retroachievements: retroachievementsHandler,
	translate: translateHandler,
	likes: likesHandler,
	steam: steamHandler,
	verification: verificationHandler,
	badges: badgesHandler,
	moderation: moderationHandler,
	prices: pricesHandler,
	tierlists: tierlistsHandler,
	chest: chestHandler,
	transactions: transactionsHandler,
	passkey: passkeyHandler,
	shop: shopHandler,
	journeys: journeysHandler,
	comments: commentsHandler,
	screenshots: screenshotsHandler,
	stats: statsHandler
}

export default async function handler(req, res) {
	res.setHeader("X-Frame-Options", "DENY")
	res.setHeader("X-Content-Type-Options", "nosniff")
	res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")
	res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

	const allowedOrigin = process.env.APP_URL

	if (allowedOrigin) {
		res.setHeader("Access-Control-Allow-Origin", allowedOrigin)
		res.setHeader("Access-Control-Allow-Credentials", "true")
		res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
		res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	}

	if (req.method === "OPTIONS") {
		return res.status(200).end()
	}

	const { service, action, scope } = req.query

	const fn = SERVICES[service]
	if (!fn) return res.status(404).json({ error: "service not found" })

	req.action = action
	req.scope = scope ?? null

	return fn(req, res)
}

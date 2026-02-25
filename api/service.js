import { usersHandler } from "#routers/users.js"
import { userGamesHandler } from "#routers/userGames.js"
import { backloggdHandler } from "#routers/backloggd.js"
import { notificationsHandler } from "#routers/notifications.js"
import { howlongtobeatHandler } from "#routers/howlongtobeat.js"
import { igdbHandler } from "#routers/igdb.js"
import { reviewsHandler } from "#routers/reviews.js"
import { listsHandler } from "#routers/lists.js"
import { twitchHandler } from "#routers/twitch.js"
import { nintendoHandler } from "#routers/nintendo.js"
import { translateHandler } from "#routers/translate.js"
import { likesHandler } from "#routers/likes.js"
import { steamHandler } from "#routers/steam.js"
import { verificationHandler } from "#routers/verification.js"
import { badgesHandler } from "#routers/badges.js"
import { moderationHandler } from "#routers/moderation.js"
import { getUser } from "#lib/auth.js"

const SERVICES = {
	users: usersHandler,
	userGames: userGamesHandler,
	backloggd: backloggdHandler,
	notifications: notificationsHandler,
	howlongtobeat: howlongtobeatHandler,
	igdb: igdbHandler,
	reviews: reviewsHandler,
	lists: listsHandler,
	twitch: twitchHandler,
	nintendo: nintendoHandler,
	translate: translateHandler,
	likes: likesHandler,
	steam: steamHandler,
	verification: verificationHandler,
	badges: badgesHandler,
	moderation: moderationHandler
}

export default async function handler(req, res) {
	const { service, action, scope } = req.query

	const fn = SERVICES[service]
	if (!fn) return res.status(404).json({ error: "service not found" })

	const allowedOrigin = process.env.BASE_URL
	const origin = req.headers.origin || req.headers.referer

	if (allowedOrigin) {
		if (!origin || !origin.startsWith(allowedOrigin)) {
			return res.status(403).json({ error: "forbidden" })
		}
	}

	req.action = action
	req.scope = scope ?? null

	return fn(req, res)
}

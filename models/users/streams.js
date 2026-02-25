import twitchClient from "#lib/twitch.js"

function formatStreamData(streamData, twitchUsername) {
	return {
		twitch_username: twitchUsername,
		title: streamData.title,
		game: streamData.game_name,
		viewers: streamData.viewer_count,
		thumbnail: streamData.thumbnail_url.replace("{width}", "320").replace("{height}", "180"),
	}
}

export async function resolveStream(connections) {
	const twitch = connections?.find(c => c.provider === "twitch")
	if (!twitch?.provider_username) return null

	try {
		const data = await twitchClient.getStream(twitch.provider_username)
		return data ? formatStreamData(data, twitch.provider_username) : null
	} catch {
		return null
	}
}

export async function resolveStreams(users) {
	const twitchMap = {}
	const usernames = []

	for (const u of users) {
		const twitch = u.user_connections?.find(c => c.provider === "twitch")
		if (twitch?.provider_username) {
			twitchMap[twitch.provider_username.toLowerCase()] = u.user_id
			usernames.push(twitch.provider_username)
		}
	}

	if (!usernames.length) return {}

	const streamsMap = {}

	try {
		const streams = await twitchClient.getStreams(usernames)
		for (const s of streams) {
			const uid = twitchMap[s.user_login.toLowerCase()]
			if (uid) streamsMap[uid] = formatStreamData(s, s.user_login)
		}
	} catch {}

	return streamsMap
}
export const config = {
  matcher: ['/game/:slug*', '/u/:username*', '/list/:id*', '/tierlist/:id*', '/review/:id*'],
}

const BOT_REGEX = /Discordbot|Twitterbot|facebookexternalhit|LinkedInBot|TelegramBot|Slackbot|WhatsApp|Embedly|Pinterest|Slack-ImgProxy/i

const SITE_NAME = 'uloggd'
const THEME_COLOR = '#5865F2'
const FETCH_TIMEOUT = 4000

export default async function middleware(req) {
  const userAgent = req.headers.get('user-agent') || ''
  if (!BOT_REGEX.test(userAgent)) return

  const url = new URL(req.url)
  const [, type, id] = url.pathname.split('/')

  const handlers = {
    game: handleGame,
    u: handleProfile,
    list: handleList,
    tierlist: handleTierlist,
    review: handleReview,
  }

  const handler = handlers[type]
  if (!handler || !id) return

  try {
    return await handler(url, id)
  } catch {
    return buildFallbackResponse(url)
  }
}

async function safeFetch(fetchUrl) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

  try {
    const res = await fetch(fetchUrl, { signal: controller.signal })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function ensureAbsoluteUrl(urlStr, origin) {
  if (!urlStr) return null
  if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) return urlStr
  if (urlStr.startsWith('//')) return `https:${urlStr}`
  if (urlStr.startsWith('/')) return `${origin}${urlStr}`
  return urlStr
}

function escapeHtml(str) {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function stripMarkdown(str) {
  if (!str) return ''
  return str
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^---+$/gm, '')
    .replace(/\|/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/!game:\w+\([^)]*\)/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(str, max = 160) {
  if (!str || str.length <= max) return str || ''
  return str.substring(0, max).trimEnd() + '...'
}

function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`
}

async function handleGame(url, slug) {
  const game = await safeFetch(
    `${url.origin}/api/igdb/game?slug=${encodeURIComponent(slug)}`
  )
  if (!game) return buildFallbackResponse(url)

  const title = `${game.name} - ${SITE_NAME}`
  const description = game.summary
    ? truncate(stripMarkdown(game.summary))
    : `View details about ${game.name}`

  const image = game.cover?.url
    ? ensureAbsoluteUrl(game.cover.url.replace('t_thumb', 't_720p'), url.origin)
    : null

  return buildResponse({
    title,
    description,
    image,
    url: url.href,
    twitterCard: 'summary_large_image',
  })
}

async function handleProfile(url, username) {
  const profile = await safeFetch(
    `${url.origin}/api/users/profile?username=${encodeURIComponent(username)}`
  )
  if (!profile) return buildFallbackResponse(url)

  const title = `${profile.username} - ${SITE_NAME}`
  const description = profile.bio
    ? truncate(stripMarkdown(profile.bio))
    : `${profile.username}'s profile`
  const image = ensureAbsoluteUrl(profile.avatar, url.origin)

  return buildResponse({
    title,
    description,
    image,
    url: url.href,
    twitterCard: 'summary',
  })
}

async function handleList(url, listId) {
  const list = await safeFetch(
    `${url.origin}/api/lists/get?listId=${encodeURIComponent(listId)}`
  )
  if (!list) return buildFallbackResponse(url)

  const gamesCount = list.items_total || list.game_slugs?.length || 0
  const title = `${list.title} - ${SITE_NAME}`
  const description = list.description
    ? truncate(stripMarkdown(list.description))
    : `List with ${pluralize(gamesCount, 'game', 'games')}`

  return buildResponse({
    title,
    description,
    image: null,
    url: url.href,
    twitterCard: 'summary',
  })
}

async function handleTierlist(url, tierlistId) {
  const tierlist = await safeFetch(
    `${url.origin}/api/tierlists/get?tierlistId=${encodeURIComponent(tierlistId)}`
  )
  if (!tierlist) return buildFallbackResponse(url)

  const gamesCount = (tierlist.tierlist_tiers || []).reduce(
    (acc, tier) => acc + (tier.tierlist_items?.length || 0),
    0
  )
  const tiersCount = tierlist.tierlist_tiers?.length || 0

  const title = `${tierlist.title} - ${SITE_NAME}`
  const description = tierlist.description
    ? truncate(stripMarkdown(tierlist.description))
    : `Tierlist with ${pluralize(gamesCount, 'game', 'games')} in ${pluralize(tiersCount, 'tier', 'tiers')}`

  return buildResponse({
    title,
    description,
    image: null,
    url: url.href,
    twitterCard: 'summary',
  })
}

async function handleReview(url, reviewId) {
  const data = await safeFetch(
    `${url.origin}/api/reviews/get?reviewId=${encodeURIComponent(reviewId)}`
  )
  if (!data?.review) return buildFallbackResponse(url)

  const { review, user, game } = data
  const username = user?.username || 'Someone'
  const gameName = game?.name || 'a game'

  const title = `${username}'s review of ${gameName} - ${SITE_NAME}`

  let description
  if (review.review) {
    description = truncate(stripMarkdown(review.review))
  } else if (review.rating) {
    description = `${username} rated ${gameName} ${review.rating}/10`
  } else {
    description = `${username}'s review of ${gameName}`
  }

  const image = game?.cover?.url
    ? ensureAbsoluteUrl(game.cover.url.replace('t_thumb', 't_720p'), url.origin)
    : null

  return buildResponse({
    title,
    description,
    image,
    url: url.href,
    twitterCard: image ? 'summary_large_image' : 'summary',
  })
}

function buildFallbackResponse(url) {
  return buildResponse({
    title: SITE_NAME,
    description: 'Track, rate and discover games.',
    image: null,
    url: url.href,
    twitterCard: 'summary',
  })
}

function buildResponse({ title, description, image, url, twitterCard = 'summary' }) {
  const safeTitle = escapeHtml(title)
  const safeDesc = escapeHtml(description)
  const safeUrl = escapeHtml(url)
  const fallbackImage = `${new URL(url).origin}/banner.png`
  const safeImage = escapeHtml(image || fallbackImage)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:url" content="${safeUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta name="twitter:card" content="${twitterCard}">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeImage}">
  <meta name="theme-color" content="${THEME_COLOR}">
</head>
<body></body>
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}

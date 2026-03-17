export const config = {
  matcher: ['/game/:slug*', '/u/:username*', '/list/:id*', '/tierlist/:id*', '/review/:id*', '/screenshot/:id*'],
}

const BOT_REGEX = /Discordbot|Twitterbot|facebookexternalhit|LinkedInBot|TelegramBot|Slackbot|WhatsApp|Embedly|Pinterest|Slack-ImgProxy|Googlebot|bingbot|yandex|Baiduspider|DuckDuckBot/i

const SITE_NAME = 'uloggd'
const SITE_DESCRIPTION = 'Track your gaming journey, rate games, write reviews, create lists & tier lists, track playtime with journals, and monitor achievements from Steam, PlayStation & RetroAchievements.'
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
    screenshot: handleScreenshot,
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
    : `View details about ${game.name} on ${SITE_NAME}`

  const image = game.cover?.url
    ? ensureAbsoluteUrl(game.cover.url.replace('t_thumb', 't_720p'), url.origin)
    : null

  return buildResponse({
    title,
    description,
    image,
    url: url.href,
    twitterCard: 'summary_large_image',
    type: 'article',
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
    : `${profile.username}'s gaming profile on ${SITE_NAME}`
  const image = ensureAbsoluteUrl(profile.avatar, url.origin)

  return buildResponse({
    title,
    description,
    image,
    url: url.href,
    twitterCard: 'summary',
    type: 'profile',
  })
}

async function handleList(url, listId) {
  const list = await safeFetch(
    `${url.origin}/api/lists/get?listId=${encodeURIComponent(listId)}`
  )
  if (!list) return buildFallbackResponse(url)

  const gamesCount = list.items_total || list.game_slugs?.length || 0
  const owner = list.owner?.username || ''
  const title = `${list.title} - ${SITE_NAME}`
  const description = list.description
    ? truncate(stripMarkdown(list.description))
    : `${owner ? `${owner}'s game list` : 'Game list'} with ${pluralize(gamesCount, 'game', 'games')}`

  return buildResponse({
    title,
    description,
    image: null,
    url: url.href,
    twitterCard: 'summary',
    type: 'article',
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
  const owner = tierlist.owner?.username || ''

  const title = `${tierlist.title} - ${SITE_NAME}`
  const description = tierlist.description
    ? truncate(stripMarkdown(tierlist.description))
    : `${owner ? `${owner}'s tier list` : 'Tier list'} with ${pluralize(gamesCount, 'game', 'games')} in ${pluralize(tiersCount, 'tier', 'tiers')}`

  return buildResponse({
    title,
    description,
    image: null,
    url: url.href,
    twitterCard: 'summary',
    type: 'article',
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
    description = `${username}'s review of ${gameName} on ${SITE_NAME}`
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
    type: 'article',
  })
}

async function handleScreenshot(url, screenshotId) {
  const data = await safeFetch(
    `${url.origin}/api/screenshots/get?screenshotId=${encodeURIComponent(screenshotId)}`
  )
  if (!data?.screenshot) return buildFallbackResponse(url)

  const { screenshot, user, game } = data
  const username = user?.username || 'Someone'
  const gameName = game?.name || null

  const title = gameName
    ? `${username}'s screenshot of ${gameName} - ${SITE_NAME}`
    : `${username}'s screenshot - ${SITE_NAME}`

  let description
  if (screenshot.caption) {
    description = truncate(screenshot.caption)
  } else if (gameName) {
    description = `Screenshot of ${gameName} by ${username} on ${SITE_NAME}`
  } else {
    description = `Screenshot by ${username} on ${SITE_NAME}`
  }

  const image = ensureAbsoluteUrl(screenshot.image_url, url.origin)

  return buildResponse({
    title,
    description,
    image,
    url: url.href,
    twitterCard: 'summary_large_image',
    type: 'article',
  })
}

function buildFallbackResponse(url) {
  return buildResponse({
    title: `${SITE_NAME} - Track, Rate & Share Your Game Collection`,
    description: SITE_DESCRIPTION,
    image: null,
    url: url.href,
    twitterCard: 'summary_large_image',
  })
}

function buildResponse({ title, description, image, url, twitterCard = 'summary', type = 'website' }) {
  const origin = new URL(url).origin
  const safeTitle = escapeHtml(title)
  const safeDesc = escapeHtml(description)
  const safeUrl = escapeHtml(url)
  const fallbackImage = `${origin}/banner.jpg`
  const safeImage = escapeHtml(image || fallbackImage)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
  <meta name="theme-color" content="${THEME_COLOR}" />
  <link rel="canonical" href="${safeUrl}" />
  <link rel="icon" type="image/x-icon" href="${origin}/logo.jpg" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:image:alt" content="${safeTitle}" />
  <meta property="og:url" content="${safeUrl}" />
  <meta property="og:type" content="${type}" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:locale:alternate" content="pt_BR" />
  <meta name="twitter:card" content="${twitterCard}" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${safeImage}" />
  <meta name="twitter:image:alt" content="${safeTitle}" />
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
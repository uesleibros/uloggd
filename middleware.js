export const config = {
  matcher: ['/game/:slug*', '/u/:username*'],
}

const BOT_REGEX = /Discordbot|Twitterbot|facebookexternalhit|LinkedInBot|TelegramBot|Slackbot/i

export default async function middleware(req) {
  const userAgent = req.headers.get('user-agent') || ''

  if (!BOT_REGEX.test(userAgent)) return

  const url = new URL(req.url)
  const segments = url.pathname.split('/').filter(Boolean)

  try {
    if (segments[0] === 'game' && segments[1]) {
      return handleGame(url, segments[1])
    }

    if (segments[0] === 'u' && segments[1]) {
      return handleProfile(url, segments[1])
    }
  } catch {
    return
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

async function handleGame(url, slug) {
  const res = await fetch(`${url.origin}/api/igdb?action=game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
  })

  if (!res.ok) return
  const game = await res.json()

  const title = `${game.name} - uloggd`
  const description = game.summary
    ? stripMarkdown(game.summary).substring(0, 160) + '...'
    : 'Veja detalhes do jogo no uloggd'

  const image = game.cover?.url
    ? ensureAbsoluteUrl(game.cover.url.replace('t_thumb', 't_720p'), url.origin)
    : `${url.origin}/default-share.png`

  return buildResponse(title, description, image, url.href)
}

async function handleProfile(url, username) {
  const res = await fetch(`${url.origin}/api/user?action=profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  })

  if (!res.ok) return
  const profile = await res.json()

  const title = `${profile.username} - uloggd`
  const description = `Perfil de ${profile.username}`
  const image = ensureAbsoluteUrl(profile.avatar, url.origin)

  return buildResponse(title, description, image, url.href)
}

function buildResponse(title, description, image, pageUrl) {
  const safeTitle = escapeHtml(title)
  const safeDesc = escapeHtml(description)
  const safeImage = escapeHtml(image)
  const safeUrl = escapeHtml(pageUrl)

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:url" content="${safeUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="uloggd" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${safeImage}" />
  <meta name="theme-color" content="#5865F2" />
</head>
<body></body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=UTF-8' },
  })
}

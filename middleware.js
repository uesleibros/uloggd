export const config = {
  matcher: ['/game/:slug*', '/u/:username*'],
}

export default async function middleware(req) {
  const userAgent = req.headers.get('user-agent') || ''
  const bots = /Discordbot|Twitterbot|facebookexternalhit|LinkedInBot|TelegramBot|Slackbot/i

  if (!bots.test(userAgent)) return

  const url = new URL(req.url)
  const segments = url.pathname.split('/').filter(Boolean)

  try {
    if (segments[0] === 'game' && segments[1]) {
      return handleGame(url, segments[1])
    }

    if (segments[0] === 'u' && segments[1]) {
      return handleProfile(url, segments[1])
    }
  } catch (e) {
    return
  }
}

async function handleGame(url, slug) {
  const res = await fetch(`${url.origin}/api/igdb/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
  })

  if (!res.ok) return
  const game = await res.json()

  const title = `${game.name} - uloggd`
  const description = game.summary
    ? game.summary.substring(0, 160) + '...'
    : 'Veja detalhes do jogo no uloggd'
  const image = game.cover?.url
    ? `https:${game.cover.url.replace('t_thumb', 't_720p')}`
    : `${url.origin}/default-share.png`

  return buildResponse(title, description, image)
}

async function handleProfile(url, username) {
  const res = await fetch(`${url.origin}/api/user/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  })

  if (!res.ok) return
  const profile = await res.json()

  const title = `${profile.username} - uloggd`
  const description = `Veja o perfil de ${profile.username} no uloggd`
  const image = profile.avatar || `${url.origin}/default-share.png`

  return buildResponse(title, description, image)
}

function buildResponse(title, description, image) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
</head>
<body></body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=UTF-8' },
  })
}
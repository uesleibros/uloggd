import { next } from '@vercel/edge';

export const config = {
  matcher: '/game/:slug*',
};

export default async function middleware(req) {
  const userAgent = req.headers.get('user-agent') || '';
  const bots = /Discordbot|Twitterbot|facebookexternalhit|LinkedInBot|TelegramBot|Slackbot/i;

  if (!bots.test(userAgent)) {
    return next();
  }

  const url = new URL(req.url);
  const slug = url.pathname.split('/').filter(Boolean).pop();

  try {
    const apiRes = await fetch(`${url.origin}/api/igdb/game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    });

    if (!apiRes.ok) return next();
    const game = await apiRes.json();

    const title = `${game.name} - uloggd`;
    const description = game.summary ? game.summary.substring(0, 160) + '...' : 'Veja detalhes do jogo no uloggd';
    const image = game.cover?.url 
      ? `https:${game.cover.url.replace('t_thumb', 't_720p')}`
      : `${url.origin}/default-share.png`;

    const html = `
      <!DOCTYPE html>
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
      </html>
    `.trim();

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=UTF-8' },
    });
  } catch (e) {
    return next();
  }
}

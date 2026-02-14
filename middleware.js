export const config = {
  matcher: '/game/:path*',
}

export async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  const userAgent = request.headers.get('user-agent') || '';
  const isBot = /bot|discord|telegram|twitter|facebook|linkedin/i.test(userAgent);
  
  if (isBot && pathname.startsWith('/game/')) {
    const slug = pathname.split('/game/')[1];
    
    const gameData = await fetch(`${url.origin}/api/igdb/game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug })
    }).then(res => res.json());
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${gameData.name} - uloggd</title>
          <meta property="og:title" content="${gameData.name} - uloggd" />
          <meta property="og:description" content="${gameData.summary || `Veja informações sobre ${gameData.name}`}" />
          <meta property="og:image" content="https:${gameData.cover?.url || '/banner.png'}" />
          <meta property="og:type" content="website" />
          <meta name="twitter:card" content="summary_large_image" />
        </head>
        <body>
          <script>window.location.href = "${url.href}";</script>
        </body>
      </html>
    `;
    
    return new Response(html, {
      headers: { 'content-type': 'text/html' },
    });
  }
}

<div align="center">

# uloggd

A platform to catalog, rate and share your game collection.

[![Made with Supabase](https://supabase.com/badge-made-with-supabase.svg)](https://supabase.com)

<a href="https://github.com/uesleibros/uloggd/commits/main"><img src="https://img.shields.io/github/last-commit/uesleibros/uloggd.svg?logo=github&logoColor=ffffff" alt="Last commit." /></a>
<a href="https://github.com/uesleibros/uloggd/stargazers"><img src="https://img.shields.io/github/stars/uesleibros/uloggd.svg?logo=github&logoColor=ffffff" alt="Stars." /></a>
<a href="https://github.com/uesleibros/uloggd/issues"><img src="https://img.shields.io/github/issues/uesleibros/uloggd.svg?logo=github&logoColor=ffffff" alt="Issues." /></a>
<a href="https://github.com/uesleibros/uloggd/pulls"><img src="https://img.shields.io/github/issues-pr/uesleibros/uloggd.svg?logo=github&logoColor=ffffff" alt="Pull requests." /></a>
<a href="https://github.com/uesleibros/uloggd"><img src="https://img.shields.io/github/repo-size/uesleibros/uloggd.svg?logo=github&logoColor=ffffff" alt="Repository size." /></a>
<a href="https://github.com/uesleibros/uloggd"><img src="https://img.shields.io/github/languages/top/uesleibros/uloggd.svg?logo=javascript&logoColor=ffffff" alt="Top language." /></a>
<a href="https://github.com/uesleibros/uloggd/graphs/contributors"><img src="https://img.shields.io/github/contributors/uesleibros/uloggd.svg?logo=github&logoColor=ffffff" alt="Contributors." /></a>
<a href="https://github.com/uesleibros/uloggd/forks"><img src="https://img.shields.io/github/forks/uesleibros/uloggd.svg?logo=github&logoColor=ffffff" alt="Forks." /></a>
<img src="https://img.shields.io/badge/React-19-087ea4?logo=react&logoColor=ffffff" alt="React 19" />
<img src="https://img.shields.io/badge/Vite-7-646cff?logo=vite&logoColor=ffffff" alt="Vite 7" />
<img src="https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=ffffff" alt="Tailwind CSS 4" />
<img src="https://img.shields.io/badge/Supabase-3fcf8e?logo=supabase&logoColor=ffffff" alt="Supabase" />
<img src="https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=ffffff" alt="Vercel" />
<img src="https://img.shields.io/badge/Discord_OAuth-5865f2?logo=discord&logoColor=ffffff" alt="Discord OAuth" />
\
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=uesleibros_uloggd&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=uesleibros_uloggd)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=uesleibros_uloggd&metric=bugs)](https://sonarcloud.io/summary/new_code?id=uesleibros_uloggd)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=uesleibros_uloggd&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=uesleibros_uloggd)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=uesleibros_uloggd&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=uesleibros_uloggd)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=uesleibros_uloggd&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=uesleibros_uloggd)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=uesleibros_uloggd&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=uesleibros_uloggd)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=uesleibros_uloggd&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=uesleibros_uloggd)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=uesleibros_uloggd&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=uesleibros_uloggd)

[![SonarQube Cloud](https://sonarcloud.io/images/project_badges/sonarcloud-light.svg)](https://sonarcloud.io/summary/new_code?id=uesleibros_uloggd)
\
<a href="https://vercel.com/?utm_source=uloggd&utm_campaign=oss">
<img src="/.github/powered-by-vercel.svg" alt="Vercel">
</a>

</div>

## About

**uloggd** is a platform where you can keep a virtual list of games in your collection, rate and review the ones you've played, and share everything with your friends.  
Think of it as a **social gaming diary**, inspired by platforms like Letterboxd and Backloggd.

## Features

- **Personal catalog** - Organize your games in custom lists with statuses (playing, completed, dropped, etc.)
- **Ratings and reviews** - Rate games and write reviews with Markdown support
- **Customizable profiles** - Avatar, banner, bio, avatar decorations, and badges
- **Social system** - Follow other users and track their activity
- **Discord authentication** - Integrated login with your Discord account
- **Game data via IGDB** - Complete game information provided by the IGDB/Twitch API

## Stack

- React 19
- Vite 7
- Tailwind CSS 4
- Supabase (Auth + Database)
- IGDB API
- Discord OAuth
- Vercel Serverless Functions

## Development

### Prerequisites

- Node.js 18+
- [Supabase](https://supabase.com) account
- Application registered on [Twitch Developer Console](https://dev.twitch.tv/console/apps) (IGDB API access)
- Steam Web API Key registered at https://steamcommunity.com/dev/apikey
- OAuth application on [Discord Developer Portal](https://discord.com/developers/applications)
- [imgchest](https://imgchest.com/docs/api) API key
- Configured domain for OAuth (e.g., `http://localhost:3000` for dev or `https://yoursite.com` for production)

### Setup

1. Clone the repository:

```bash
git clone https://github.com/uesleibros/uloggd.git
cd uloggd
```

2. Install dependencies:

```bash
npm install
```

3. Copy the example file and fill in your credentials:

```bash
cp .env.example .env
```

#### Required Variables

| Variable | Description | Where to get |
|----------|-------------|--------------|
| `APP_URL` | Base application URL (used for Steam/Twitch OAuth and redirects). E.g., `http://localhost:3000` (dev) or `https://yoursite.com` (production) | Defined by you |
| `STEAM_WEB_API_KEY` | Steam API key to access public data | https://steamcommunity.com/dev/apikey |
| `TWITCH_CLIENT_ID` | Twitch application Client ID | https://dev.twitch.tv/console/apps |
| `TWITCH_CLIENT_SECRET` | Twitch application Client Secret | https://dev.twitch.tv/console/apps |
| `TWITCH_REDIRECT_URI` | Twitch OAuth callback URL (e.g., `https://yoursite.com/api/twitch/callback`) | Defined by you and registered in Twitch Dev Console |
| `VITE_SUPABASE_URL` | Supabase project URL (frontend) | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key (frontend) | Supabase Dashboard → Settings → API |
| `SUPABASE_URL` | Supabase project URL (backend) | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (backend) | Supabase Dashboard → Settings → API |
| `IMGCHEST_API_KEY` | API key for image uploads | https://imgchest.com/docs/api |
| `DISCORD_WEBHOOK_URL` | Webhook URL for team notifications | Discord → Channel → Edit Channel → Integrations → Webhooks |
| `ISTHEREANYDEAL_API_KEY` | API key for game price history | https://isthereanydeal.com/dev/app/ |

#### Local Development

> [!WARNING]
> The `.env.local` file **should not be committed**.

#### Production (Vercel)

Configure the same variables in the Vercel panel:

Project → Settings → Environment Variables

Set:

```
APP_URL=https://yoursite.com
```

Select the desired environments:
- ✅ Production
- ✅ Preview (optional)
- ✅ Development (optional)

#### Important Notes

- `APP_URL` must always match the domain registered with OAuth providers.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` on the frontend.
- Variables starting with `VITE_` are available on the frontend.
- Avoid using dynamic preview URLs for OAuth (Steam/Twitch).
- If an OAuth integration fails, check:
  1. If the domain is correct.
  2. If the callback is registered with the provider.
  3. If `APP_URL` is configured correctly.

> Also see the [`.env.example`](/.env.example) file to apply correctly in your `.env.local`/`.env`

4. Start the development server:

```bash
npm run dev
```

For development with Vercel serverless functions:

```bash
npm run dev:vercel
```

### Database

The project uses **Supabase** (PostgreSQL). To set up the database:

1. **Create a project** on [Supabase Dashboard](https://app.supabase.com)

2. **Import the database schema**:
   - Access **SQL Editor** in the Supabase dashboard
   - Copy all contents from [`database/schema.sql`](/database/schema.sql)
   - Paste into the editor and click **RUN**

3. **Configure Discord authentication:**
   - In Supabase, go to **Authentication** > **Providers**
   - Enable **Discord** and fill in Client ID and Secret

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Vite |
| `npm run dev:vercel` | Start development environment with Vercel CLI |
| `npm run build` | Generate production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint on the project |

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

## License

This project is licensed under the Apache 2.0 License. See the [LICENSE](/LICENSE) file for more details.

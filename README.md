<div align="center">

# uloggd

Uma plataforma para catalogar, avaliar e compartilhar sua coleção de jogos.

[![Made with Supabase](https://supabase.com/badge-made-with-supabase.svg)](https://supabase.com)

<a href="https://github.com/uesleibros/uloggd/commits/main"><img src="https://img.shields.io/github/last-commit/uesleibros/uloggd.svg?logo=github&logoColor=ffffff" alt="Ultimo commit." /></a>
<a href="https://github.com/uesleibros/uloggd/stargazers"><img src="https://img.shields.io/github/stars/uesleibros/uloggd.svg?logo=github&logoColor=ffffff" alt="Stars." /></a>
<a href="https://github.com/uesleibros/uloggd/issues"><img src="https://img.shields.io/github/issues/uesleibros/uloggd.svg?logo=github&logoColor=ffffff" alt="Issues." /></a>
<a href="https://github.com/uesleibros/uloggd/pulls"><img src="https://img.shields.io/github/issues-pr/uesleibros/uloggd.svg?logo=github&logoColor=ffffff" alt="Pull requests." /></a>
<a href="https://github.com/uesleibros/uloggd"><img src="https://img.shields.io/github/repo-size/uesleibros/uloggd.svg?logo=github&logoColor=ffffff" alt="Tamanho do repositório." /></a>
<a href="https://github.com/uesleibros/uloggd"><img src="https://img.shields.io/github/languages/top/uesleibros/uloggd.svg?logo=javascript&logoColor=ffffff" alt="Linguagem principal." /></a>
<a href="https://github.com/uesleibros/uloggd/graphs/contributors"><img src="https://img.shields.io/github/contributors/uesleibros/uloggd.svg?logo=github&logoColor=ffffff" alt="Contribuidores." /></a>
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

## Sobre

**uloggd** é uma plataforma onde você pode manter uma lista virtual dos jogos da sua coleção, avaliar e comentar os que já jogou e compartilhar tudo com seus amigos.  
Pense nele como um **diário social de jogos**, inspirado em plataformas como Letterboxd e Backloggd.

## Funcionalidades

- **Catálogo pessoal** - Organize seus jogos em listas personalizadas com status (jogando, completo, dropado, etc.)
- **Avaliações e comentários** - Avalie jogos e escreva reviews com suporte a Markdown
- **Perfis customizaveis** - Avatar, banner, bio, decorações de avatar e badges
- **Sistema social** - Siga outros usuários e acompanhe a atividade deles
- **Autenticação via Discord** - Login integrado com sua conta do Discord
- **Dados de jogos via IGDB** - Informações completas dos jogos fornecidas pela API do IGDB/Twitch

## Stack

- React 19
- Vite 7
- Tailwind CSS 4
- Supabase (Auth + Database)
- IGDB API
- Discord OAuth
- Vercel Serverless Functions

## Desenvolvimento

### Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)
- Aplicação registrada no [Twitch Developer Console](https://dev.twitch.tv/console/apps) (acesso à API do IGDB)
- Steam Web API Key registrada em https://steamcommunity.com/dev/apikey
- Aplicação OAuth no [Discord Developer Portal](https://discord.com/developers/applications)
- Chave de API do [imgchest](https://imgchest.com/docs/api)
- Domínio configurado para OAuth (ex: `http://localhost:3000` para dev ou `https://seusite.com` para produção)

### Configuração 

1. Clone o repositorio:

```bash
git clone https://github.com/uesleibros/uloggd.git
cd uloggd
```

2. Instale as dependencias:

```bash
npm install
```

3. Copie o arquivo de exemplo e preencha com suas credenciais:

```bash
cp .env.example .env
```

#### Variáveis Necessárias

| Variável | Descrição | Onde obter |
|----------|-----------|------------|
| `APP_URL` | URL base da aplicação (usada para OAuth Steam/Twitch e redirects). Ex: `http://localhost:3000` (dev) ou `https://seusite.com` (produção) | Definida por você |
| `STEAM_WEB_API_KEY` | Chave de API da Steam para acessar dados públicos | https://steamcommunity.com/dev/apikey |
| `TWITCH_CLIENT_ID` | Client ID da aplicação Twitch | https://dev.twitch.tv/console/apps |
| `TWITCH_CLIENT_SECRET` | Client Secret da aplicação Twitch | https://dev.twitch.tv/console/apps |
| `TWITCH_REDIRECT_URI` | URL de callback do OAuth da Twitch (ex: `https://seusite.com/api/twitch/callback`) | Definida por você e registrada no Twitch Dev Console |
| `VITE_SUPABASE_URL` | URL do projeto Supabase (frontend) | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Anon key pública do Supabase (frontend) | Supabase Dashboard → Settings → API |
| `SUPABASE_URL` | URL do projeto Supabase (backend) | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key do Supabase (backend) | Supabase Dashboard → Settings → API |
| `IMGCHEST_API_KEY` | Chave de API para upload de imagens | https://imgchest.com/docs/api |
| `DISCORD_WEBHOOK_URL` | URL do webhook para notificações da equipe | Discord → Canal → Editar Canal → Integrações → Webhooks |
| `ISTHEREANYDEAL_API_KEY` | Chave de API para histórico de preços de jogos | https://isthereanydeal.com/dev/app/ |

#### Desenvolvimento Local

> [!WARNING]
> O arquivo `.env.local` **não deve ser commitado**.

#### Produção (Vercel)

Configure as mesmas variáveis no painel da Vercel:

Project → Settings → Environment Variables

Defina:

```
APP_URL=https://seusite.com
```

Selecione os ambientes desejados:
- ✅ Production
- ✅ Preview (opcional)
- ✅ Development (opcional)

#### Observações Importantes

- `APP_URL` deve sempre corresponder ao domínio registrado nos provedores OAuth.
- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Variáveis que começam com `VITE_` ficam disponíveis no frontend.
- Evite usar URLs de preview dinâmicas para OAuth (Steam/Twitch).
- Se uma integração OAuth falhar, verifique:
  1. Se o domínio está correto.
  2. Se o callback está registrado no provedor.
  3. Se `APP_URL` está configurado corretamente.

> Também veja o arquivo [`.env.example`](/.env.example) para aplicar corretamente no seu `.env.local`/`.env`

4. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Para desenvolvimento com as funções serverless da Vercel:

```bash
npm run dev:vercel
```

### Banco de Dados

O projeto usa **Supabase** (PostgreSQL). Para configurar o banco:

1. **Crie um projeto** no [Supabase Dashboard](https://app.supabase.com)

2. **Importe o schema** do banco de dados:
   - Acesse **SQL Editor** no dashboard do Supabase
   - Copie todo o conteúdo de [`database/schema.sql`](/database/schema.sql)
   - Cole no editor e clique em **RUN**

3. **Configure a autenticação Discord:**
   - No Supabase, vá em **Authentication** > **Providers**
   - Habilite **Discord** e preencha Client ID e Secret

### Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia o servidor de desenvolvimento com Vite |
| `npm run dev:vercel` | Inicia o ambiente de desenvolvimento com Vercel CLI |
| `npm run build` | Gera o build de produção |
| `npm run preview` | Visualiza o build de produção localmente |
| `npm run lint` | Executa o ESLint no projeto |

## Contribuindo

Pull requests são bem-vindos. Para mudanças maiores, abra uma issue primeiro.

## Licença 

Este projeto está sob a licença Apache 2.0. Veja o arquivo [LICENSE](/LICENSE) para mais detalhes.

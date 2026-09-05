import { tri, type UiLang } from "@/lib/ui-text";

/** Order is [pt-BR, en, es], the same as everywhere else here. */
export type Text = readonly [string, string, string];

export function say(lang: UiLang, text: Text) {
  return tri(lang, text[0], text[1], text[2]);
}

export type Param = {
  name: string;
  type: string;
  required?: boolean;
  note: Text;
};

export type Endpoint = {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  scope: string | null;
  bucket: "read" | "write" | "catalog";
  summary: Text;
  query?: Param[];
  body?: Param[];
  example?: string;
};

export type Resource = {
  slug: string;
  title: Text;
  blurb: Text;
  endpoints: Endpoint[];
};

const VISIBILITY: Text = [
  "PUBLIC, FOLLOWERS ou PRIVATE.",
  "PUBLIC, FOLLOWERS or PRIVATE.",
  "PUBLIC, FOLLOWERS o PRIVATE.",
];

const GAME_ID: Text = [
  "O id do jogo no catálogo.",
  "The game's catalog id.",
  "El id del juego en el catálogo.",
];

const GAME_SLUG: Text = [
  "O slug do jogo.",
  "The game's slug.",
  "El slug del juego.",
];

const PAGE_1000: Text = ["De 1 a 1000.", "1 to 1000.", "De 1 a 1000."];

const upTo = (n: number): Text => [
  `Até ${n} caracteres.`,
  `Up to ${n} characters.`,
  `Hasta ${n} caracteres.`,
];

const QUICK_FLAG: Text = [
  "Marcador rápido.",
  "Quick flag.",
  "Marcador rápido.",
];

const DATE: Text = ["AAAA-MM-DD.", "YYYY-MM-DD.", "AAAA-MM-DD."];

export const RESOURCES: Resource[] = [
  {
    slug: "identity",
    title: ["Identidade", "Identity", "Identidad"],
    blurb: [
      "O que uma chave é e a quem pertence. Responder isso não exige escopo nenhum, então uma integração sempre consegue descobrir o que está segurando.",
      "What a key is and who it belongs to. Answering this needs no scope, so an integration can always find out what it is holding.",
      "Qué es una llave y a quién pertenece. Responder esto no exige ningún permiso, así que una integración siempre puede averiguar qué tiene en la mano.",
    ],
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/me",
        scope: null,
        bucket: "read",
        summary: [
          "O id e os escopos da própria chave, e a conta por quem ela age.",
          "The key's own id and scopes, and the account it acts as.",
          "El id y los permisos de la propia llave, y la cuenta por la que actúa.",
        ],
        example: `{
  "key": { "id": "...", "scopes": ["catalog.read", "library.read"] },
  "owner": {
    "id": "...",
    "username": "ada",
    "display_name": "Ada",
    "created_at": "2026-01-04T12:00:00.000Z"
  }
}`,
      },
    ],
  },
  {
    slug: "catalog",
    title: ["Catálogo", "Catalog", "Catálogo"],
    blurb: [
      "Jogos, do mesmo catálogo que o site lê. É o único escopo que não toca o dado de ninguém, e funciona numa chave que não tem mais nada.",
      "Games, from the same catalog the site reads. This is the only scope that touches nobody's data, and it works on a key that holds nothing else.",
      "Juegos, del mismo catálogo que lee el sitio. Es el único permiso que no toca los datos de nadie, y funciona en una llave que no tiene nada más.",
    ],
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/games",
        scope: "catalog.read",
        bucket: "catalog",
        summary: [
          "Busca no catálogo.",
          "Search the catalog.",
          "Busca en el catálogo.",
        ],
        query: [
          {
            name: "q",
            type: "string",
            note: [
              "Texto livre, até 120 caracteres.",
              "Free text, up to 120 characters.",
              "Texto libre, hasta 120 caracteres.",
            ],
          },
          {
            name: "sort",
            type: "string",
            note: [
              "popular, rating, newest, oldest, hype ou name. Padrão: popular.",
              "popular, rating, newest, oldest, hype or name. Defaults to popular.",
              "popular, rating, newest, oldest, hype o name. Por defecto: popular.",
            ],
          },
          {
            name: "page",
            type: "integer",
            note: [
              "De 1 a 100. Padrão: 1.",
              "1 to 100. Defaults to 1.",
              "De 1 a 100. Por defecto: 1.",
            ],
          },
        ],
        example: `{
  "data": [
    {
      "id": 14593,
      "slug": "hollow-knight",
      "name": "Hollow Knight",
      "release_year": 2017,
      "rating": 92,
      "genres": ["Platform", "Adventure"]
    }
  ],
  "page": { "number": 1, "size": 24, "total_items": 812,
            "total_pages": 34, "has_more": true }
}`,
      },
      {
        method: "GET",
        path: "/api/v1/games/{slug}",
        scope: "catalog.read",
        bucket: "catalog",
        summary: [
          "Um jogo pelo slug.",
          "One game by its slug.",
          "Un juego por su slug.",
        ],
      },
    ],
  },
  {
    slug: "profile",
    title: ["Perfil", "Profile", "Perfil"],
    blurb: [
      "O perfil do próprio dono. Nenhum escopo aqui alcança o de outra pessoa.",
      "The owner's own profile. No scope here reaches anybody else's.",
      "El perfil del propio dueño. Ningún permiso aquí alcanza el de otra persona.",
    ],
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/profile",
        scope: "profile.read",
        bucket: "read",
        summary: [
          "O perfil do dono.",
          "The owner's profile.",
          "El perfil del dueño.",
        ],
      },
      {
        method: "PATCH",
        path: "/api/v1/profile",
        scope: "profile.write",
        bucket: "write",
        summary: [
          "Altera os campos de exibição. Mande só o que muda; o resto fica como está.",
          "Change the display fields. Send only what changes; the rest is left as it stands.",
          "Cambia los campos visibles. Envía solo lo que cambia; el resto queda como está.",
        ],
        body: [
          { name: "display_name", type: "string", note: upTo(60) },
          { name: "bio", type: "string", note: upTo(500) },
          { name: "pronouns", type: "string", note: upTo(40) },
          { name: "thought", type: "string", note: upTo(140) },
          { name: "youtube_username", type: "string", note: upTo(60) },
          { name: "instagram_username", type: "string", note: upTo(60) },
          { name: "twitter_username", type: "string", note: upTo(60) },
        ],
      },
    ],
  },
  {
    slug: "library",
    title: ["Biblioteca", "Library", "Biblioteca"],
    blurb: [
      "O que o dono está jogando, já jogou e quer jogar.",
      "What the owner is playing, has played, and wants to play.",
      "Lo que el dueño está jugando, ya jugó y quiere jugar.",
    ],
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/library",
        scope: "library.read",
        bucket: "read",
        summary: [
          "A biblioteca do dono, alteração mais recente primeiro.",
          "The owner's library, newest change first.",
          "La biblioteca del dueño, con el cambio más reciente primero.",
        ],
        query: [{ name: "page", type: "integer", note: PAGE_1000 }],
      },
      {
        method: "POST",
        path: "/api/v1/library",
        scope: "library.write",
        bucket: "write",
        summary: [
          "Adiciona ou altera um jogo. Pelo menos um entre status, nota ou marcador é obrigatório.",
          "Add or change one game. At least one of status, rating or a flag is required.",
          "Agrega o cambia un juego. Se exige al menos uno entre status, nota o marcador.",
        ],
        body: [
          { name: "igdb_id", type: "integer", required: true, note: GAME_ID },
          {
            name: "game_slug",
            type: "string",
            required: true,
            note: GAME_SLUG,
          },
          {
            name: "status",
            type: "string",
            note: [
              "BACKLOG, PLAYING, COMPLETED, DROPPED ou WISHLIST.",
              "BACKLOG, PLAYING, COMPLETED, DROPPED or WISHLIST.",
              "BACKLOG, PLAYING, COMPLETED, DROPPED o WISHLIST.",
            ],
          },
          {
            name: "rating",
            type: "integer",
            note: [
              "A nota rápida, de 10 a 100 em passos de 10. É a escala de um a dez que os cards mostram, guardada dez vezes maior.",
              "The quick rating, 10 to 100 in steps of 10. It is the one-to-ten scale the cards show, stored ten times larger.",
              "La nota rápida, de 10 a 100 en pasos de 10. Es la escala de uno a diez que muestran las tarjetas, guardada diez veces mayor.",
            ],
          },
          { name: "playing", type: "boolean", note: QUICK_FLAG },
          { name: "backlog", type: "boolean", note: QUICK_FLAG },
          { name: "wishlist", type: "boolean", note: QUICK_FLAG },
          { name: "liked", type: "boolean", note: QUICK_FLAG },
        ],
        example: `{
  "data": {
    "igdb_id": 14593,
    "game_slug": "hollow-knight",
    "status": "PLAYING",
    "quick_rating": 90
  }
}`,
      },
    ],
  },
  {
    slug: "reviews",
    title: ["Avaliações", "Reviews", "Reseñas"],
    blurb: [
      "As avaliações do dono.",
      "The owner's reviews.",
      "Las reseñas del dueño.",
    ],
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/reviews",
        scope: "reviews.read",
        bucket: "read",
        summary: [
          "As avaliações do dono, mais recentes primeiro.",
          "The owner's reviews, newest first.",
          "Las reseñas del dueño, las más recientes primero.",
        ],
        query: [{ name: "page", type: "integer", note: PAGE_1000 }],
      },
      {
        method: "POST",
        path: "/api/v1/reviews",
        scope: "reviews.write",
        bucket: "write",
        summary: [
          "Escreve uma avaliação. Responde 201.",
          "Write a review. Answers 201.",
          "Escribe una reseña. Responde 201.",
        ],
        body: [
          { name: "igdb_id", type: "integer", required: true, note: GAME_ID },
          {
            name: "game_slug",
            type: "string",
            required: true,
            note: GAME_SLUG,
          },
          {
            name: "content",
            type: "string",
            note: [
              "Markdown, até 5000 caracteres.",
              "Markdown, up to 5000 characters.",
              "Markdown, hasta 5000 caracteres.",
            ],
          },
          { name: "title", type: "string", note: upTo(80) },
          {
            name: "rating",
            type: "integer",
            note: ["De 0 a 100.", "0 to 100.", "De 0 a 100."],
          },
          {
            name: "rating_mode",
            type: "string",
            note: [
              "stars_5, level_5, score_10, score_100 ou recommend.",
              "stars_5, level_5, score_10, score_100 or recommend.",
              "stars_5, level_5, score_10, score_100 o recommend.",
            ],
          },
          { name: "visibility", type: "string", note: VISIBILITY },
          {
            name: "contains_spoilers",
            type: "boolean",
            note: [
              "Padrão: false.",
              "Defaults to false.",
              "Por defecto: false.",
            ],
          },
          {
            name: "platform",
            type: "string",
            note: [
              "Onde foi jogado.",
              "Where it was played.",
              "Dónde se jugó.",
            ],
          },
          { name: "started_on", type: "date", note: DATE },
          { name: "finished_on", type: "date", note: DATE },
        ],
      },
      {
        method: "PATCH",
        path: "/api/v1/reviews/{id}",
        scope: "reviews.write",
        bucket: "write",
        summary: [
          "Altera uma avaliação. O que não for enviado mantém o valor.",
          "Change a review. Anything left out keeps its value.",
          "Cambia una reseña. Lo que no se envía mantiene su valor.",
        ],
      },
      {
        method: "DELETE",
        path: "/api/v1/reviews/{id}",
        scope: "reviews.write",
        bucket: "write",
        summary: [
          "Remove uma avaliação.",
          "Remove a review.",
          "Elimina una reseña.",
        ],
      },
    ],
  },
  {
    slug: "journal",
    title: ["Diário", "Journal", "Diario"],
    blurb: [
      "Sessões, e as jornadas que as agrupam. Uma jornada é uma passagem por um jogo.",
      "Sessions, and the journeys that group them. A journey is one passage through a game.",
      "Sesiones, y los recorridos que las agrupan. Un recorrido es un paso por un juego.",
    ],
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/journal/entries",
        scope: "journal.read",
        bucket: "read",
        summary: [
          "Sessões registradas, as jogadas mais recentes primeiro.",
          "Logged sessions, most recently played first.",
          "Sesiones registradas, las jugadas más recientes primero.",
        ],
      },
      {
        method: "POST",
        path: "/api/v1/journal/entries",
        scope: "journal.write",
        bucket: "write",
        summary: [
          "Registra uma sessão. Responde 201.",
          "Log a session. Answers 201.",
          "Registra una sesión. Responde 201.",
        ],
        body: [
          { name: "igdb_id", type: "integer", required: true, note: GAME_ID },
          {
            name: "game_slug",
            type: "string",
            required: true,
            note: GAME_SLUG,
          },
          {
            name: "played_on",
            type: "date",
            note: [
              "AAAA-MM-DD. Padrão: hoje.",
              "YYYY-MM-DD. Defaults to today.",
              "AAAA-MM-DD. Por defecto: hoy.",
            ],
          },
          {
            name: "ended_on",
            type: "date",
            note: [
              "Para uma sessão que atravessa dias.",
              "For a session spanning days.",
              "Para una sesión que cruza días.",
            ],
          },
          {
            name: "minutes",
            type: "integer",
            note: ["De 0 a 100000.", "0 to 100000.", "De 0 a 100000."],
          },
          {
            name: "note",
            type: "string",
            note: [
              "Markdown, até 5000 caracteres.",
              "Markdown, up to 5000 characters.",
              "Markdown, hasta 5000 caracteres.",
            ],
          },
          { name: "visibility", type: "string", note: VISIBILITY },
          {
            name: "marks_start",
            type: "boolean",
            note: [
              "Esta sessão começou o jogo.",
              "This session started the game.",
              "Esta sesión empezó el juego.",
            ],
          },
          {
            name: "marks_finish",
            type: "boolean",
            note: [
              "Esta sessão terminou o jogo.",
              "This session finished it.",
              "Esta sesión lo terminó.",
            ],
          },
        ],
      },
      {
        method: "PATCH",
        path: "/api/v1/journal/entries/{id}",
        scope: "journal.write",
        bucket: "write",
        summary: [
          "Altera uma sessão.",
          "Change a session.",
          "Cambia una sesión.",
        ],
      },
      {
        method: "DELETE",
        path: "/api/v1/journal/entries/{id}",
        scope: "journal.write",
        bucket: "write",
        summary: [
          "Remove uma sessão.",
          "Remove a session.",
          "Elimina una sesión.",
        ],
      },
      {
        method: "GET",
        path: "/api/v1/journal/journeys",
        scope: "journal.read",
        bucket: "read",
        summary: [
          "As jornadas do dono.",
          "The owner's journeys.",
          "Los recorridos del dueño.",
        ],
      },
      {
        method: "PATCH",
        path: "/api/v1/journal/journeys/{id}",
        scope: "journal.write",
        bucket: "write",
        summary: [
          "Renomeia uma jornada.",
          "Rename a journey.",
          "Renombra un recorrido.",
        ],
        body: [
          {
            name: "title",
            type: "string",
            required: true,
            note: upTo(120),
          },
        ],
      },
      {
        method: "DELETE",
        path: "/api/v1/journal/journeys/{id}",
        scope: "journal.write",
        bucket: "write",
        summary: [
          "Remove uma jornada.",
          "Remove a journey.",
          "Elimina un recorrido.",
        ],
      },
    ],
  },
  {
    slug: "lists",
    title: ["Listas", "Lists", "Listas"],
    blurb: [
      "Coleções e rankings, e os jogos dentro deles.",
      "Collections and rankings, and the games in them.",
      "Colecciones y rankings, y los juegos que contienen.",
    ],
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/lists",
        scope: "lists.read",
        bucket: "read",
        summary: [
          "As listas do dono.",
          "The owner's lists.",
          "Las listas del dueño.",
        ],
      },
      {
        method: "POST",
        path: "/api/v1/lists",
        scope: "lists.write",
        bucket: "write",
        summary: [
          "Cria uma lista. Responde 201.",
          "Create a list. Answers 201.",
          "Crea una lista. Responde 201.",
        ],
        body: [
          {
            name: "name",
            type: "string",
            required: true,
            note: upTo(120),
          },
          { name: "description", type: "string", note: upTo(1000) },
          { name: "visibility", type: "string", note: VISIBILITY },
          {
            name: "ranked",
            type: "boolean",
            note: [
              "Um ranking em vez de uma coleção.",
              "A ranking rather than a collection.",
              "Un ranking en lugar de una colección.",
            ],
          },
        ],
      },
      {
        method: "GET",
        path: "/api/v1/lists/{id}",
        scope: "lists.read",
        bucket: "read",
        summary: [
          "Uma lista com seus itens. Aceita o id ou o id público, e traz `owned`, para o cliente saber se pode escrever antes de tentar.",
          "One list with its items. Accepts the id or the public id, and carries `owned` so a client knows whether it may write.",
          "Una lista con sus elementos. Acepta el id o el id público, y trae `owned` para que el cliente sepa si puede escribir.",
        ],
      },
      {
        method: "PATCH",
        path: "/api/v1/lists/{id}",
        scope: "lists.write",
        bucket: "write",
        summary: [
          "Renomeia uma lista ou altera descrição, visibilidade e ordenação.",
          "Rename a list or change its description, visibility or ranking.",
          "Renombra una lista o cambia su descripción, visibilidad u orden.",
        ],
      },
      {
        method: "DELETE",
        path: "/api/v1/lists/{id}",
        scope: "lists.write",
        bucket: "write",
        summary: ["Remove uma lista.", "Remove a list.", "Elimina una lista."],
      },
      {
        method: "POST",
        path: "/api/v1/lists/{id}/items",
        scope: "lists.write",
        bucket: "write",
        summary: [
          "Adiciona um jogo a uma lista. Responde 201.",
          "Add a game to a list. Answers 201.",
          "Agrega un juego a una lista. Responde 201.",
        ],
        body: [
          { name: "igdb_id", type: "integer", required: true, note: GAME_ID },
          {
            name: "game_slug",
            type: "string",
            required: true,
            note: GAME_SLUG,
          },
        ],
      },
    ],
  },
  {
    slug: "screenshots",
    title: ["Capturas", "Screenshots", "Capturas"],
    blurb: [
      "As capturas do dono. Publicar uma é o único lugar em que esta API recebe um formulário em vez de JSON, porque uma imagem são bytes.",
      "The owner's captures. Publishing one is the single place this API takes a form instead of JSON, because a picture is bytes.",
      "Las capturas del dueño. Publicar una es el único lugar donde esta API recibe un formulario en vez de JSON, porque una imagen son bytes.",
    ],
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/screenshots",
        scope: "screenshots.read",
        bucket: "read",
        summary: [
          "As capturas do dono, mais recentes primeiro. As removidas ficam de fora.",
          "The owner's screenshots, newest first. Removed ones are left out.",
          "Las capturas del dueño, las más recientes primero. Las eliminadas quedan fuera.",
        ],
      },
      {
        method: "POST",
        path: "/api/v1/screenshots",
        scope: "screenshots.write",
        bucket: "write",
        summary: [
          "Publica uma imagem, como multipart/form-data e não JSON. Ela é reconvertida para WebP e cabida dentro de 2560 por 2560, nunca ampliada. Responde 201. Uma conta pode publicar vinte por hora, contadas à parte da cota da chave, porque imagem custa armazenamento e não uma linha.",
          "Publish a picture, as multipart/form-data rather than JSON. It is re-encoded to WebP and fitted inside 2560 by 2560, never enlarged. Answers 201. An account may publish twenty an hour, counted apart from the key's allowance because a picture costs storage rather than a row.",
          "Publica una imagen, como multipart/form-data y no JSON. Se reconvierte a WebP y se ajusta dentro de 2560 por 2560, nunca se amplía. Responde 201. Una cuenta puede publicar veinte por hora, contadas aparte de la cuota de la llave, porque una imagen cuesta almacenamiento y no una fila.",
        ],
        body: [
          {
            name: "image",
            type: "file",
            required: true,
            note: [
              "JPEG, PNG ou WebP. No mínimo 160 por 160, no máximo 12 MB.",
              "JPEG, PNG or WebP. At least 160 by 160, at most 12 MB.",
              "JPEG, PNG o WebP. Mínimo 160 por 160, máximo 12 MB.",
            ],
          },
          { name: "igdb_id", type: "integer", required: true, note: GAME_ID },
          {
            name: "game_slug",
            type: "string",
            required: true,
            note: GAME_SLUG,
          },
          { name: "description", type: "string", note: upTo(2200) },
          { name: "visibility", type: "string", note: VISIBILITY },
          {
            name: "contains_spoilers",
            type: "string",
            note: [
              'Campos de formulário são texto, então aqui vai a palavra "true" e não um booleano.',
              'Form fields are text, so this is the word "true" rather than a boolean.',
              'Los campos de formulario son texto, así que aquí va la palabra "true" y no un booleano.',
            ],
          },
          {
            name: "sensitive",
            type: "string",
            note: [
              'Também a palavra "true".',
              'Likewise the word "true".',
              'También la palabra "true".',
            ],
          },
        ],
        example: `curl https://uloggd.com/api/v1/screenshots \\
  -H "Authorization: Bearer ulg_live_..." \\
  -F image=@shot.png \\
  -F igdb_id=14593 \\
  -F game_slug=hollow-knight \\
  -F "description=The first time the city opens up"`,
      },
      {
        method: "DELETE",
        path: "/api/v1/screenshots/{id}",
        scope: "screenshots.write",
        bucket: "write",
        summary: [
          "Remove uma imagem, da listagem e do serviço onde ela estava hospedada.",
          "Remove a picture, from the listing and from the image host it was stored on.",
          "Elimina una imagen, del listado y del servicio donde estaba alojada.",
        ],
      },
    ],
  },
  {
    slug: "social",
    title: ["Social", "Social", "Social"],
    blurb: [
      "Com quem o dono está conectado. Este escopo diz quem, nunca o que essas contas têm.",
      "Who the owner is connected to. This scope says who, never what those accounts hold.",
      "Con quién está conectado el dueño. Este permiso dice quién, nunca qué tienen esas cuentas.",
    ],
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/social/followers",
        scope: "social.read",
        bucket: "read",
        summary: [
          "Contas que seguem o dono.",
          "Accounts following the owner.",
          "Cuentas que siguen al dueño.",
        ],
      },
      {
        method: "GET",
        path: "/api/v1/social/following",
        scope: "social.read",
        bucket: "read",
        summary: [
          "Contas que o dono segue.",
          "Accounts the owner follows.",
          "Cuentas que el dueño sigue.",
        ],
      },
      {
        method: "PUT",
        path: "/api/v1/social/following/{username}",
        scope: "social.write",
        bucket: "write",
        summary: [
          "Segue uma conta. Fazer duas vezes não muda nada.",
          "Follow an account. Doing it twice changes nothing.",
          "Sigue una cuenta. Hacerlo dos veces no cambia nada.",
        ],
      },
      {
        method: "DELETE",
        path: "/api/v1/social/following/{username}",
        scope: "social.write",
        bucket: "write",
        summary: [
          "Deixa de seguir uma conta.",
          "Unfollow an account.",
          "Deja de seguir una cuenta.",
        ],
      },
    ],
  },
];

export const ERROR_CODES: { code: string; status: number; note: Text }[] = [
  {
    code: "unauthorized",
    status: 401,
    note: [
      "O dono da chave não pode fazer isso.",
      "The key's owner may not do that.",
      "El dueño de la llave no puede hacer eso.",
    ],
  },
  {
    code: "invalid_key",
    status: 401,
    note: [
      "Desconhecida, revogada ou expirada. As três não são distinguidas.",
      "Unknown, revoked or expired. The three are not told apart.",
      "Desconocida, revocada o expirada. Las tres no se distinguen.",
    ],
  },
  {
    code: "insufficient_scope",
    status: 403,
    note: [
      "A chave não tem o escopo, que vem nomeado no corpo.",
      "The key does not hold the scope, which is named in the body.",
      "La llave no tiene el permiso, que viene nombrado en el cuerpo.",
    ],
  },
  {
    code: "not_found",
    status: 404,
    note: [
      "Não existe, ou não é algo que o dono possa ver.",
      "No such resource, or none the owner can see.",
      "No existe, o no es algo que el dueño pueda ver.",
    ],
  },
  {
    code: "invalid_request",
    status: 400,
    note: [
      "Falta um campo ou ele não é aceito. A mensagem diz qual.",
      "A field is missing or not allowed. The message says which.",
      "Falta un campo o no se acepta. El mensaje dice cuál.",
    ],
  },
  {
    code: "conflict",
    status: 409,
    note: ["Isso já existe.", "That already exists.", "Eso ya existe."],
  },
  {
    code: "rate_limited",
    status: 429,
    note: [
      "Traz retry_after em segundos.",
      "Carries retry_after in seconds.",
      "Trae retry_after en segundos.",
    ],
  },
  {
    code: "internal",
    status: 500,
    note: [
      "Algo falhou aqui. Nada sobre o schema é dito.",
      "Something failed here. Nothing about the schema is said.",
      "Algo falló aquí. No se dice nada sobre el esquema.",
    ],
  },
];

export const BUCKETS: { name: string; ceiling: number; note: Text }[] = [
  {
    name: "read",
    ceiling: 600,
    note: [
      "Toda leitura fora do catálogo.",
      "Every read outside the catalog.",
      "Toda lectura fuera del catálogo.",
    ],
  },
  {
    name: "write",
    ceiling: 60,
    note: [
      "Toda criação, alteração e remoção.",
      "Every create, change and removal.",
      "Toda creación, cambio y eliminación.",
    ],
  },
  {
    name: "catalog",
    ceiling: 1000,
    note: [
      "Consultas ao catálogo, contadas à parte porque custam ao catálogo e não ao banco.",
      "Catalog lookups, counted apart because they cost the catalog rather than the database.",
      "Consultas al catálogo, contadas aparte porque cuestan al catálogo y no a la base.",
    ],
  },
];

export const DOCS_GUIDES = [
  "authentication",
  "scopes",
  "limits",
  "errors",
  "pagination",
  "versioning",
];

/** The same order as DOCS_GUIDES, with the overview first. */
export const DOCS_GUIDE_TITLES: { slug: string; title: Text }[] = [
  { slug: "", title: ["Visão geral", "Overview", "Visión general"] },
  {
    slug: "authentication",
    title: ["Autenticação", "Authentication", "Autenticación"],
  },
  { slug: "scopes", title: ["Escopos", "Scopes", "Permisos"] },
  {
    slug: "limits",
    title: ["Limites de uso", "Rate limits", "Límites de uso"],
  },
  { slug: "errors", title: ["Erros", "Errors", "Errores"] },
  {
    slug: "pagination",
    title: ["Paginação", "Pagination", "Paginación"],
  },
  {
    slug: "versioning",
    title: ["Versionamento", "Versioning", "Versionado"],
  },
];

/**
 * Every path under /developers that exists, one segment or two.
 *
 * The proxy answers an unknown one, because a page that calls notFound() after
 * the layout has begun streaming renders a 404 body with a 200 status. A unit
 * test holds this against the files on disk, so a page can be added without
 * being reachable only by remembering to add it here too.
 */
export const DOCS_SECTIONS = new Set([
  ...DOCS_GUIDES,
  "resources",
  ...RESOURCES.map((resource) => "resources/" + resource.slug),
]);

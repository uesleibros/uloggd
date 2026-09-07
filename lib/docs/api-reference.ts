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

const SWITCH: Text = [
  "Verdadeiro para receber, falso para não.",
  "True to be told, false not to be.",
  "Verdadero para recibir, falso para no.",
];

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
          "O id e os escopos da própria chave, e a conta por quem ela age. key vem null quando quem chama é uma sessão do site, e não uma chave.",
          "The key's own id and scopes, and the account it acts as. key is null when the caller is a signed-in session on the website rather than a key.",
          "El id y los permisos de la propia llave, y la cuenta por la que actúa. key viene null cuando quien llama es una sesión del sitio y no una llave.",
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
        method: "GET",
        path: "/api/v1/profile/images",
        scope: "profile.read",
        bucket: "read",
        summary: [
          "As fotos que a conta já usou, para poder voltar a uma sem procurar o arquivo de novo. Subir uma nova é trabalho do pipeline de imagens, não daqui.",
          "The pictures the account has used before, so one can be gone back to without finding the file again. Putting a new one up is the image pipeline's job, not this one's.",
          "Las fotos que la cuenta ya usó, para poder volver a una sin buscar el archivo otra vez. Subir una nueva es trabajo del pipeline de imágenes, no de aquí.",
        ],
        query: [
          {
            name: "kind",
            type: "string",
            required: true,
            note: [
              "AVATAR ou BANNER.",
              "AVATAR or BANNER.",
              "AVATAR o BANNER.",
            ],
          },
        ],
      },
      {
        method: "DELETE",
        path: "/api/v1/profile/images/{id}",
        scope: "profile.write",
        bucket: "write",
        summary: [
          "Esquece uma foto antiga. A que está no perfil agora continua onde está.",
          "Forgets an old picture. The one on the profile right now stays where it is.",
          "Olvida una foto antigua. La que está en el perfil ahora se queda donde está.",
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
          {
            name: "library_visibility",
            type: "string",
            note: [
              "Quem vê a biblioteca: PUBLIC, FOLLOWERS ou PRIVATE. É do perfil, e não de cada jogo.",
              "Who sees the library: PUBLIC, FOLLOWERS or PRIVATE. It belongs to the profile, not to each game.",
              "Quién ve la biblioteca: PUBLIC, FOLLOWERS o PRIVATE. Es del perfil, no de cada juego.",
            ],
          },
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
              "BACKLOG, PLAYING, ON_HOLD, COMPLETED, DROPPED ou WISHLIST.",
              "BACKLOG, PLAYING, ON_HOLD, COMPLETED, DROPPED or WISHLIST.",
              "BACKLOG, PLAYING, ON_HOLD, COMPLETED, DROPPED o WISHLIST.",
            ],
          },
          {
            name: "rating",
            type: "integer",
            note: [
              "A nota rápida, de 10 a 100 em passos de 10. É a escala de um a dez que os cards mostram, guardada dez vezes maior. Envie null para apagar a nota.",
              "The quick rating, 10 to 100 in steps of 10. It is the one-to-ten scale the cards show, stored ten times larger. Send null to clear it.",
              "La nota rápida, de 10 a 100 en pasos de 10. Es la escala de uno a diez que muestran las tarjetas, guardada diez veces mayor. Envía null para borrarla.",
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
      {
        method: "PATCH",
        path: "/api/v1/library/{igdb_id}",
        scope: "library.write",
        bucket: "write",
        summary: [
          "Altera um jogo que já está na biblioteca. Aceita os mesmos campos do POST, sem game_slug: a linha já diz qual jogo é. Um jogo que ainda não está lá responde 404, e entra pelo POST.",
          "Change a game already in the library. It takes the same fields as the POST, without game_slug: the row already says which game it is. A game that is not there yet answers 404, and goes in through the POST.",
          "Cambia un juego que ya está en la biblioteca. Acepta los mismos campos que el POST, sin game_slug: la fila ya dice qué juego es. Un juego que aún no está responde 404, y entra por el POST.",
        ],
        body: [
          {
            name: "cover_url",
            type: "string",
            note: [
              "A capa escolhida para este jogo. Só vale um endereço em https://images.igdb.com/, de até 2048 caracteres: a capa vem do catálogo, não de qualquer lugar. Vale só para o dono; ninguém mais vê a troca.",
              "The cover chosen for this game. Only an address under https://images.igdb.com/ is accepted, up to 2048 characters: a cover comes from the catalog rather than from anywhere. It applies to the owner alone; nobody else sees the change.",
              "La portada elegida para este juego. Solo vale una dirección bajo https://images.igdb.com/, de hasta 2048 caracteres: la portada viene del catálogo, no de cualquier sitio. Vale solo para el dueño; nadie más ve el cambio.",
            ],
          },
        ],
      },
      {
        method: "DELETE",
        path: "/api/v1/library/{igdb_id}",
        scope: "library.write",
        bucket: "write",
        summary: [
          "Tira um jogo da biblioteca, com a nota e os marcadores dele.",
          "Take a game out of the library, with its rating and its flags.",
          "Saca un juego de la biblioteca, con su nota y sus marcadores.",
        ],
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
          {
            name: "journey_id",
            type: "string",
            note: [
              "A jornada que esta avaliação fecha. Tem de ser uma jornada sua e do mesmo jogo.",
              "The journey this review closes. It has to be your own journey, on the same game.",
              "El recorrido que esta reseña cierra. Debe ser un recorrido tuyo y del mismo juego.",
            ],
          },
          {
            name: "aspects",
            type: "array",
            note: [
              "As partes pontuadas, até 12, cada uma com label, rating e um note opcional. São escritas na mesma transação da avaliação, então nunca existe uma avaliação com metade delas.",
              "The scored parts, up to 12, each with a label, a rating and an optional note. They are written in the same transaction as the review, so a review never exists with half of them attached.",
              "Las partes puntuadas, hasta 12, cada una con label, rating y un note opcional. Se escriben en la misma transacción que la reseña, así que nunca existe una reseña con la mitad de ellas.",
            ],
          },
        ],
      },
      {
        method: "PATCH",
        path: "/api/v1/reviews/{id}",
        scope: "reviews.write",
        bucket: "write",
        summary: [
          "Altera uma avaliação. Aceita os mesmos campos do POST, sem igdb_id nem game_slug. O que não for enviado mantém o valor, com uma exceção: aspects é reescrito inteiro, porque as partes só fazem sentido como um conjunto. comments_scope aceita EVERYONE, FOLLOWERS ou NOBODY e decide quem pode responder.",
          "Change a review. It takes the same fields as the POST, without igdb_id or game_slug. Anything left out keeps its value, with one exception: aspects is rewritten whole, because the parts only mean anything as a set. comments_scope takes EVERYONE, FOLLOWERS or NOBODY and decides who may reply.",
          "Cambia una reseña. Acepta los mismos campos que el POST, sin igdb_id ni game_slug. Lo que no se envía mantiene su valor, con una excepción: aspects se reescribe entero, porque las partes solo significan algo como conjunto. comments_scope acepta EVERYONE, FOLLOWERS o NOBODY y decide quién puede responder.",
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
          {
            name: "started_at",
            type: "string",
            note: [
              "A hora em que a sessão começou, HH:MM ou HH:MM:SS. Opcional: um dia inteiro também é uma sessão.",
              "The time of day the session began, HH:MM or HH:MM:SS. Optional: a whole day is a session too.",
              "La hora en que empezó la sesión, HH:MM o HH:MM:SS. Opcional: un día entero también es una sesión.",
            ],
          },
          {
            name: "journey_id",
            type: "string",
            note: [
              "A jornada a que esta sessão pertence. Tem de ser uma jornada sua e do mesmo jogo; sem ela a sessão fica solta.",
              "The journey this session belongs to. It has to be your own journey, on the same game; without it the session stands loose.",
              "El recorrido al que pertenece esta sesión. Debe ser un recorrido tuyo y del mismo juego; sin él la sesión queda suelta.",
            ],
          },
          {
            name: "comments_scope",
            type: "string",
            note: [
              "Quem pode responder: EVERYONE, FOLLOWERS ou NOBODY.",
              "Who may reply: EVERYONE, FOLLOWERS or NOBODY.",
              "Quién puede responder: EVERYONE, FOLLOWERS o NOBODY.",
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
          "Altera uma sessão. Aceita os mesmos campos do POST, sem igdb_id nem game_slug, e mais dois que só fazem sentido depois que a sessão existe.",
          "Change a session. It takes the same fields as the POST, without igdb_id or game_slug, plus two that only make sense once the session exists.",
          "Cambia una sesión. Acepta los mismos campos que el POST, sin igdb_id ni game_slug, y dos más que solo tienen sentido una vez que la sesión existe.",
        ],
        body: [
          {
            name: "sensitive",
            type: "boolean",
            note: [
              "Esconde as imagens atrás de um aviso. Desligar isso não apaga o registro de uma marca automática: é o que deixa a decisão revisável depois.",
              "Hides the images behind a warning. Turning it off does not erase the record of an automatic mark: that is what leaves the decision reviewable afterwards.",
              "Esconde las imágenes tras un aviso. Apagarlo no borra el registro de una marca automática: es lo que deja la decisión revisable después.",
            ],
          },
          {
            name: "image_order",
            type: "array",
            note: [
              "Os ids das imagens da sessão, na ordem em que devem aparecer, até 12. As imagens em si entram pelo site; aqui só se ordena o que já está lá.",
              "The ids of the session's images, in the order they should appear, up to 12. The images themselves are added on the website; this only orders what is already there.",
              "Los ids de las imágenes de la sesión, en el orden en que deben aparecer, hasta 12. Las imágenes entran por el sitio; aquí solo se ordena lo que ya está.",
            ],
          },
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
        method: "PUT",
        path: "/api/v1/journal/days",
        scope: "journal.write",
        bucket: "write",
        summary: [
          "Marca vários dias de uma vez como jogados, sem descrever nenhum deles. É o traço no calendário: um dia já coberto por uma sessão é deixado como está, e added conta o que mudou, não o que foi pedido.",
          "Mark several days at once as played, without describing any of them. It is the stroke across the calendar: a day already covered by a session is left alone, and added counts what changed rather than what was asked for.",
          "Marca varios días de una vez como jugados, sin describir ninguno. Es el trazo en el calendario: un día ya cubierto por una sesión se deja como está, y added cuenta lo que cambió, no lo que se pidió.",
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
            name: "days",
            type: "array",
            required: true,
            note: [
              "De 1 a 366 datas como YYYY-MM-DD. Nenhuma pode estar no futuro.",
              "1 to 366 dates as YYYY-MM-DD. None of them may be in the future.",
              "De 1 a 366 fechas como YYYY-MM-DD. Ninguna puede estar en el futuro.",
            ],
          },
          {
            name: "journey_id",
            type: "string",
            note: [
              "A jornada a que os dias pertencem. Sem ela, ficam soltos.",
              "The journey the days belong to. Without it, they stand loose.",
              "El recorrido al que pertenecen los días. Sin él, quedan sueltos.",
            ],
          },
        ],
        example: `{
  "data": { "igdb_id": 14593, "days": ["2026-09-01", "2026-09-02"], "added": 1 }
}`,
      },
      {
        method: "DELETE",
        path: "/api/v1/journal/days",
        scope: "journal.write",
        bucket: "write",
        summary: [
          "Apaga as sessões que cobrem esses dias. Vai por parâmetro e não por corpo, porque um DELETE com corpo não atravessa toda intermediária.",
          "Remove the sessions covering those days. It goes by parameter rather than by body, because a DELETE with a body does not survive every intermediary.",
          "Elimina las sesiones que cubren esos días. Va por parámetro y no por cuerpo, porque un DELETE con cuerpo no atraviesa a todo intermediario.",
        ],
        query: [
          { name: "igdb_id", type: "integer", required: true, note: GAME_ID },
          {
            name: "days",
            type: "string",
            required: true,
            note: [
              "As datas separadas por vírgula, de 1 a 366.",
              "The dates separated by commas, 1 to 366 of them.",
              "Las fechas separadas por comas, de 1 a 366.",
            ],
          },
          {
            name: "journey_id",
            type: "string",
            note: [
              "Limita a remoção às sessões dessa jornada.",
              "Limits the removal to that journey's sessions.",
              "Limita la eliminación a las sesiones de ese recorrido.",
            ],
          },
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
        method: "POST",
        path: "/api/v1/journal/journeys",
        scope: "journal.write",
        bucket: "write",
        summary: [
          "Abre uma jornada num jogo. Responde 201.",
          "Start a journey through a game. Answers 201.",
          "Abre un recorrido en un juego. Responde 201.",
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
            name: "title",
            type: "string",
            required: true,
            note: upTo(120),
          },
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
            note: upTo(100),
          },
          { name: "description", type: "string", note: upTo(500) },
          {
            name: "kind",
            type: "string",
            note: [
              "COLLECTION ou TIERLIST. Uma TIERLIST já nasce com cinco faixas: uma criada sem elas não teria onde pôr nada.",
              "COLLECTION or TIERLIST. A TIERLIST is born with five rows: one made without them would have nowhere to put anything.",
              "COLLECTION o TIERLIST. Una TIERLIST nace con cinco filas: una creada sin ellas no tendría dónde poner nada.",
            ],
          },
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
          "Renomeia uma lista ou altera descrição, visibilidade, ordenação e comments_scope, que aceita EVERYONE, FOLLOWERS ou NOBODY.",
          "Rename a list or change its description, visibility, ranking or comments_scope, which takes EVERYONE, FOLLOWERS or NOBODY.",
          "Renombra una lista o cambia su descripción, visibilidad, orden o comments_scope, que acepta EVERYONE, FOLLOWERS o NOBODY.",
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
        method: "PUT",
        path: "/api/v1/lists/{id}/tiers",
        scope: "lists.write",
        bucket: "write",
        summary: [
          "Salva as faixas de uma tierlist e onde cada jogo está, de uma vez. Não é um PATCH por item: uma tierlist só faz sentido inteira, e salvar uma faixa e o conteúdo dela separadamente deixaria um instante em que um jogo está numa faixa que ninguém definiu.",
          "Saves a tierlist's rows and where every game sits, all at once. Not a PATCH per item: a tierlist is only meaningful whole, and saving a row and its contents separately would leave a moment where a game is in a tier nobody defined.",
          "Guarda las filas de una tierlist y dónde está cada juego, de una vez. No es un PATCH por elemento: una tierlist solo tiene sentido entera, y guardar una fila y su contenido por separado dejaría un instante en que un juego está en una fila que nadie definió.",
        ],
        body: [
          {
            name: "tiers",
            type: "array",
            required: true,
            note: [
              "As faixas, cada uma com id, label, color e position. O id é seu, e não do banco: as faixas são reescritas inteiras a cada salvamento, e são os itens que precisam nomeá-las. Até 26.",
              "The rows, each with an id, a label, a color and a position. The id is yours rather than the database's: the rows are rewritten whole on every save, and it is the items that need to name them. Up to 26.",
              "Las filas, cada una con id, label, color y position. El id es tuyo y no de la base: las filas se reescriben enteras en cada guardado, y son los elementos los que necesitan nombrarlas. Hasta 26.",
            ],
          },
          {
            name: "items",
            type: "array",
            required: true,
            note: [
              "Cada jogo, com tier_id, igdb_id, game_slug e position. Um jogo que saiu da biblioteca do dono, ou cujo tier_id não está entre as faixas enviadas, é ignorado em silêncio em vez de derrubar o salvamento. Até 1000.",
              "Each game, with a tier_id, an igdb_id, a game_slug and a position. A game that has left the owner's library, or whose tier_id is not among the rows sent, is skipped quietly rather than failing the save. Up to 1000.",
              "Cada juego, con tier_id, igdb_id, game_slug y position. Un juego que salió de la biblioteca del dueño, o cuyo tier_id no está entre las filas enviadas, se omite en silencio en vez de tumbar el guardado. Hasta 1000.",
            ],
          },
        ],
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
      {
        method: "PATCH",
        path: "/api/v1/lists/{id}/items/{item_id}",
        scope: "lists.write",
        bucket: "write",
        summary: [
          "Anota um item ou o move de lugar. Posição e direção são dois jeitos de dizer a mesma coisa, então mande um ou outro.",
          "Note an item or move it. Position and direction are two ways of saying the same thing, so send one or the other.",
          "Anota un elemento o lo mueve. Posición y dirección son dos formas de decir lo mismo, así que envía una u otra.",
        ],
        body: [
          { name: "note", type: "string", note: upTo(500) },
          {
            name: "position",
            type: "integer",
            note: [
              "A posição exata, contando de 0.",
              "The exact position, counting from 0.",
              "La posición exacta, contando desde 0.",
            ],
          },
          {
            name: "direction",
            type: "string",
            note: [
              "up, down ou top, para mover sem saber a posição.",
              "up, down or top, to move without knowing the position.",
              "up, down o top, para mover sin saber la posición.",
            ],
          },
        ],
      },
      {
        method: "DELETE",
        path: "/api/v1/lists/{id}/items/{item_id}",
        scope: "lists.write",
        bucket: "write",
        summary: [
          "Tira um jogo da lista.",
          "Take a game out of the list.",
          "Saca un juego de la lista.",
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
        method: "PATCH",
        path: "/api/v1/screenshots/{id}",
        scope: "screenshots.write",
        bucket: "write",
        summary: [
          "Altera a descrição, os avisos, a visibilidade ou comments_scope. A imagem em si não muda: para trocá-la, publique outra e remova esta.",
          "Change the description, the warnings, the visibility or comments_scope. The picture itself does not change: to replace it, publish another and remove this one.",
          "Cambia la descripción, los avisos, la visibilidad o comments_scope. La imagen en sí no cambia: para reemplazarla, publica otra y elimina esta.",
        ],
        body: [
          { name: "description", type: "string", note: upTo(2200) },
          {
            name: "contains_spoilers",
            type: "boolean",
            note: [
              "Aqui é JSON, então é um booleano de verdade.",
              "This one is JSON, so it is a real boolean.",
              "Aquí es JSON, así que es un booleano de verdad.",
            ],
          },
          {
            name: "sensitive",
            type: "boolean",
            note: [
              "Aqui é JSON, então é um booleano de verdade.",
              "This one is JSON, so it is a real boolean.",
              "Aquí es JSON, así que es un booleano de verdad.",
            ],
          },
          { name: "visibility", type: "string", note: VISIBILITY },
        ],
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
        method: "GET",
        path: "/api/v1/social/blocks",
        scope: "social.read",
        bucket: "read",
        summary: [
          "Quem o dono bloqueou. A direção contrária não existe: uma conta lê os bloqueios que fez, nunca os que sofreu.",
          "Who the owner has blocked. The other direction does not exist: an account reads the blocks it made, never the ones made against it.",
          "A quién ha bloqueado el dueño. La dirección contraria no existe: una cuenta lee los bloqueos que hizo, nunca los que recibió.",
        ],
        query: [
          { name: "page", type: "integer", note: PAGE_1000 },
          {
            name: "q",
            type: "string",
            note: [
              "Filtra por nome de usuário ou nome de exibição.",
              "Filters by username or display name.",
              "Filtra por nombre de usuario o nombre visible.",
            ],
          },
        ],
      },
      {
        method: "PUT",
        path: "/api/v1/social/following/{username}",
        scope: "social.write",
        bucket: "write",
        summary: [
          "Segue uma conta, ou pede para seguir se ela for privada. A resposta traz following e requested, e só um dos dois é verdadeiro. Fazer duas vezes não muda nada.",
          "Follow an account, or ask to if it is private. The answer carries following and requested, and only one of them is true. Doing it twice changes nothing.",
          "Sigue una cuenta, o pide seguirla si es privada. La respuesta trae following y requested, y solo uno de los dos es verdadero. Hacerlo dos veces no cambia nada.",
        ],
      },
      {
        method: "DELETE",
        path: "/api/v1/social/following/{username}",
        scope: "social.write",
        bucket: "write",
        summary: [
          "Deixa de seguir uma conta, ou retira o pedido que ainda não foi respondido.",
          "Unfollow an account, or withdraw a request that has not been answered.",
          "Deja de seguir una cuenta, o retira la solicitud que aún no fue respondida.",
        ],
      },
      {
        method: "PUT",
        path: "/api/v1/social/blocks/{username}",
        scope: "social.write",
        bucket: "write",
        summary: [
          "Bloqueia uma conta. Isso também desfaz o seguir nos dois sentidos, o que é decisão do banco e não desta rota.",
          "Block an account. That also undoes following in both directions, which is the database's doing rather than this route's.",
          "Bloquea una cuenta. Eso también deshace el seguimiento en ambos sentidos, lo que decide la base de datos y no esta ruta.",
        ],
      },
      {
        method: "DELETE",
        path: "/api/v1/social/blocks/{username}",
        scope: "social.write",
        bucket: "write",
        summary: [
          "Desbloqueia uma conta. Seguir de volta não é automático.",
          "Unblock an account. Following is not restored on its own.",
          "Desbloquea una cuenta. Seguir no se restaura por sí solo.",
        ],
      },
      {
        method: "GET",
        path: "/api/v1/social/follow-requests",
        scope: "social.read",
        bucket: "read",
        summary: [
          "Quem pediu para seguir uma conta privada e ainda está esperando. Só essa direção existe: o que esta conta pediu a outras é a fila delas para responder, e listá-la aqui seria ler uma decisão que ninguém tomou.",
          "Who has asked to follow a private account and is still waiting. Only that direction exists: what this account has asked of others is their queue to answer, and listing it here would be reading a decision nobody has made.",
          "Quién pidió seguir una cuenta privada y aún espera. Solo esa dirección existe: lo que esta cuenta pidió a otras es la cola de ellas, y listarla aquí sería leer una decisión que nadie tomó.",
        ],
        query: [
          { name: "page", type: "integer", note: PAGE_1000 },
          {
            name: "q",
            type: "string",
            note: [
              "Filtra por nome de usuário ou nome de exibição.",
              "Filters by username or display name.",
              "Filtra por nombre de usuario o nombre visible.",
            ],
          },
        ],
      },
      {
        method: "PUT",
        path: "/api/v1/social/follow-requests/{username}",
        scope: "social.write",
        bucket: "write",
        summary: [
          "Aceita um pedido. Quem não estava esperando responde 404, em vez de um sucesso silencioso: aprovar um pedido que foi retirado não devia parecer aprovado.",
          "Accepts a request. An account that was not waiting answers 404 rather than a silent success: approving a request that was withdrawn should not read as approved.",
          "Acepta una solicitud. Quien no estaba esperando responde 404, en vez de un éxito silencioso: aprobar una solicitud retirada no debería leerse como aprobada.",
        ],
      },
      {
        method: "DELETE",
        path: "/api/v1/social/follow-requests/{username}",
        scope: "social.write",
        bucket: "write",
        summary: [
          "Recusa um pedido. Some da fila dos dois jeitos; só aceitar cria o seguir.",
          "Declines a request. It leaves the queue either way; only accepting creates the follow.",
          "Rechaza una solicitud. Sale de la cola de las dos formas; solo aceptar crea el seguimiento.",
        ],
      },
      {
        method: "POST",
        path: "/api/v1/reports",
        scope: "social.write",
        bucket: "write",
        summary: [
          "Conta à moderação sobre alguma coisa. Não existe lado de leitura, e não vai existir: uma denúncia é um recado para quem cuida delas, e deixar ver o andamento (ou deixar contar quantas vezes uma conta foi denunciada) transforma a fila em arma. A resposta diz que chegou, e nada mais.",
          "Tell moderation about something. There is no read side and there will not be one: a report is a message to the people who handle them, and letting the progress be watched (or letting anyone count how often an account has been reported) turns the queue into a weapon. The answer says it arrived, and nothing else.",
          "Avisa a moderación sobre algo. No hay lado de lectura, y no lo habrá: una denuncia es un recado para quienes las atienden, y dejar ver su avance (o dejar contar cuántas veces se denunció una cuenta) convierte la cola en un arma. La respuesta dice que llegó, y nada más.",
        ],
        body: [
          {
            name: "on",
            type: "string",
            required: true,
            note: [
              "PROFILE, REVIEW, LIST, SCREENSHOT, DIARY, PROFILE_COMMENT ou CONTENT_COMMENT.",
              "PROFILE, REVIEW, LIST, SCREENSHOT, DIARY, PROFILE_COMMENT or CONTENT_COMMENT.",
              "PROFILE, REVIEW, LIST, SCREENSHOT, DIARY, PROFILE_COMMENT o CONTENT_COMMENT.",
            ],
          },
          {
            name: "username",
            type: "string",
            required: true,
            note: [
              "A conta de quem publicou. Uma denúncia nomeia a conta de que trata, mesmo quando é sobre um conteúdo dela.",
              "The account that published it. A report names the account it is about, even when it is about something that account published.",
              "La cuenta que lo publicó. Una denuncia nombra la cuenta de la que trata, incluso cuando es sobre algo que esa cuenta publicó.",
            ],
          },
          {
            name: "reason",
            type: "string",
            required: true,
            note: [
              "HARASSMENT, HATE_SPEECH, SPAM, IMPERSONATION, SEXUAL_CONTENT, CHILD_SAFETY, SELF_HARM, VIOLENCE, PRIVACY ou OTHER.",
              "HARASSMENT, HATE_SPEECH, SPAM, IMPERSONATION, SEXUAL_CONTENT, CHILD_SAFETY, SELF_HARM, VIOLENCE, PRIVACY or OTHER.",
              "HARASSMENT, HATE_SPEECH, SPAM, IMPERSONATION, SEXUAL_CONTENT, CHILD_SAFETY, SELF_HARM, VIOLENCE, PRIVACY u OTHER.",
            ],
          },
          {
            name: "id",
            type: "string",
            note: [
              "O conteúdo denunciado. Obrigatório para tudo que não seja PROFILE, onde a conta em si é o assunto.",
              "The content being reported. Required for anything but PROFILE, where the account itself is the subject.",
              "El contenido denunciado. Obligatorio para todo lo que no sea PROFILE, donde la cuenta misma es el asunto.",
            ],
          },
          { name: "details", type: "string", note: upTo(1000) },
        ],
      },
    ],
  },
  {
    slug: "account",
    title: ["Conta", "Account", "Cuenta"],
    blurb: [
      "A conta em si, e não o que ela guarda: o nome, as sessões em que está entrada, os jeitos de entrar, tudo o que já escreveu, e as próprias chaves. Nada disso aceita uma chave: só uma sessão. Uma chave que pudesse criar outra chave se daria todos os escopos de uma vez, e uma que pudesse pedir a exportação estaria a um vazamento da conta inteira. Não existe escopo que torne isso seguro, então não existe escopo.",
      "The account itself rather than what it holds: its name, the sessions it is signed in on, the ways it signs in, everything it has ever written, and the keys themselves. None of it takes a key: only a session. A key that could make another key would give itself every scope at once, and one that could ask for the export would be one leak away from the whole account. There is no scope that makes this safe, so there is none.",
      "La cuenta misma y no lo que guarda: su nombre, las sesiones en que está iniciada, las formas de entrar, todo lo que ha escrito, y las llaves mismas. Nada de esto acepta una llave: solo una sesión. Una llave que pudiera crear otra llave se daría todos los permisos de una vez, y una que pudiera pedir la exportación estaría a una filtración de la cuenta entera. No hay permiso que lo haga seguro, así que no hay ninguno.",
    ],
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/account/username",
        scope: null,
        bucket: "read",
        summary: [
          "Diz se um nome está livre, antes de alguém tentar tomá-lo.",
          "Says whether a name is free, before anybody tries to take it.",
          "Dice si un nombre está libre, antes de que alguien intente tomarlo.",
        ],
        query: [
          {
            name: "q",
            type: "string",
            required: true,
            note: [
              "O nome a verificar. Um que nem sequer tem forma de nome responde disponível: false, em vez de erro.",
              "The name to check. One that is not even shaped like a name answers available: false rather than erroring.",
              "El nombre a verificar. Uno que ni siquiera tiene forma de nombre responde available: false, en vez de error.",
            ],
          },
        ],
      },
      {
        method: "PUT",
        path: "/api/v1/account/username",
        scope: null,
        bucket: "write",
        summary: [
          "Toma um nome pela primeira vez. É separado do PATCH porque são atos diferentes com regras diferentes: quem ainda não tem nome está terminando de se cadastrar, e quem já tem está se renomeando.",
          "Takes a name for the first time. Separate from the PATCH because they are different acts with different rules: an account without a name yet is finishing signing up, and one with a name is renaming.",
          "Toma un nombre por primera vez. Está separado del PATCH porque son actos distintos con reglas distintas: quien aún no tiene nombre está terminando de registrarse, y quien ya tiene se está renombrando.",
        ],
        body: [
          {
            name: "username",
            type: "string",
            required: true,
            note: [
              "De 3 a 24 caracteres entre a-z, 0-9 e _, sem começar nem terminar com _.",
              "3 to 24 characters of a-z, 0-9 and _, starting and ending with neither _.",
              "De 3 a 24 caracteres entre a-z, 0-9 y _, sin empezar ni terminar con _.",
            ],
          },
        ],
      },
      {
        method: "PATCH",
        path: "/api/v1/account/username",
        scope: null,
        bucket: "write",
        summary: [
          "Renomeia. Há um período de espera entre uma troca e a próxima, e a resposta traz next_change_at para dizer quando acaba.",
          "Renames. There is a waiting period between one change and the next, and the answer carries next_change_at to say when it ends.",
          "Renombra. Hay un periodo de espera entre un cambio y el siguiente, y la respuesta trae next_change_at para decir cuándo termina.",
        ],
      },
      {
        method: "GET",
        path: "/api/v1/account/birth-date",
        scope: null,
        bucket: "read",
        summary: [
          "Devolve a data de nascimento guardada e como a idade foi confirmada. Só para a sessão: as colunas são revogadas de todo mundo, e a função definidora responde por quem pergunta e por mais ninguém.",
          "Returns the stored date of birth and how the age was confirmed. Session only: the columns are revoked from everyone, and the definer function answers for the caller and nobody else.",
          "Devuelve la fecha de nacimiento guardada y cómo se confirmó la edad. Solo para la sesión: las columnas están revocadas para todos, y la función definidora responde por quien pregunta y por nadie más.",
        ],
      },
      {
        method: "PUT",
        path: "/api/v1/account/birth-date",
        scope: null,
        bucket: "write",
        summary: [
          "Guarda a data de nascimento. A regra de idade é do banco, que recusa em vez de guardar uma data recente demais.",
          "Stores the date of birth. The age rule is the database's, which refuses rather than storing a date that is too recent.",
          "Guarda la fecha de nacimiento. La regla de edad es de la base, que rechaza en vez de guardar una fecha demasiado reciente.",
        ],
        body: [
          {
            name: "birth_date",
            type: "string",
            required: true,
            note: [
              "Uma data como YYYY-MM-DD.",
              "A date as YYYY-MM-DD.",
              "Una fecha como YYYY-MM-DD.",
            ],
          },
        ],
      },
      {
        method: "GET",
        path: "/api/v1/account/sessions",
        scope: null,
        bucket: "read",
        summary: [
          "Onde a conta está entrada, e em quê.",
          "Where the account is signed in, and on what.",
          "Dónde está iniciada la cuenta, y en qué.",
        ],
      },
      {
        method: "DELETE",
        path: "/api/v1/account/sessions/{id}",
        scope: null,
        bucket: "write",
        summary: [
          "Encerra uma sessão. Inclusive a que está fazendo o pedido, que é como se sai de todos os lugares de uma vez.",
          "Ends one session. Including the one making the request, which is how you sign out of everywhere at once.",
          "Cierra una sesión. Incluida la que hace la petición, que es como se sale de todos lados a la vez.",
        ],
      },
      {
        method: "GET",
        path: "/api/v1/account/identities",
        scope: null,
        bucket: "read",
        summary: [
          "Os provedores com que esta conta consegue entrar.",
          "The providers this account can sign in with.",
          "Los proveedores con los que esta cuenta puede entrar.",
        ],
      },
      {
        method: "GET",
        path: "/api/v1/account/export",
        scope: null,
        bucket: "read",
        summary: [
          "Tudo o que a conta escreveu, num documento só.",
          "Everything the account has written, in one document.",
          "Todo lo que la cuenta ha escrito, en un solo documento.",
        ],
      },
      {
        method: "DELETE",
        path: "/api/v1/account/data",
        scope: null,
        bucket: "write",
        summary: [
          'Joga fora um tipo de coisa, pelo nome. A categoria é obrigatória e nunca tem padrão: um delete que adivinha o que foi mandado remover é um delete que ninguém desfaz. Responde quantos registros saíram, e não um "pronto": dizer que os dados sumiram quando não havia nenhum é uma afirmação, não uma confirmação.',
          'Throws away one kind of thing, by name. The category is required and never defaults: a delete that guesses what it was asked to remove is a delete nobody takes back. It answers with how many records went, not a flat "done": saying data is gone when there was none to remove is a claim rather than a confirmation.',
          'Tira un tipo de cosa, por su nombre. La categoría es obligatoria y nunca tiene valor por defecto: un borrado que adivina qué se le pidió quitar es un borrado que nadie deshace. Responde cuántos registros salieron, y no un "listo": decir que los datos ya no están cuando no había ninguno es una afirmación, no una confirmación.',
        ],
        query: [
          {
            name: "category",
            type: "string",
            required: true,
            note: [
              "library, reviews, sessions, journeys, lists, screenshots, comments, views ou everything.",
              "library, reviews, sessions, journeys, lists, screenshots, comments, views or everything.",
              "library, reviews, sessions, journeys, lists, screenshots, comments, views o everything.",
            ],
          },
        ],
      },
      {
        method: "GET",
        path: "/api/v1/account/keys",
        scope: null,
        bucket: "read",
        summary: [
          "As chaves da conta. Nunca o token: só o hash é guardado, numa coluna que nenhum papel que fala com esta API recebe.",
          "The account's keys. Never the token: only its hash is stored, in a column no role that talks to this API is granted.",
          "Las llaves de la cuenta. Nunca el token: solo se guarda su hash, en una columna que ningún rol que habla con esta API recibe.",
        ],
      },
      {
        method: "POST",
        path: "/api/v1/account/keys",
        scope: null,
        bucket: "write",
        summary: [
          "Cria uma chave. O token vem uma vez, nesta resposta, e nunca mais: depois disso ninguém consegue lê-lo, nem nós.",
          "Creates a key. The token comes back once, in this answer, and never again: after that nobody can read it, not even us.",
          "Crea una llave. El token viene una vez, en esta respuesta, y nunca más: después nadie puede leerlo, ni nosotros.",
        ],
        body: [
          { name: "name", type: "string", required: true, note: upTo(60) },
          {
            name: "scopes",
            type: "array",
            required: true,
            note: [
              "Os escopos que ela vai segurar. Um vazio ainda responde /me, e nada mais.",
              "The scopes it will hold. An empty one still answers /me, and nothing else.",
              "Los permisos que tendrá. Uno vacío aún responde /me, y nada más.",
            ],
          },
          {
            name: "expires_in_days",
            type: "integer",
            note: [
              "Em quantos dias ela expira. null para nunca.",
              "In how many days it expires. null for never.",
              "En cuántos días expira. null para nunca.",
            ],
          },
        ],
      },
      {
        method: "DELETE",
        path: "/api/v1/account/connections/{service}",
        scope: null,
        bucket: "write",
        summary: [
          "Esquece uma conta ligada: twitch ou steam. Só o desfazer mora aqui. Ligar uma é uma ida e volta de OAuth que precisa voltar para uma página, então começa e termina no navegador; esquecer é uma escrita só, e escrita é aqui.",
          "Forgets a linked account: twitch or steam. Only the undoing lives here. Linking one is an OAuth round trip that has to come back to a page, so it starts and ends in the browser; forgetting is a single write, and writes are here.",
          "Olvida una cuenta enlazada: twitch o steam. Solo el deshacer vive aquí. Enlazar una es una ida y vuelta de OAuth que debe volver a una página, así que empieza y termina en el navegador; olvidar es una sola escritura, y las escrituras son aquí.",
        ],
      },
      {
        method: "DELETE",
        path: "/api/v1/account/keys/{id}",
        scope: null,
        bucket: "write",
        summary: [
          "Revoga uma chave. Vale já na requisição seguinte.",
          "Revokes a key. It takes effect on the very next request.",
          "Revoca una llave. Vale desde la petición siguiente.",
        ],
      },
    ],
  },
  {
    slug: "notifications",
    title: ["Notificações", "Notifications", "Notificaciones"],
    blurb: [
      "O que aconteceu enquanto o dono não estava olhando, já resolvido: quem fez, sobre o quê, e para onde ir ver.",
      "What happened while the owner was not looking, already resolved: who did it, about what, and where to go and see.",
      "Lo que pasó mientras el dueño no miraba, ya resuelto: quién lo hizo, sobre qué, y adónde ir a verlo.",
    ],
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/notifications",
        scope: "profile.read",
        bucket: "read",
        summary: [
          "A caixa de entrada, mais recentes primeiro, com as preferências junto. Cada item traz path: o endereço para onde ele aponta, sem o prefixo de idioma, que é de quem lê e não da notificação. Vem null quando não há mais para onde ir (a publicação sumiu, ou quem lê não pode mais vê-la) e aí as palavras ficam sem link, em vez de apontarem para uma página que recusaria.",
          "The inbox, newest first, with the preferences alongside. Each item carries path: where it points, without the language prefix, which belongs to the reader rather than to the notification. It comes back null when there is nowhere left to go (the post is gone, or the reader may no longer see it) and the words then stand without a link, rather than pointing at a page that would refuse them.",
          "La bandeja, las más recientes primero, con las preferencias al lado. Cada elemento trae path: adónde apunta, sin el prefijo de idioma, que es de quien lee y no de la notificación. Viene null cuando ya no hay adónde ir (la publicación desapareció, o quien lee ya no puede verla) y entonces las palabras quedan sin enlace, en vez de apuntar a una página que las rechazaría.",
        ],
        query: [
          {
            name: "limit",
            type: "integer",
            note: [
              "Quantas trazer, de 1 a 100. O padrão é 40.",
              "How many to bring, 1 to 100. The default is 40.",
              "Cuántas traer, de 1 a 100. Por defecto 40.",
            ],
          },
        ],
        example: `{
  "data": [
    {
      "id": "...",
      "kind": "post_comment",
      "created_at": "2026-09-05T18:00:00.000Z",
      "read_at": null,
      "target_title": "Hollow Knight",
      "actor": { "username": "ada", "display_name": "Ada", "avatar_url": null },
      "path": "review/aB3xY#comment-9kQ2",
      "is_reply": true
    }
  ],
  "preferences": { "follows_enabled": true, "comments_enabled": true }
}`,
      },
      {
        method: "PATCH",
        path: "/api/v1/notifications",
        scope: "profile.write",
        bucket: "write",
        summary: [
          "Marca tudo o que está por ler como lido.",
          "Marks everything unread as read.",
          "Marca como leído todo lo que está sin leer.",
        ],
      },
      {
        method: "PATCH",
        path: "/api/v1/notifications/{id}",
        scope: "profile.write",
        bucket: "write",
        summary: [
          "Marca uma como lida. Fazer duas vezes não move a hora: a segunda chamada responde a que a primeira escreveu.",
          "Marks one as read. Doing it twice does not move the time: the second call answers with what the first one wrote.",
          "Marca una como leída. Hacerlo dos veces no mueve la hora: la segunda llamada responde con lo que escribió la primera.",
        ],
      },
      {
        method: "PATCH",
        path: "/api/v1/notifications/preferences",
        scope: "profile.write",
        bucket: "write",
        summary: [
          "Liga e desliga o que merece um aviso. Mande só o que muda.",
          "Turns on and off what is worth being told about. Send only what changes.",
          "Enciende y apaga lo que merece un aviso. Envía solo lo que cambia.",
        ],
        body: [
          { name: "follows_enabled", type: "boolean", note: SWITCH },
          { name: "review_likes_enabled", type: "boolean", note: SWITCH },
          { name: "list_likes_enabled", type: "boolean", note: SWITCH },
          { name: "comments_enabled", type: "boolean", note: SWITCH },
          { name: "screenshots_enabled", type: "boolean", note: SWITCH },
          { name: "journal_likes_enabled", type: "boolean", note: SWITCH },
        ],
      },
      {
        method: "GET",
        path: "/api/v1/notifications/devices",
        scope: "profile.read",
        bucket: "read",
        summary: [
          "Os navegadores registrados para receber push, do mais recente ao mais antigo.",
          "The browsers registered to be pushed to, newest first.",
          "Los navegadores registrados para recibir push, del más reciente al más antiguo.",
        ],
      },
      {
        method: "POST",
        path: "/api/v1/notifications/devices",
        scope: "profile.write",
        bucket: "write",
        summary: [
          "Registra um navegador. Reinscrever no mesmo navegador devolve o mesmo endpoint, então repetir atualiza a inscrição em vez de criar outra; um endpoint que já é de outra conta responde 409.",
          "Registers a browser. Re-subscribing in the same browser returns the same endpoint, so repeating updates the registration rather than making a second one; an endpoint that already belongs to another account answers 409.",
          "Registra un navegador. Volver a suscribirse en el mismo navegador devuelve el mismo endpoint, así que repetir actualiza el registro en vez de crear otro; un endpoint que ya es de otra cuenta responde 409.",
        ],
        body: [
          {
            name: "endpoint",
            type: "string",
            required: true,
            note: [
              "O endereço que o serviço de push deu a este navegador.",
              "The address the push service gave this browser.",
              "La dirección que el servicio de push dio a este navegador.",
            ],
          },
          {
            name: "p256dh",
            type: "string",
            required: true,
            note: [
              "A chave pública da inscrição.",
              "The subscription's public key.",
              "La clave pública de la suscripción.",
            ],
          },
          {
            name: "auth",
            type: "string",
            required: true,
            note: [
              "O segredo de autenticação da inscrição.",
              "The subscription's authentication secret.",
              "El secreto de autenticación de la suscripción.",
            ],
          },
          {
            name: "device_label",
            type: "string",
            note: [
              "Um nome curto só para reconhecer o aparelho na lista.",
              "A short name, only so the device can be recognised in the list.",
              "Un nombre corto, solo para reconocer el dispositivo en la lista.",
            ],
          },
        ],
      },
      {
        method: "DELETE",
        path: "/api/v1/notifications/devices/{id}",
        scope: "profile.write",
        bucket: "write",
        summary: [
          "Esquece um aparelho. O navegador dele continua inscrito no serviço de push até se desinscrever, o que só ele mesmo pode fazer.",
          "Forgets a device. Its browser stays subscribed with the push service until it unsubscribes, which only it can do.",
          "Olvida un dispositivo. Su navegador sigue suscrito al servicio de push hasta que se dé de baja, lo que solo él puede hacer.",
        ],
      },
    ],
  },
  {
    slug: "history",
    title: ["Histórico", "History", "Historial"],
    blurb: [
      'O que o dono olhou. Segue a conta e não o navegador, que é o ponto: um "visto recentemente" guardado num aparelho é uma lista diferente em cada aparelho.',
      'What the owner looked at. It follows the account rather than the browser, which is the point: a "recently viewed" kept on one device is a different list on every device.',
      'Lo que el dueño miró. Sigue a la cuenta y no al navegador, que es el punto: un "visto recientemente" guardado en un aparato es una lista distinta en cada aparato.',
    ],
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/history",
        scope: "profile.read",
        bucket: "read",
        summary: [
          "Os jogos vistos, do mais recente ao mais antigo.",
          "The games looked at, newest first.",
          "Los juegos vistos, del más reciente al más antiguo.",
        ],
        query: [
          {
            name: "limit",
            type: "integer",
            note: [
              "Quantos trazer, de 1 a 50. O padrão é 6.",
              "How many to bring, 1 to 50. The default is 6.",
              "Cuántos traer, de 1 a 50. Por defecto 6.",
            ],
          },
        ],
      },
      {
        method: "DELETE",
        path: "/api/v1/history",
        scope: "profile.write",
        bucket: "write",
        summary: [
          "Apaga o histórico e diz quantas linhas saíram.",
          "Clears the history and says how many rows went.",
          "Borra el historial y dice cuántas filas salieron.",
        ],
      },
    ],
  },
  {
    slug: "people",
    title: ["Pessoas", "People", "Personas"],
    blurb: [
      "O pouco que se lê sobre outra conta: a quem ela está ligada, o nível dela, e quem respondeu pela verificação dela. Tudo isso já está na página de perfil para quem abrir; nada aqui diz mais do que ela.",
      "The little that is read about somebody else: who they are connected to, their standing, and who vouched for their badge. All of it is already on the profile page for anyone who opens it; nothing here says more than that.",
      "Lo poco que se lee sobre otra cuenta: con quién está conectada, su nivel, y quién respondió por su verificación. Todo eso ya está en la página de perfil para quien la abra; nada aquí dice más que ella.",
    ],
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/profiles/{username}",
        scope: "profile.read",
        bucket: "read",
        summary: [
          "Perfil publico e nome atual, incluindo aliases.",
          "Public profile and canonical username, including aliases.",
          "Perfil publico y nombre actual, incluidos alias.",
        ],
      },
      {
        method: "GET",
        path: "/api/v1/profiles/{username}/summary",
        scope: "profile.read",
        bucket: "read",
        summary: [
          "Contagens visiveis e relacao com o visitante.",
          "Visible counts and the visitor relationship.",
          "Recuentos visibles y relacion con el visitante.",
        ],
      },
      {
        method: "GET",
        path: "/api/v1/profiles/{username}/library",
        scope: "library.read",
        bucket: "read",
        summary: [
          "Biblioteca visivel. page de 1 a 1000, limit de 1 a 1000, padrao 100. has_more indica a proxima pagina.",
          "Visible library. page 1 to 1000, limit 1 to 1000, default 100. has_more signals another page.",
          "Biblioteca visible. page de 1 a 1000, limit de 1 a 1000, predeterminado 100. has_more indica otra pagina.",
        ],
      },
      {
        method: "GET",
        path: "/api/v1/profiles/{username}/year/{year}",
        scope: "profile.read",
        bucket: "read",
        summary: [
          "Sessoes e notas visiveis no ano, desde 2000 ate o ano atual.",
          "Visible sessions and ratings in a year, from 2000 through the current year.",
          "Sesiones y notas visibles del ano, desde 2000 hasta el actual.",
        ],
      },
      {
        method: "GET",
        path: "/api/v1/profiles/{username}/minerals",
        scope: "profile.read",
        bucket: "read",
        summary: [
          "Saldo publico de minerais e nivel, sem o historico de transferencias.",
          "Public mineral balances and level, without the transfer ledger.",
          "Saldos publicos de minerales y nivel, sin el historial de transferencias.",
        ],
      },
      {
        method: "GET",
        path: "/api/v1/profiles/{username}/connections",
        scope: "social.read",
        bucket: "read",
        summary: [
          "Quem segue alguém, ou quem essa pessoa segue. Paginado por created_at e não por deslocamento: a lista está sendo rolada enquanto contas seguem e deixam de seguir, e um deslocamento pularia ou repetiria uma linha toda vez que as de cima se mexessem. O cursor é o created_at do último item devolvido.",
          "Who follows somebody, or who they follow. Paged on created_at rather than by offset: the list is being scrolled while accounts follow and unfollow, and an offset would skip or repeat a row every time the ones above it moved. The cursor is the created_at of the last item returned.",
          "Quién sigue a alguien, o a quién sigue esa persona. Paginado por created_at y no por desplazamiento: la lista se recorre mientras hay cuentas siguiendo y dejando de seguir, y un desplazamiento saltaría o repetiría una fila cada vez que se movieran las de arriba. El cursor es el created_at del último elemento devuelto.",
        ],
        query: [
          {
            name: "tab",
            type: "string",
            note: [
              "followers ou following. O padrão é followers.",
              "followers or following. The default is followers.",
              "followers o following. Por defecto followers.",
            ],
          },
          {
            name: "before",
            type: "string",
            note: [
              "O created_at do último item da página anterior.",
              "The created_at of the last item on the previous page.",
              "El created_at del último elemento de la página anterior.",
            ],
          },
          {
            name: "limit",
            type: "integer",
            note: [
              "De 1 a 50. O padrão é 20.",
              "1 to 50. The default is 20.",
              "De 1 a 50. Por defecto 20.",
            ],
          },
          {
            name: "q",
            type: "string",
            note: [
              "Filtra por nome de usuário ou nome de exibição.",
              "Filters by username or display name.",
              "Filtra por nombre de usuario o nombre visible.",
            ],
          },
        ],
      },
      {
        method: "GET",
        path: "/api/v1/profiles/{username}/verification",
        scope: null,
        bucket: "read",
        summary: [
          'Quem respondeu pela verificação de uma conta, e quando. Sem escopo: o selo já está no perfil para quem quiser ver, e isto só diz o que ele significa. Uma conta que nunca foi verificada responde null, e não uma recusa: "não" é uma resposta aqui, não um segredo. Aceita o username ou o id, porque um é o que tem quem lê um perfil e o outro é o que tem quem já carregou a linha.',
          'Who vouched for an account\'s badge, and when. No scope: the badge is already on the profile for anyone to see, and this only says what it means. An account that was never verified answers null rather than a refusal: "no" is an answer here, not a secret. It takes the username or the id, because one is what somebody reading a profile has and the other is what a page that already loaded the row has.',
          'Quién respondió por la verificación de una cuenta, y cuándo. Sin permiso: la insignia ya está en el perfil para quien quiera verla, y esto solo dice qué significa. Una cuenta que nunca fue verificada responde null, y no un rechazo: "no" es una respuesta aquí, no un secreto. Acepta el username o el id, porque uno es lo que tiene quien lee un perfil y el otro lo que tiene una página que ya cargó la fila.',
        ],
      },
      {
        method: "GET",
        path: "/api/v1/profiles/levels",
        scope: null,
        bucket: "read",
        summary: [
          "O nível de várias contas de uma vez. Uma página desenha muitos cartões querendo a mesma coisa sobre pessoas diferentes, e perguntar por cartão é como uma lista de vinte vira vinte requisições.",
          "Standing for several accounts at once. A page renders many cards wanting the same thing about different people, and asking per card is how a list of twenty becomes twenty requests.",
          "El nivel de varias cuentas a la vez. Una página dibuja muchas tarjetas queriendo lo mismo sobre personas distintas, y preguntar por tarjeta es cómo una lista de veinte se vuelve veinte peticiones.",
        ],
        query: [
          {
            name: "ids",
            type: "string",
            required: true,
            note: [
              "De 1 a 100 ids de conta, separados por vírgula.",
              "1 to 100 account ids, separated by commas.",
              "De 1 a 100 ids de cuenta, separados por comas.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "minerals",
    title: ["Minerais", "Minerals", "Minerales"],
    blurb: [
      "A carteira: o que foi ganho por nível e o que trocou de mãos.",
      "The wallet: what was earned by levelling and what has changed hands.",
      "La cartera: lo que se ganó por nivel y lo que cambió de manos.",
    ],
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/minerals",
        scope: "profile.read",
        bucket: "read",
        summary: [
          "O que a conta ganhou e as últimas cinquenta transferências em que ela aparece, de um lado ou do outro.",
          "What the account earned, and the last fifty transfers it appears in, on either side.",
          "Lo que la cuenta ganó y las últimas cincuenta transferencias en las que aparece, de un lado o del otro.",
        ],
      },
      {
        method: "POST",
        path: "/api/v1/minerals",
        scope: "profile.write",
        bucket: "write",
        summary: [
          "Recolhe o que os níveis devem. Pedir duas vezes não cobra duas vezes: as linhas são chaveadas por conta e nível, então a segunda chamada não insere nada e responde uma lista vazia.",
          "Collects what levels owe. Asking twice does not pay twice: the rows are keyed on the account and the level, so the second call inserts nothing and answers an empty list.",
          "Recoge lo que deben los niveles. Pedir dos veces no paga dos veces: las filas están indexadas por cuenta y nivel, así que la segunda llamada no inserta nada y responde una lista vacía.",
        ],
      },
      {
        method: "POST",
        path: "/api/v1/minerals/transfers",
        scope: "profile.write",
        bucket: "write",
        summary: [
          "Envia minerais para alguém. Cada quantidade é conferida de novo pelo banco, que é o único lugar que sabe o que quem envia tem, e ele nomeia o mineral que faltou.",
          "Sends minerals to somebody. Every amount is checked again by the database, which is the only place that knows what the sender has, and it names the mineral that ran short.",
          "Envía minerales a alguien. Cada cantidad la revisa de nuevo la base, que es el único lugar que sabe lo que tiene quien envía, y nombra el mineral que faltó.",
        ],
        body: [
          {
            name: "username",
            type: "string",
            required: true,
            note: ["Quem recebe.", "Who receives them.", "Quién los recibe."],
          },
          {
            name: "items",
            type: "object",
            required: true,
            note: [
              "Um mineral para cada quantidade inteira acima de zero.",
              "One mineral to each whole amount above zero.",
              "Un mineral por cada cantidad entera mayor que cero.",
            ],
          },
          { name: "note", type: "string", note: upTo(280) },
        ],
      },
    ],
  },
  {
    slug: "comments",
    title: ["Comentários", "Comments", "Comentarios"],
    blurb: [
      "As respostas sob uma publicação e sob um perfil. São duas tabelas no banco, por causa da ordem em que foram construídas, e um recurso só aqui, porque a diferença não é de quem lê.",
      "The replies under a post and under a profile. They are two tables in the database, an accident of the order they were built in, and one resource here, because the difference is not the reader's.",
      "Las respuestas bajo una publicación y bajo un perfil. Son dos tablas en la base, por el orden en que se construyeron, y un solo recurso aquí, porque la diferencia no es de quien lee.",
    ],
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/comments",
        scope: "comments.read",
        bucket: "read",
        summary: [
          "As respostas em algo, das mais antigas para as mais novas, com o autor de cada uma e a contagem de curtidas. As removidas não aparecem.",
          "The replies on something, oldest first, with each one's author and its like count. Removed ones do not appear.",
          "Las respuestas en algo, de las más antiguas a las más nuevas, con el autor de cada una y su cuenta de me gusta. Las eliminadas no aparecen.",
        ],
        query: [
          {
            name: "on",
            type: "string",
            required: true,
            note: [
              "review, list, screenshot, diary ou profile.",
              "review, list, screenshot, diary or profile.",
              "review, list, screenshot, diary o profile.",
            ],
          },
          {
            name: "id",
            type: "string",
            required: true,
            note: [
              "O id do conteúdo. Com on=profile é o username, porque é o único nome que um perfil tem por aqui.",
              "The content's id. With on=profile it is the username, because that is the only name a profile has here.",
              "El id del contenido. Con on=profile es el username, porque es el único nombre que un perfil tiene aquí.",
            ],
          },
        ],
      },
      {
        method: "POST",
        path: "/api/v1/comments",
        scope: "comments.write",
        bucket: "write",
        summary: [
          "Responde. Quem publicou decide quem pode: um espaço fechado responde 403 forbidden e a mensagem diz que foi isso.",
          "Reply. The author decides who may: a closed space answers 403 forbidden and the message says so.",
          "Responde. Quien publicó decide quién puede: un espacio cerrado responde 403 forbidden y el mensaje lo dice.",
        ],
        body: [
          {
            name: "on",
            type: "string",
            required: true,
            note: [
              "O mesmo do GET.",
              "The same as the GET's.",
              "El mismo del GET.",
            ],
          },
          {
            name: "id",
            type: "string",
            required: true,
            note: [
              "O mesmo do GET.",
              "The same as the GET's.",
              "El mismo del GET.",
            ],
          },
          { name: "body", type: "string", required: true, note: upTo(2000) },
          {
            name: "parent_id",
            type: "string",
            note: [
              "A resposta a que esta responde. A conversa tem um limite de profundidade, e passar dele é 400.",
              "The reply this one answers. A conversation has a depth limit, and going past it is a 400.",
              "La respuesta a la que esta contesta. La conversación tiene un límite de profundidad, y pasarlo es un 400.",
            ],
          },
        ],
      },
      {
        method: "PATCH",
        path: "/api/v1/comments/{id}",
        scope: "comments.write",
        bucket: "write",
        summary: [
          "Reescreve uma resposta sua. O id basta: as duas tabelas tiram os ids do mesmo gerador, então não é preciso dizer de qual delas ele é.",
          "Rewrite one of your replies. The id is enough: both tables take their ids from the same generator, so there is no need to say which one it belongs to.",
          "Reescribe una respuesta tuya. El id basta: ambas tablas sacan sus ids del mismo generador, así que no hace falta decir de cuál es.",
        ],
        body: [
          { name: "body", type: "string", required: true, note: upTo(2000) },
        ],
      },
      {
        method: "DELETE",
        path: "/api/v1/comments/{id}",
        scope: "comments.write",
        bucket: "write",
        summary: [
          "Remove uma resposta sua, ou uma resposta sob algo seu.",
          "Remove one of your replies, or a reply under something of yours.",
          "Elimina una respuesta tuya, o una respuesta bajo algo tuyo.",
        ],
      },
    ],
  },
  {
    slug: "likes",
    title: ["Curtidas", "Likes", "Me gusta"],
    blurb: [
      "Curtir é separado de responder de propósito. Não são o mesmo ato: um deixa palavras no nome de alguém e o outro não.",
      "Liking is separate from replying on purpose. They are not the same act: one leaves words under somebody's name and the other does not.",
      "Dar me gusta está separado de responder a propósito. No son el mismo acto: uno deja palabras en el nombre de alguien y el otro no.",
    ],
    endpoints: [
      {
        method: "POST",
        path: "/api/v1/likes",
        scope: "likes.write",
        bucket: "write",
        summary: [
          "Vira a curtida do outro lado e diz qual lado ficou. Não é PUT nem DELETE porque o banco tem uma instrução só que troca e conta na mesma transação; fingir dois verbos exigiria ler o estado antes de escrever o contrário, e dois toques seguidos correriam um contra o outro.",
          "Turns the like over and says which side came up. It is not a PUT and a DELETE because the database has one statement that flips and counts in the same transaction; faking two verbs would mean reading the state before writing the opposite, and two quick taps would race each other.",
          "Da vuelta el me gusta y dice qué lado quedó. No es PUT ni DELETE porque la base tiene una sola instrucción que cambia y cuenta en la misma transacción; fingir dos verbos exigiría leer el estado antes de escribir lo contrario, y dos toques seguidos competirían entre sí.",
        ],
        body: [
          {
            name: "on",
            type: "string",
            required: true,
            note: [
              "review, list, screenshot, diary, content_comment ou profile_comment.",
              "review, list, screenshot, diary, content_comment or profile_comment.",
              "review, list, screenshot, diary, content_comment o profile_comment.",
            ],
          },
          {
            name: "id",
            type: "string",
            required: true,
            note: [
              "O id do que está sendo curtido.",
              "The id of what is being liked.",
              "El id de lo que se está marcando.",
            ],
          },
        ],
        example: `{
  "data": { "on": "review", "id": "...", "liked": true, "like_count": 12 }
}`,
      },
    ],
  },
];

export const ERROR_CODES: { code: string; status: number; note: Text }[] = [
  {
    code: "unauthorized",
    status: 401,
    note: [
      "A requisição não trouxe identidade nenhuma: nem chave, nem sessão desta origem.",
      "The request carried no identity: no key, and no session from this origin.",
      "La petición no trajo identidad alguna: ni llave, ni sesión de este origen.",
    ],
  },
  {
    code: "forbidden",
    status: 403,
    note: [
      "A identidade está certa e a regra recusou mesmo assim: um bloqueio, uma conta privada, um espaço de comentários fechado. Quando a recusa é uma dessas, a mensagem diz qual.",
      "The identity is fine and a rule refused anyway: a block, a private account, a closed comment section. When the refusal is one of those, the message says which.",
      "La identidad es correcta y una regla lo rechazó igual: un bloqueo, una cuenta privada, un espacio de comentarios cerrado. Cuando el rechazo es uno de esos, el mensaje dice cuál.",
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

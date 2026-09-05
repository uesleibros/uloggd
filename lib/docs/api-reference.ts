export type Param = {
  name: string;
  type: string;
  required?: boolean;
  note: string;
};

export type Endpoint = {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  scope: string | null;
  bucket: "read" | "write" | "catalog";
  summary: string;
  query?: Param[];
  body?: Param[];
  example?: string;
};

export type Resource = {
  slug: string;
  title: string;
  blurb: string;
  endpoints: Endpoint[];
};

const VISIBILITY = "PUBLIC, FOLLOWERS or PRIVATE";

export const RESOURCES: Resource[] = [
  {
    slug: "identity",
    title: "Identity",
    blurb:
      "What a key is and who it belongs to. Answering this needs no scope, so an integration can always find out what it is holding.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/me",
        scope: null,
        bucket: "read",
        summary: "The key's own id and scopes, and the account it acts as.",
        example: `{
  "key": { "id": "…", "scopes": ["catalog.read", "library.read"] },
  "owner": {
    "id": "…",
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
    title: "Catalog",
    blurb:
      "Games, from the same catalog the site reads. This is the only scope that touches nobody's data, and it works on a key that holds nothing else.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/games",
        scope: "catalog.read",
        bucket: "catalog",
        summary: "Search the catalog.",
        query: [
          {
            name: "q",
            type: "string",
            note: "Free text, up to 120 characters.",
          },
          {
            name: "sort",
            type: "string",
            note: "popular, rating, newest, oldest, hype or name. Defaults to popular.",
          },
          { name: "page", type: "integer", note: "1 to 100. Defaults to 1." },
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
        summary: "One game by its slug.",
      },
    ],
  },
  {
    slug: "profile",
    title: "Profile",
    blurb: "The owner's own profile. No scope here reaches anybody else's.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/profile",
        scope: "profile.read",
        bucket: "read",
        summary: "The owner's profile.",
      },
      {
        method: "PATCH",
        path: "/api/v1/profile",
        scope: "profile.write",
        bucket: "write",
        summary:
          "Change the display fields. Send only what changes; the rest is left as it stands.",
        body: [
          {
            name: "display_name",
            type: "string",
            note: "Up to 60 characters.",
          },
          { name: "bio", type: "string", note: "Up to 500 characters." },
          { name: "pronouns", type: "string", note: "Up to 40 characters." },
          { name: "thought", type: "string", note: "Up to 140 characters." },
          {
            name: "youtube_username",
            type: "string",
            note: "Up to 60 characters.",
          },
          {
            name: "instagram_username",
            type: "string",
            note: "Up to 60 characters.",
          },
          {
            name: "twitter_username",
            type: "string",
            note: "Up to 60 characters.",
          },
        ],
      },
    ],
  },
  {
    slug: "library",
    title: "Library",
    blurb: "What the owner is playing, has played, and wants to play.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/library",
        scope: "library.read",
        bucket: "read",
        summary: "The owner's library, newest change first.",
        query: [{ name: "page", type: "integer", note: "1 to 1000." }],
      },
      {
        method: "POST",
        path: "/api/v1/library",
        scope: "library.write",
        bucket: "write",
        summary:
          "Add or change one game. At least one of status, rating or a flag is required.",
        body: [
          {
            name: "igdb_id",
            type: "integer",
            required: true,
            note: "The game's catalog id.",
          },
          {
            name: "game_slug",
            type: "string",
            required: true,
            note: "The game's slug.",
          },
          {
            name: "status",
            type: "string",
            note: "BACKLOG, PLAYING, COMPLETED, DROPPED or WISHLIST.",
          },
          {
            name: "rating",
            type: "integer",
            note: "The quick rating, 10 to 100 in steps of 10. It is the one-to-ten scale the cards show, stored ten times larger.",
          },
          { name: "playing", type: "boolean", note: "Quick flag." },
          { name: "backlog", type: "boolean", note: "Quick flag." },
          { name: "wishlist", type: "boolean", note: "Quick flag." },
          { name: "liked", type: "boolean", note: "Quick flag." },
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
    title: "Reviews",
    blurb: "The owner's reviews.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/reviews",
        scope: "reviews.read",
        bucket: "read",
        summary: "The owner's reviews, newest first.",
        query: [{ name: "page", type: "integer", note: "1 to 1000." }],
      },
      {
        method: "POST",
        path: "/api/v1/reviews",
        scope: "reviews.write",
        bucket: "write",
        summary: "Write a review. Answers 201.",
        body: [
          {
            name: "igdb_id",
            type: "integer",
            required: true,
            note: "The game's catalog id.",
          },
          {
            name: "game_slug",
            type: "string",
            required: true,
            note: "The game's slug.",
          },
          {
            name: "content",
            type: "string",
            note: "Markdown, up to 5000 characters.",
          },
          { name: "title", type: "string", note: "Up to 80 characters." },
          { name: "rating", type: "integer", note: "0 to 100." },
          {
            name: "rating_mode",
            type: "string",
            note: "stars_5, level_5, score_10, score_100 or recommend.",
          },
          { name: "visibility", type: "string", note: VISIBILITY },
          {
            name: "contains_spoilers",
            type: "boolean",
            note: "Defaults to false.",
          },
          { name: "platform", type: "string", note: "Where it was played." },
          { name: "started_on", type: "date", note: "YYYY-MM-DD." },
          { name: "finished_on", type: "date", note: "YYYY-MM-DD." },
        ],
      },
      {
        method: "PATCH",
        path: "/api/v1/reviews/{id}",
        scope: "reviews.write",
        bucket: "write",
        summary: "Change a review. Anything left out keeps its value.",
      },
      {
        method: "DELETE",
        path: "/api/v1/reviews/{id}",
        scope: "reviews.write",
        bucket: "write",
        summary: "Remove a review.",
      },
    ],
  },
  {
    slug: "journal",
    title: "Journal",
    blurb:
      "Sessions and the journeys that group them. A journey is one passage through a game.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/journal/entries",
        scope: "journal.read",
        bucket: "read",
        summary: "Logged sessions, most recently played first.",
      },
      {
        method: "POST",
        path: "/api/v1/journal/entries",
        scope: "journal.write",
        bucket: "write",
        summary: "Log a session. Answers 201.",
        body: [
          {
            name: "igdb_id",
            type: "integer",
            required: true,
            note: "The game's catalog id.",
          },
          {
            name: "game_slug",
            type: "string",
            required: true,
            note: "The game's slug.",
          },
          {
            name: "played_on",
            type: "date",
            note: "YYYY-MM-DD. Defaults to today.",
          },
          {
            name: "ended_on",
            type: "date",
            note: "For a session spanning days.",
          },
          { name: "minutes", type: "integer", note: "0 to 100000." },
          {
            name: "note",
            type: "string",
            note: "Markdown, up to 5000 characters.",
          },
          { name: "visibility", type: "string", note: VISIBILITY },
          {
            name: "marks_start",
            type: "boolean",
            note: "This session started the game.",
          },
          {
            name: "marks_finish",
            type: "boolean",
            note: "This session finished it.",
          },
        ],
      },
      {
        method: "PATCH",
        path: "/api/v1/journal/entries/{id}",
        scope: "journal.write",
        bucket: "write",
        summary: "Change a session.",
      },
      {
        method: "DELETE",
        path: "/api/v1/journal/entries/{id}",
        scope: "journal.write",
        bucket: "write",
        summary: "Remove a session.",
      },
      {
        method: "GET",
        path: "/api/v1/journal/journeys",
        scope: "journal.read",
        bucket: "read",
        summary: "The owner's journeys.",
      },
      {
        method: "PATCH",
        path: "/api/v1/journal/journeys/{id}",
        scope: "journal.write",
        bucket: "write",
        summary: "Rename a journey.",
        body: [
          {
            name: "title",
            type: "string",
            required: true,
            note: "Up to 120 characters.",
          },
        ],
      },
      {
        method: "DELETE",
        path: "/api/v1/journal/journeys/{id}",
        scope: "journal.write",
        bucket: "write",
        summary: "Remove a journey.",
      },
    ],
  },
  {
    slug: "lists",
    title: "Lists",
    blurb: "Collections and rankings, and the games in them.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/lists",
        scope: "lists.read",
        bucket: "read",
        summary: "The owner's lists.",
      },
      {
        method: "POST",
        path: "/api/v1/lists",
        scope: "lists.write",
        bucket: "write",
        summary: "Create a list. Answers 201.",
        body: [
          {
            name: "name",
            type: "string",
            required: true,
            note: "Up to 120 characters.",
          },
          {
            name: "description",
            type: "string",
            note: "Up to 1000 characters.",
          },
          { name: "visibility", type: "string", note: VISIBILITY },
          {
            name: "ranked",
            type: "boolean",
            note: "A ranking rather than a collection.",
          },
        ],
      },
      {
        method: "GET",
        path: "/api/v1/lists/{id}",
        scope: "lists.read",
        bucket: "read",
        summary:
          "One list with its items. Accepts the id or the public id, and carries `owned` so a client knows whether it may write.",
      },
      {
        method: "PATCH",
        path: "/api/v1/lists/{id}",
        scope: "lists.write",
        bucket: "write",
        summary:
          "Rename a list or change its description, visibility or ranking.",
      },
      {
        method: "DELETE",
        path: "/api/v1/lists/{id}",
        scope: "lists.write",
        bucket: "write",
        summary: "Remove a list.",
      },
      {
        method: "POST",
        path: "/api/v1/lists/{id}/items",
        scope: "lists.write",
        bucket: "write",
        summary: "Add a game to a list. Answers 201.",
        body: [
          {
            name: "igdb_id",
            type: "integer",
            required: true,
            note: "The game's catalog id.",
          },
          {
            name: "game_slug",
            type: "string",
            required: true,
            note: "The game's slug.",
          },
        ],
      },
    ],
  },
  {
    slug: "screenshots",
    title: "Screenshots",
    blurb:
      "The owner's captures. Publishing one is the single place this API takes a form instead of JSON, because a picture is bytes.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/screenshots",
        scope: "screenshots.read",
        bucket: "read",
        summary:
          "The owner's screenshots, newest first. Removed ones are left out.",
      },
      {
        method: "POST",
        path: "/api/v1/screenshots",
        scope: "screenshots.write",
        bucket: "write",
        summary:
          "Publish a picture, as multipart/form-data rather than JSON. It is re-encoded to WebP and fitted inside 2560 by 2560, never enlarged. Answers 201. An account may publish twenty an hour, counted apart from the key's allowance because a picture costs storage rather than a row.",
        body: [
          {
            name: "image",
            type: "file",
            required: true,
            note: "JPEG, PNG or WebP. At least 160 by 160, at most 12 MB.",
          },
          {
            name: "igdb_id",
            type: "integer",
            required: true,
            note: "The game's catalog id.",
          },
          {
            name: "game_slug",
            type: "string",
            required: true,
            note: "The game's slug.",
          },
          {
            name: "description",
            type: "string",
            note: "Up to 2200 characters.",
          },
          { name: "visibility", type: "string", note: VISIBILITY },
          {
            name: "contains_spoilers",
            type: "string",
            note: 'Form fields are text, so this is the word "true" rather than a boolean.',
          },
          {
            name: "sensitive",
            type: "string",
            note: 'Likewise the word "true".',
          },
        ],
        example: `curl https://uloggd.com/api/v1/screenshots \
  -H "Authorization: Bearer ulg_live_..." \
  -F image=@shot.png \
  -F igdb_id=14593 \
  -F game_slug=hollow-knight \
  -F "description=The first time the city opens up"`,
      },
      {
        method: "DELETE",
        path: "/api/v1/screenshots/{id}",
        scope: "screenshots.write",
        bucket: "write",
        summary:
          "Remove a picture, from the listing and from the image host it was stored on.",
      },
    ],
  },
  {
    slug: "social",
    title: "Social",
    blurb:
      "Who the owner is connected to. This scope says who, never what those accounts hold.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/social/followers",
        scope: "social.read",
        bucket: "read",
        summary: "Accounts following the owner.",
      },
      {
        method: "GET",
        path: "/api/v1/social/following",
        scope: "social.read",
        bucket: "read",
        summary: "Accounts the owner follows.",
      },
      {
        method: "PUT",
        path: "/api/v1/social/following/{username}",
        scope: "social.write",
        bucket: "write",
        summary: "Follow an account. Doing it twice changes nothing.",
      },
      {
        method: "DELETE",
        path: "/api/v1/social/following/{username}",
        scope: "social.write",
        bucket: "write",
        summary: "Unfollow an account.",
      },
    ],
  },
];

export const ERROR_CODES: { code: string; status: number; note: string }[] = [
  {
    code: "unauthorized",
    status: 401,
    note: "The key's owner may not do that.",
  },
  {
    code: "invalid_key",
    status: 401,
    note: "Unknown, revoked or expired. The four are not told apart.",
  },
  {
    code: "insufficient_scope",
    status: 403,
    note: "The key does not hold the scope, which is named in the body.",
  },
  {
    code: "not_found",
    status: 404,
    note: "No such resource, or none the owner can see.",
  },
  {
    code: "invalid_request",
    status: 400,
    note: "A field is missing or not allowed. The message says which.",
  },
  { code: "conflict", status: 409, note: "That already exists." },
  {
    code: "rate_limited",
    status: 429,
    note: "Carries retry_after in seconds.",
  },
  {
    code: "internal",
    status: 500,
    note: "Something failed here. Nothing about the schema is said.",
  },
];

export const BUCKETS: { name: string; ceiling: number; note: string }[] = [
  { name: "read", ceiling: 600, note: "Every read outside the catalog." },
  { name: "write", ceiling: 60, note: "Every create, change and removal." },
  {
    name: "catalog",
    ceiling: 1000,
    note: "Catalog lookups, counted apart because they cost the catalog rather than the database.",
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

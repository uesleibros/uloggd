"""Refreshes the spawnd catalogue this site reads.

spawnd.gg is Nuuvem's platform for playing PC demos in the browser, and the
partnership with them is why a game page here can offer one. There is no
public API, so this walks the sitemap and the catalogue pages and reads what
the site itself renders, which is also why it is defensive about every field.

The result is `data/spawnd-games.json`, imported at build time by
`lib/spawnd.ts`. Seventy games is small enough to ship rather than fetch, and
shipping it means a game page never waits on a third party to find out whether
it has a demo.

    npm run spawnd:sync
    python scripts/spawnd-sync.py --concurrency 8

Needs `curl_cffi`, which impersonates a browser's TLS fingerprint: a plain
`requests` is refused by the origin.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import random
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any
from urllib.parse import urljoin
from xml.etree import ElementTree

from curl_cffi import requests


BASE_URL = "https://www.spawnd.gg"
# The repository root, so the defaults below mean the same thing wherever the
# script is run from rather than only from the root itself.
REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = REPO_ROOT / "data" / "spawnd-games.json"
DEFAULT_LANG = "en"
LANGS = ("en", "pt", "es", "ja", "zh", "ko")

GAME_PATH_RE = re.compile(
    r"/(?:en|pt|es|ja|zh|ko)/games/(?P<slug>[a-z0-9][a-z0-9-]*)(?:[?#/'\"]|$)",
    re.IGNORECASE,
)
GAME_HREF_RE = re.compile(
    r'''href=["'](?:https?://(?:www\.)?spawnd\.gg)?/(?:en|pt|es|ja|zh|ko)/games/(?P<slug>[a-z0-9][a-z0-9-]*)(?:[?#/"'])''',
    re.IGNORECASE,
)
EMBED_RE = re.compile(
    r"https?://(?:www\.)?spawnd\.gg/(?:-|en|pt|es|ja|zh|ko)/games/embed/(\d+)",
    re.IGNORECASE,
)
EMBED_REL_RE = re.compile(
    r"/(?:-|en|pt|es|ja|zh|ko)/games/embed/(\d+)",
    re.IGNORECASE,
)
STEAM_RE = re.compile(
    r"https?://store\.steampowered\.com/app/(\d+)(?:/[^\"'<>\s]*)?",
    re.IGNORECASE,
)

INVALID_GAME_SLUGS = {
    "embed",
}

PLATFORM_ALIASES = {
    "windows": "windows",
    "win": "windows",
    "pc": "windows",
    "mac": "mac_os",
    "macos": "mac_os",
    "mac_os": "mac_os",
    "osx": "mac_os",
    "linux": "steam_os",
    "steamdeck": "steam_os",
    "steam_deck": "steam_os",
    "steam os": "steam_os",
    "steamos": "steam_os",
    "steam_os": "steam_os",
}

STATUS_ALIASES = {
    "published": "published",
    "live": "published",
    "released": "published",
    "coming_soon": "coming_soon",
    "coming soon": "coming_soon",
    "upcoming": "coming_soon",
}

DEVALUE_NEGATIVE_SENTINELS = {-1, -2, -3, -4, -5, -6}


def has_play_route(html: str, slug: str) -> bool:
    if not html or not slug:
        return False

    escaped_slug = re.escape(slug)
    patterns = (
        rf"href=[\"'](?:https?://(?:www\\.)?spawnd\\.gg)?/(?:en|pt|es|ja|zh|ko)/games/{escaped_slug}/play(?:[?#\"'/]|$)",
        rf"href=[\"'](?:https?://(?:www\\.)?spawnd\\.gg)?/-/games/{escaped_slug}/play(?:[?#\"'/]|$)",
        rf"/(?:en|pt|es|ja|zh|ko)/games/{escaped_slug}/play(?:[?#\"'\\s<]|$)",
    )
    return any(re.search(pattern, html, re.IGNORECASE) for pattern in patterns)


def first_nonempty(*values: Any) -> Any:
    for value in values:
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        if isinstance(value, (list, dict)) and not value:
            continue
        return value
    return None


def as_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, str):
        match = re.search(r"\d+", value)
        if match:
            try:
                return int(match.group(0))
            except ValueError:
                return None
    return None


def normalize_slug(value: Any) -> str | None:
    if not isinstance(value, str):
        return None

    value = value.strip().strip("/")
    if not value:
        return None

    if "/games/" in value:
        value = value.split("/games/", 1)[1].split("/", 1)[0]

    value = value.split("?", 1)[0].split("#", 1)[0].strip().lower()
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", value):
        return None
    if value in INVALID_GAME_SLUGS:
        return None
    return value


def normalize_platforms(value: Any) -> list[str]:
    if value is None:
        return []

    if isinstance(value, str):
        raw = re.split(r"[,|;/]", value)
    elif isinstance(value, dict):
        raw = list(value.values()) + list(value.keys())
    elif isinstance(value, (list, tuple, set)):
        raw = list(value)
    else:
        raw = [value]

    out: list[str] = []
    for item in raw:
        if isinstance(item, dict):
            item = first_nonempty(
                item.get("slug"),
                item.get("name"),
                item.get("platform"),
                item.get("code"),
                item.get("id"),
            )

        if item is None:
            continue

        key = str(item).strip().lower().replace("-", "_")
        mapped = PLATFORM_ALIASES.get(key) or PLATFORM_ALIASES.get(key.replace("_", " "))
        if mapped and mapped not in out:
            out.append(mapped)

    return out


def normalize_status(
    value: Any,
    page_text: str = "",
    slug: str | None = None,
) -> str:
    """Whether the demo can be played on spawnd right now.

    Not whether the full game has shipped: the two are different facts, and a
    game can have a playable browser demo months before it releases.
    `released` and `release_date` answer the other one, from Steam.

    The /play route is the honest signal for this one. Searching the prose for
    "coming soon" was not: the phrase appears in the strip of other games at
    the foot of every page.
    """
    if slug and has_play_route(page_text, slug):
        return "published"

    if isinstance(value, dict):
        value = first_nonempty(value.get("slug"), value.get("name"), value.get("status"))

    if value is not None:
        key = str(value).strip().lower().replace("-", "_")
        mapped = STATUS_ALIASES.get(key) or STATUS_ALIASES.get(key.replace("_", " "))
        if mapped == "coming_soon":
            return "coming_soon"

    # No /play route means the demo is not launchable here today.
    return "coming_soon"


def walk(value: Any):
    yield value
    if isinstance(value, dict):
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, (list, tuple)):
        for child in value:
            yield from walk(child)


def pick_key(obj: dict[str, Any], *names: str) -> Any:
    lowered = {str(key).lower(): value for key, value in obj.items()}
    for name in names:
        if name.lower() in lowered:
            return lowered[name.lower()]
    return None


def find_url(value: Any, pattern: re.Pattern[str]) -> str | None:
    for node in walk(value):
        if isinstance(node, str):
            match = pattern.search(node)
            if match:
                return match.group(0)
    return None


def find_int_by_keys(value: Any, keys: tuple[str, ...]) -> int | None:
    wanted = {key.lower() for key in keys}
    for node in walk(value):
        if not isinstance(node, dict):
            continue
        for key, candidate in node.items():
            if str(key).lower() in wanted:
                parsed = as_int(candidate)
                if parsed is not None:
                    return parsed
    return None


def score_game_dict(obj: dict[str, Any], wanted_slug: str | None = None) -> int:
    slug = normalize_slug(
        first_nonempty(
            pick_key(obj, "slug"),
            pick_key(obj, "game_slug"),
            pick_key(obj, "gameSlug"),
            pick_key(obj, "url"),
            pick_key(obj, "href"),
        )
    )
    name = first_nonempty(
        pick_key(obj, "name"),
        pick_key(obj, "title"),
        pick_key(obj, "game_name"),
    )

    score = 0
    if slug:
        score += 5
    if name:
        score += 3
    if wanted_slug and slug == wanted_slug:
        score += 30

    keys = {str(key).lower() for key in obj}
    for marker in (
        "description",
        "status",
        "platforms",
        "stores",
        "wishlist_url",
        "steam_app_id",
        "igdb_id",
        "embed_url",
        "game_type",
        "published_at",
        "cover",
        "screenshots",
        "release_date",
    ):
        if marker in keys:
            score += 2

    blob = json.dumps(obj, ensure_ascii=False, default=str)
    if "/games/embed/" in blob:
        score += 8
    if "steampowered.com/app/" in blob:
        score += 5
    if wanted_slug and f"/games/{wanted_slug}" in blob:
        score += 10

    return score


def collect_game_dicts(value: Any, wanted_slug: str | None = None) -> list[dict[str, Any]]:
    candidates: list[tuple[int, dict[str, Any]]] = []
    seen: set[int] = set()

    for node in walk(value):
        if not isinstance(node, dict):
            continue

        object_id = id(node)
        if object_id in seen:
            continue
        seen.add(object_id)

        score = score_game_dict(node, wanted_slug)
        if score >= 9:
            candidates.append((score, node))

    candidates.sort(key=lambda item: item[0], reverse=True)
    return [obj for _, obj in candidates]


def collect_game_slugs_from_strings(value: Any) -> set[str]:
    slugs: set[str] = set()
    for node in walk(value):
        if not isinstance(node, str):
            continue
        for match in GAME_PATH_RE.finditer(node):
            slug = normalize_slug(match.group("slug"))
            if slug:
                slugs.add(slug)
    return slugs


def devalue_unflatten(values: list[Any]) -> Any:
    cache: dict[int, Any] = {}
    resolving: set[int] = set()

    def resolve_ref(ref: Any) -> Any:
        if not isinstance(ref, int) or isinstance(ref, bool):
            return resolve_inline(ref)

        if ref < 0:
            return None
        if ref >= len(values):
            return ref
        if ref in cache:
            return cache[ref]
        if ref in resolving:
            return cache.get(ref)

        resolving.add(ref)
        raw = values[ref]

        if isinstance(raw, dict):
            out: dict[str, Any] = {}
            cache[ref] = out
            for key, value in raw.items():
                out[str(key)] = resolve_ref(value)
            resolving.discard(ref)
            return out

        if isinstance(raw, list):
            if raw and isinstance(raw[0], str):
                tag = raw[0]
                if tag == "Date" and len(raw) > 1:
                    out = raw[1]
                elif tag == "BigInt" and len(raw) > 1:
                    try:
                        out = int(raw[1])
                    except (TypeError, ValueError):
                        out = raw[1]
                elif tag == "RegExp":
                    out = raw[1] if len(raw) > 1 else None
                elif tag == "Set":
                    out = [resolve_ref(item) for item in raw[1:]]
                elif tag == "Map":
                    out = {}
                    items = raw[1:]
                    for index in range(0, len(items) - 1, 2):
                        key = resolve_ref(items[index])
                        value = resolve_ref(items[index + 1])
                        out[str(key)] = value
                elif tag in {
                    "URL",
                    "URLSearchParams",
                    "Temporal.PlainDate",
                    "Temporal.PlainDateTime",
                    "Temporal.Instant",
                }:
                    out = raw[1] if len(raw) > 1 else None
                else:
                    out = [resolve_ref(item) for item in raw]
            else:
                out = []
                cache[ref] = out
                out.extend(resolve_ref(item) for item in raw)

            cache[ref] = out
            resolving.discard(ref)
            return out

        cache[ref] = raw
        resolving.discard(ref)
        return raw

    def resolve_inline(raw: Any) -> Any:
        if isinstance(raw, dict):
            return {str(key): resolve_ref(value) for key, value in raw.items()}
        if isinstance(raw, list):
            return [resolve_ref(value) for value in raw]
        return raw

    return resolve_ref(0) if values else None


def decode_sveltekit_payload(payload: Any) -> list[Any]:
    decoded: list[Any] = []

    if not isinstance(payload, dict):
        return [payload]

    nodes = payload.get("nodes")
    if not isinstance(nodes, list):
        return [payload]

    for node in nodes:
        if not isinstance(node, dict):
            continue

        data = node.get("data")
        if data is None:
            continue

        if isinstance(data, list):
            try:
                decoded.append(devalue_unflatten(data))
                continue
            except Exception:
                pass

        decoded.append(data)

    return decoded


# The site's meta description is the game's, with a line of its own marketing
# in front of it: "click and play 9 Kings on spawnd: A fast-paced roguelike
# kingdom builder." That sentence is spawnd talking about spawnd, and the
# panel that prints this is already on a page that says where it came from.
DESCRIPTION_LEAD_IN = re.compile(
    r"^\s*(?:click and play|jogue|juega|play)\b.{0,160}?\b(?:on|no|en)\s+spawnd\s*:\s*",
    re.IGNORECASE,
)


def clean_description(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    cleaned = DESCRIPTION_LEAD_IN.sub("", value).strip()
    return cleaned or None


def extract_meta_description(html: str) -> str | None:
    patterns = (
        r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']description["\']',
        r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:description["\']',
    )
    for pattern in patterns:
        match = re.search(pattern, html, re.IGNORECASE)
        if match:
            return re.sub(r"\s+", " ", match.group(1)).strip()
    return None


def extract_h1(html: str) -> str | None:
    match = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.IGNORECASE | re.DOTALL)
    if not match:
        return None
    text = re.sub(r"<[^>]+>", "", match.group(1))
    text = re.sub(r"\s+", " ", text).strip()
    return text or None


def extract_game_from_candidate(obj: dict[str, Any], slug: str, html: str) -> dict[str, Any]:
    blob = json.dumps(obj, ensure_ascii=False, default=str)

    game_id = as_int(
        first_nonempty(
            pick_key(obj, "spawnd_id"),
            pick_key(obj, "game_id"),
            pick_key(obj, "gameId"),
            pick_key(obj, "id"),
        )
    )
    if game_id is None:
        match = (
            EMBED_RE.search(blob)
            or EMBED_REL_RE.search(blob)
            or EMBED_RE.search(html)
            or EMBED_REL_RE.search(html)
        )
        if match:
            game_id = int(match.group(1))

    steam_url = find_url(obj, STEAM_RE)
    if not steam_url:
        match = STEAM_RE.search(html)
        if match:
            steam_url = match.group(0)

    steam_app_id = as_int(
        first_nonempty(
            pick_key(obj, "steam_app_id"),
            pick_key(obj, "steamAppId"),
            pick_key(obj, "steam_id"),
            pick_key(obj, "steamId"),
        )
    )
    if steam_app_id is None and steam_url:
        match = STEAM_RE.search(steam_url)
        if match:
            steam_app_id = int(match.group(1))

    igdb_id = as_int(
        first_nonempty(
            pick_key(obj, "igdb_id"),
            pick_key(obj, "igdbId"),
            pick_key(obj, "igdb"),
        )
    )
    if igdb_id is None:
        igdb_id = find_int_by_keys(obj, ("igdb_id", "igdbId"))

    name = first_nonempty(
        pick_key(obj, "name"),
        pick_key(obj, "title"),
        pick_key(obj, "game_name"),
        extract_h1(html),
    )

    description = clean_description(
        first_nonempty(
            pick_key(obj, "description"),
            pick_key(obj, "summary"),
            pick_key(obj, "short_description"),
            pick_key(obj, "shortDescription"),
            extract_meta_description(html),
        )
    )

    embed_description = clean_description(
        first_nonempty(
            pick_key(obj, "embed_description"),
            pick_key(obj, "embedDescription"),
            pick_key(obj, "short_description"),
            pick_key(obj, "shortDescription"),
            description,
        )
    )

    platforms = normalize_platforms(
        first_nonempty(
            pick_key(obj, "platforms"),
            pick_key(obj, "platform"),
            pick_key(obj, "supported_platforms"),
            pick_key(obj, "supportedPlatforms"),
        )
    )

    status = normalize_status(
        first_nonempty(
            pick_key(obj, "status"),
            pick_key(obj, "release_status"),
            pick_key(obj, "releaseStatus"),
        ),
        html,
        slug,
    )

    game_type = first_nonempty(
        pick_key(obj, "game_type"),
        pick_key(obj, "gameType"),
        "demo",
    )
    if isinstance(game_type, dict):
        game_type = first_nonempty(game_type.get("slug"), game_type.get("name"), "demo")
    game_type = str(game_type).strip().lower() if game_type else "demo"
    if game_type not in {"demo", "game"}:
        game_type = "demo"

    stores: dict[str, str] = {}
    stores_raw = first_nonempty(
        pick_key(obj, "stores"),
        pick_key(obj, "store_links"),
        pick_key(obj, "storeLinks"),
    )

    if isinstance(stores_raw, dict):
        for key, value in stores_raw.items():
            if isinstance(value, str) and value.startswith("http"):
                stores[str(key).lower()] = value
            elif isinstance(value, dict):
                url = first_nonempty(value.get("url"), value.get("href"), value.get("link"))
                if isinstance(url, str) and url.startswith("http"):
                    stores[str(key).lower()] = url
    elif isinstance(stores_raw, list):
        for item in stores_raw:
            if not isinstance(item, dict):
                continue
            store_name = first_nonempty(item.get("slug"), item.get("name"), item.get("store"))
            store_url = first_nonempty(item.get("url"), item.get("href"), item.get("link"))
            if store_name and isinstance(store_url, str) and store_url.startswith("http"):
                stores[str(store_name).lower()] = store_url

    if steam_url:
        stores["steam"] = steam_url

    wishlist_url = first_nonempty(
        pick_key(obj, "wishlist_url"),
        pick_key(obj, "wishlistUrl"),
        pick_key(obj, "wishlist"),
        steam_url,
    )
    if isinstance(wishlist_url, dict):
        wishlist_url = first_nonempty(
            wishlist_url.get("url"),
            wishlist_url.get("href"),
            steam_url,
        )

    return {
        "spawnd_id": game_id,
        "igdb_id": igdb_id,
        "steam_app_id": steam_app_id,
        "name": name,
        "slug": slug,
        "description": description,
        "embed_description": embed_description,
        "game_type": game_type,
        "status": status,
        "platforms": platforms,
        "game_url": f"{BASE_URL}/{DEFAULT_LANG}/games/{slug}",
        "embed_url": (
            f"{BASE_URL}/-/games/embed/{game_id}?description=true"
            if game_id is not None
            else None
        ),
        "stores": stores,
        "wishlist_url": wishlist_url,
    }


class AsyncSpawndClient:
    def __init__(
        self,
        lang: str = DEFAULT_LANG,
        timeout: int = 30,
        concurrency: int = 16,
        delay: float = 0.0,
    ):
        self.lang = lang
        self.timeout = timeout
        self.delay = max(0.0, delay)
        self.semaphore = asyncio.Semaphore(max(1, concurrency))
        self.session = requests.AsyncSession(
            impersonate="chrome",
            headers={
                "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
                "Referer": f"{BASE_URL}/{lang}",
            },
        )

    async def close(self) -> None:
        await self.session.close()

    async def get(self, path_or_url: str, *, allow_404: bool = False):
        url = path_or_url if path_or_url.startswith("http") else urljoin(BASE_URL, path_or_url)
        last_error: Exception | None = None

        for attempt in range(4):
            try:
                async with self.semaphore:
                    response = await self.session.get(
                        url,
                        timeout=self.timeout,
                        allow_redirects=True,
                    )

                if response.status_code == 404 and allow_404:
                    return None

                if response.status_code == 429:
                    await asyncio.sleep((1.0 + random.random() * 0.5) * (attempt + 1))
                    continue

                if response.status_code >= 500:
                    await asyncio.sleep(0.5 * (2**attempt))
                    continue

                response.raise_for_status()

                if self.delay:
                    await asyncio.sleep(self.delay)

                return response

            except Exception as exc:
                last_error = exc
                if attempt < 3:
                    await asyncio.sleep(0.35 * (2**attempt) + random.random() * 0.15)

        if allow_404 and last_error is not None and "404" in str(last_error):
            return None

        assert last_error is not None
        raise last_error

    async def get_text(self, path_or_url: str, *, allow_404: bool = False) -> str | None:
        response = await self.get(path_or_url, allow_404=allow_404)
        return None if response is None else response.text

    async def get_json(self, path_or_url: str, *, allow_404: bool = False) -> Any:
        response = await self.get(path_or_url, allow_404=allow_404)
        if response is None:
            return None
        return response.json()


STEAM_APPDETAILS = "https://store.steampowered.com/api/appdetails"


async def steam_release(
    app_ids: list[int], concurrency: int, timeout: int
) -> dict[int, dict[str, Any]]:
    """Whether each game is out yet, from the shop that knows.

    spawnd's own pages do not say it in any structured way, and the phrase is
    not reliable in their prose. Steam publishes it per app as a boolean and a
    date, and every game in this catalogue has a Steam id, so this is both the
    authoritative answer and one that is always available.

    A failure here is not a failure of the sync: whatever spawnd said stands,
    and the field keeps whatever the previous file held.
    """
    found: dict[int, dict[str, Any]] = {}
    if not app_ids:
        return found
    semaphore = asyncio.Semaphore(max(1, min(concurrency, 8)))
    session = requests.AsyncSession(impersonate="chrome")

    async def one(app_id: int) -> None:
        async with semaphore:
            for attempt in range(3):
                try:
                    response = await session.get(
                        f"{STEAM_APPDETAILS}?appids={app_id}"
                        "&filters=release_date&cc=us&l=en",
                        timeout=timeout,
                    )
                    if response.status_code == 429:
                        await asyncio.sleep(2.0 * (attempt + 1))
                        continue
                    payload = response.json().get(str(app_id)) or {}
                    if not payload.get("success"):
                        return
                    release = (payload.get("data") or {}).get("release_date") or {}
                    found[app_id] = {
                        "coming_soon": bool(release.get("coming_soon")),
                        "date": release.get("date") or None,
                    }
                    return
                except Exception:
                    await asyncio.sleep(0.4 * (attempt + 1))
        return

    try:
        await asyncio.gather(*(one(app_id) for app_id in app_ids))
    finally:
        await session.close()
    return found


async def discover_from_sitemap(client: AsyncSpawndClient) -> set[str]:
    slugs: set[str] = set()

    text = await client.get_text("/sitemap.xml", allow_404=True)
    if not text:
        return slugs

    try:
        root = ElementTree.fromstring(text)
        locs = [element.text or "" for element in root.iter() if element.tag.endswith("loc")]
    except ElementTree.ParseError:
        locs = re.findall(r"<loc>(.*?)</loc>", text, re.IGNORECASE | re.DOTALL)

    for loc in locs:
        for match in GAME_PATH_RE.finditer(loc.strip()):
            slug = normalize_slug(match.group("slug"))
            if slug:
                slugs.add(slug)

    return slugs


async def discover_from_catalog(client: AsyncSpawndClient) -> set[str]:
    slugs: set[str] = set()

    html_task = asyncio.create_task(client.get_text(f"/{client.lang}/games", allow_404=True))
    data_task = asyncio.create_task(client.get_json(f"/{client.lang}/games/__data.json", allow_404=True))
    home_task = asyncio.create_task(client.get_text(f"/{client.lang}", allow_404=True))
    home_data_task = asyncio.create_task(client.get_json(f"/{client.lang}/__data.json", allow_404=True))

    html, payload, home_html, home_payload = await asyncio.gather(
        html_task,
        data_task,
        home_task,
        home_data_task,
        return_exceptions=True,
    )

    for page_html in (html, home_html):
        if isinstance(page_html, str):
            for match in GAME_HREF_RE.finditer(page_html):
                slug = normalize_slug(match.group("slug"))
                if slug:
                    slugs.add(slug)

    for raw_payload in (payload, home_payload):
        if isinstance(raw_payload, Exception) or raw_payload is None:
            continue

        for decoded in decode_sveltekit_payload(raw_payload):
            slugs.update(collect_game_slugs_from_strings(decoded))

    return slugs


async def discover_slugs(client: AsyncSpawndClient) -> set[str]:
    sitemap_task = asyncio.create_task(discover_from_sitemap(client))
    catalog_task = asyncio.create_task(discover_from_catalog(client))

    sitemap_slugs, catalog_slugs = await asyncio.gather(sitemap_task, catalog_task)

    if sitemap_slugs:
        combined = sitemap_slugs | catalog_slugs
        print(
            f"Descoberta: sitemap={len(sitemap_slugs)} | catálogo={len(catalog_slugs)} | únicos={len(combined)}"
        )
        return combined

    print(f"Descoberta: sitemap indisponível | catálogo={len(catalog_slugs)}")
    return catalog_slugs


async def scrape_game(client: AsyncSpawndClient, slug: str) -> dict[str, Any]:
    page_path = f"/{client.lang}/games/{slug}"

    html_task = asyncio.create_task(client.get_text(page_path, allow_404=True))
    data_task = asyncio.create_task(client.get_json(f"{page_path}/__data.json", allow_404=True))

    html_result, payload_result = await asyncio.gather(
        html_task,
        data_task,
        return_exceptions=True,
    )

    if isinstance(html_result, Exception):
        raise html_result
    if html_result is None:
        raise FileNotFoundError("página do jogo retornou 404")

    html = html_result
    candidates: list[dict[str, Any]] = []

    if not isinstance(payload_result, Exception) and payload_result is not None:
        for decoded in decode_sveltekit_payload(payload_result):
            candidates.extend(collect_game_dicts(decoded, wanted_slug=slug))

    best = max(candidates, key=lambda obj: score_game_dict(obj, slug)) if candidates else {"slug": slug}
    game = extract_game_from_candidate(best, slug, html)

    if game["spawnd_id"] is None:
        match = EMBED_RE.search(html) or EMBED_REL_RE.search(html)
        if match:
            game["spawnd_id"] = int(match.group(1))
            game["embed_url"] = f"{BASE_URL}/-/games/embed/{game['spawnd_id']}?description=true"

    if not game["name"]:
        raise RuntimeError("nome não encontrado")

    return game


def load_old(path: Path | None) -> dict[str, dict[str, Any]]:
    if path is None or not path.exists():
        return {}

    with path.open("r", encoding="utf-8") as file:
        payload = json.load(file)

    out: dict[str, dict[str, Any]] = {}
    for game in payload.get("games", []):
        slug = normalize_slug(game.get("slug"))
        if slug:
            out[slug] = game
    return out


def merge_game(new: dict[str, Any], old: dict[str, Any] | None) -> dict[str, Any]:
    if not old:
        return new

    merged = dict(new)

    for key in (
        "spawnd_id",
        "igdb_id",
        "steam_app_id",
        "name",
        "description",
        "embed_description",
        "release_date",
        "released",
        "game_type",
        "status",
        "wishlist_url",
    ):
        if merged.get(key) in (None, "", []):
            merged[key] = old.get(key)

    if not merged.get("platforms"):
        merged["platforms"] = old.get("platforms", [])

    stores = dict(old.get("stores") or {})
    stores.update(merged.get("stores") or {})
    merged["stores"] = stores

    if merged.get("spawnd_id") is not None:
        merged["embed_url"] = f"{BASE_URL}/-/games/embed/{merged['spawnd_id']}?description=true"

    return merged


def validate_games(games: list[dict[str, Any]]) -> None:
    slugs: set[str] = set()
    ids: set[int] = set()

    for game in games:
        slug = game.get("slug")
        if not slug:
            raise ValueError(f"jogo sem slug: {game}")
        if slug in slugs:
            raise ValueError(f"slug duplicado: {slug}")
        slugs.add(slug)

        spawnd_id = game.get("spawnd_id")
        if isinstance(spawnd_id, int):
            if spawnd_id in ids:
                raise ValueError(f"spawnd_id duplicado: {spawnd_id}")
            ids.add(spawnd_id)


def read_payload(path: Path) -> dict[str, Any] | None:
    """The catalogue as it stands, or None if there is not one yet."""
    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return loaded if isinstance(loaded, dict) else None


def write_atomically(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(
        "w", encoding="utf-8", newline="", dir=path.parent, delete=False
    ) as handle:
        handle.write(text)
        temporary = Path(handle.name)
    temporary.replace(path)


async def run(args: argparse.Namespace) -> int:
    output = Path(args.output)
    # A re-run merges against the catalogue it is about to replace, so a field
    # the site stopped rendering is kept rather than dropped.
    old_path = Path(args.old) if args.old else (output if output.exists() else None)
    old_by_slug = load_old(old_path)

    client = AsyncSpawndClient(
        lang=args.lang,
        timeout=args.timeout,
        concurrency=args.concurrency,
        delay=args.delay,
    )

    try:
        print("Descobrindo jogos reais...")
        slugs = await discover_slugs(client)

        if not slugs:
            print("Nenhum jogo encontrado.", file=sys.stderr)
            return 2

        ordered_slugs = sorted(slugs)
        total = len(ordered_slugs)
        print(f"{total} jogos candidatos. Coletando assincronamente com concorrência={args.concurrency}...")

        async def one(slug: str):
            try:
                game = await scrape_game(client, slug)
                return slug, merge_game(game, old_by_slug.get(slug)), None
            except FileNotFoundError:
                return slug, None, "404"
            except Exception as exc:
                return slug, None, str(exc)

        tasks = [asyncio.create_task(one(slug)) for slug in ordered_slugs]

        games: list[dict[str, Any]] = []
        errors: list[tuple[str, str]] = []
        ignored_404 = 0
        done = 0

        for future in asyncio.as_completed(tasks):
            slug, game, error = await future
            done += 1

            if game is not None:
                games.append(game)
                print(f"[{done}/{total}] OK   {slug}")
            elif error == "404":
                ignored_404 += 1
            else:
                errors.append((slug, error or "erro desconhecido"))
                print(f"[{done}/{total}] ERRO {slug}: {error}", file=sys.stderr)

        games.sort(key=lambda game: ((game.get("name") or "").casefold(), game["slug"]))

        # Steam answers a different question from `status`: whether the full
        # game has shipped, where `status` is whether the demo can be played
        # here today. Both are worth saying and neither replaces the other.
        if not args.no_steam:
            app_ids = sorted(
                {
                    game["steam_app_id"]
                    for game in games
                    if isinstance(game.get("steam_app_id"), int)
                }
            )
            print(f"Consultando a Steam sobre {len(app_ids)} apps...")
            releases = await steam_release(app_ids, args.concurrency, args.timeout)
            out = 0
            for game in games:
                release = releases.get(game.get("steam_app_id") or -1)
                if not release:
                    continue
                game["released"] = not release["coming_soon"]
                game["release_date"] = release["date"]
                out += game["released"]
            print(f"Steam respondeu sobre {len(releases)}; {out} jogos ja lancados")

        validate_games(games)

        by_igdb_id = {
            str(game["igdb_id"]): game
            for game in games
            if isinstance(game.get("igdb_id"), int)
        }

        # The timestamp is the only field that moves on its own, so a run
        # that found exactly what the file already holds keeps the old one.
        # Without that, every run is a commit that changes one line and
        # says nothing.
        previous = read_payload(output)
        unchanged = (
            previous is not None
            and previous.get("games") == games
            and previous.get("by_igdb_id") == by_igdb_id
        )
        payload = {
            "generated_at": (
                previous["generated_at"]
                if unchanged and previous.get("generated_at")
                else datetime.now(timezone.utc).isoformat()
            ),
            "count": len(games),
            "games": games,
            "by_igdb_id": by_igdb_id,
        }

        # Written beside the target and moved into place: a run that dies
        # halfway through must not leave the site with half a catalogue,
        # and this file is imported at build time.
        write_atomically(
            output, json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
        )

        print()
        print(f"Salvo: {output}" + (" (sem mudanças)" if unchanged else ""))
        print(f"Jogos válidos: {len(games)}")
        print(f"Com IGDB: {len(by_igdb_id)}")
        if ignored_404:
            print(f"Candidatos descartados silenciosamente por 404: {ignored_404}")
        print(f"Erros reais: {len(errors)}")

        if errors:
            print("\nFalhas reais:")
            for slug, error in errors:
                print(f"  - {slug}: {error}")
            return 1

        return 0

    finally:
        await client.close()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Sincroniza assincronamente o catálogo público do Spawnd.gg."
    )
    parser.add_argument(
        "-o",
        "--output",
        default=str(DEFAULT_OUTPUT),
        help="Onde gravar o catálogo (padrão: data/spawnd-games.json)",
    )
    parser.add_argument(
        "--old",
        help=(
            "JSON antigo para preservar metadados ausentes. "
            "Por padrão é o próprio arquivo de saída, quando ele já existe."
        ),
    )
    parser.add_argument("--lang", default=DEFAULT_LANG, choices=list(LANGS))
    parser.add_argument("--concurrency", type=int, default=16)
    parser.add_argument("--delay", type=float, default=0.0)
    parser.add_argument("--timeout", type=int, default=25)
    parser.add_argument(
        "--no-steam",
        action="store_true",
        help="Não consultar a Steam sobre datas de lançamento",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    return asyncio.run(run(args))


if __name__ == "__main__":
    raise SystemExit(main())

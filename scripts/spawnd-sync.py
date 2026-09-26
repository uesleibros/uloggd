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
DEFAULT_LANG = "en"
LANGS = ("en", "pt", "es", "ja", "zh", "ko")

GAME_PATH_RE = re.compile(
    r"/(?:en|pt|es|ja|zh|ko|-)/games/(?P<slug>[a-z0-9][a-z0-9-]*)(?:[/?#'\"\\]|$)",
    re.IGNORECASE,
)
DATA_GAME_ID_RE = re.compile(r"data-game-id=[\"'](?P<id>\d+)[\"']", re.IGNORECASE)
DATA_GAME_SLUG_RE = re.compile(
    r"data-game-slug=[\"'](?P<slug>[a-z0-9][a-z0-9-]*)[\"']",
    re.IGNORECASE,
)
EMBED_RE = re.compile(
    r"https?://(?:www\.)?spawnd\.gg/(?:-|en|pt|es|ja|zh|ko)/games/embed/(?P<id>\d+)",
    re.IGNORECASE,
)
EMBED_REL_RE = re.compile(
    r"/(?:-|en|pt|es|ja|zh|ko)/games/embed/(?P<id>\d+)",
    re.IGNORECASE,
)
STEAM_RE = re.compile(
    r"https?://store\.steampowered\.com/app/(?P<id>\d+)(?:/[^\"'<>\s]*)?",
    re.IGNORECASE,
)

INVALID_GAME_SLUGS = {"embed", "play"}

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
    "active": "published",
    "coming_soon": "coming_soon",
    "coming soon": "coming_soon",
    "upcoming": "coming_soon",
    "draft": "coming_soon",
}

GAME_MARKER_KEYS = {
    "status",
    "gametype",
    "game_type",
    "isfeatured",
    "featured",
    "librarycapsuleimage",
    "maincapsuleimage",
    "microtrailervideo",
    "publishedat",
    "published_at",
    "releasedate",
    "release_date",
    "steamappid",
    "steam_app_id",
    "wishlisturl",
    "wishlist_url",
    "platforms",
    "screenshots",
    "description",
    "shortdescription",
    "embeddescription",
}


# ---------------------------------------------------------------------------
# Generic helpers
# ---------------------------------------------------------------------------


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
        match = re.fullmatch(r"\s*(\d+)\s*", value)
        if match:
            return int(match.group(1))
    return None


def normalize_slug(value: Any) -> str | None:
    if not isinstance(value, str):
        return None

    value = value.strip()
    if not value:
        return None

    path_match = GAME_PATH_RE.search(value)
    if path_match:
        value = path_match.group("slug")
    else:
        value = value.strip("/").split("?", 1)[0].split("#", 1)[0]
        if "/" in value:
            value = value.rsplit("/", 1)[-1]

    value = value.lower().strip()
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", value):
        return None
    if value in INVALID_GAME_SLUGS:
        return None
    return value


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
        key = name.lower()
        if key in lowered:
            return lowered[key]
    return None


def find_url(value: Any, pattern: re.Pattern[str]) -> str | None:
    for node in walk(value):
        if not isinstance(node, str):
            continue
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
            if str(key).lower() not in wanted:
                continue
            parsed = as_int(candidate)
            if parsed is not None:
                return parsed
    return None


def merge_record(base: dict[str, Any] | None, extra: dict[str, Any] | None) -> dict[str, Any]:
    out = dict(base or {})
    if not extra:
        return out

    for key, value in extra.items():
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        if isinstance(value, (list, dict)) and not value:
            continue

        old = out.get(key)
        if old is None or old == "" or old == [] or old == {}:
            out[key] = value
            continue

        # Page-specific records are usually richer, so allow non-empty scalar
        # values in `extra` to replace older scalar values.
        if not isinstance(value, (dict, list)):
            out[key] = value

    return out


# ---------------------------------------------------------------------------
# SvelteKit / devalue decoding
# ---------------------------------------------------------------------------


def devalue_unflatten(values: list[Any]) -> Any:
    """Decode the flattened structure used by SvelteKit's __data.json.

    Spawnd stores the actual page data as a table. Integers inside objects and
    arrays are indexes into that table. Literal numeric values, such as the
    Spawnd game id, live at their own table index and resolve normally.
    """

    memo: dict[int, Any] = {}
    visiting: set[int] = set()

    def resolve(ref: Any) -> Any:
        if not isinstance(ref, int) or isinstance(ref, bool):
            return inline(ref)

        # devalue uses negative integers as special/sentinel values. None is
        # sufficient for the fields we consume from Spawnd.
        if ref < 0:
            return None

        if ref >= len(values):
            return ref

        if ref in memo:
            return memo[ref]
        if ref in visiting:
            return memo.get(ref)

        visiting.add(ref)
        raw = values[ref]

        if isinstance(raw, dict):
            out: dict[str, Any] = {}
            memo[ref] = out
            for key, value in raw.items():
                out[str(key)] = resolve(value)
            visiting.discard(ref)
            return out

        if isinstance(raw, list):
            # Handle the few common tagged devalue containers, while keeping
            # normal arrays working exactly like Spawnd's current payload.
            if raw and isinstance(raw[0], str):
                tag = raw[0]
                if tag == "Date" and len(raw) > 1:
                    out: Any = raw[1]
                elif tag == "BigInt" and len(raw) > 1:
                    try:
                        out = int(raw[1])
                    except (TypeError, ValueError):
                        out = raw[1]
                elif tag == "Set":
                    out = [resolve(item) for item in raw[1:]]
                elif tag == "Map":
                    mapped: dict[str, Any] = {}
                    pairs = raw[1:]
                    for index in range(0, len(pairs) - 1, 2):
                        mapped[str(resolve(pairs[index]))] = resolve(pairs[index + 1])
                    out = mapped
                else:
                    out = [resolve(item) for item in raw]
            else:
                out = []
                memo[ref] = out
                out.extend(resolve(item) for item in raw)

            memo[ref] = out
            visiting.discard(ref)
            return out

        memo[ref] = raw
        visiting.discard(ref)
        return raw

    def inline(raw: Any) -> Any:
        if isinstance(raw, dict):
            return {str(key): resolve(value) for key, value in raw.items()}
        if isinstance(raw, list):
            return [resolve(value) for value in raw]
        return raw

    return resolve(0) if values else None


def decode_sveltekit_payload(payload: Any) -> list[Any]:
    if not isinstance(payload, dict):
        return [payload]

    nodes = payload.get("nodes")
    if not isinstance(nodes, list):
        return [payload]

    decoded: list[Any] = []
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


# ---------------------------------------------------------------------------
# Spawnd game identity discovery
# ---------------------------------------------------------------------------


def looks_like_game_record(obj: dict[str, Any]) -> bool:
    slug = normalize_slug(pick_key(obj, "slug", "gameSlug", "game_slug"))
    game_id = as_int(pick_key(obj, "id", "gameId", "game_id", "spawnd_id"))
    name = first_nonempty(pick_key(obj, "name"), pick_key(obj, "title"))

    if not slug or game_id is None or not name:
        return False

    keys = {str(key).replace("-", "").lower() for key in obj.keys()}
    markers = {key.replace("-", "").lower() for key in GAME_MARKER_KEYS}
    return bool(keys & markers)


def collect_live_game_records(payload: Any) -> dict[str, dict[str, Any]]:
    records: dict[str, dict[str, Any]] = {}

    if payload is None:
        return records

    decoded_roots = decode_sveltekit_payload(payload)
    for root in decoded_roots:
        for node in walk(root):
            if not isinstance(node, dict) or not looks_like_game_record(node):
                continue

            slug = normalize_slug(pick_key(node, "slug", "gameSlug", "game_slug"))
            if not slug:
                continue

            current = records.get(slug)
            if current is None:
                records[slug] = dict(node)
            else:
                # Prefer the object with more keys, but keep useful values from
                # both copies (featured/new/published lists can duplicate games).
                if len(node) >= len(current):
                    records[slug] = merge_record(current, node)
                else:
                    records[slug] = merge_record(node, current)

    return records


def find_exact_game_record(payload: Any, slug: str) -> dict[str, Any] | None:
    matches: list[dict[str, Any]] = []

    for root in decode_sveltekit_payload(payload):
        for node in walk(root):
            if not isinstance(node, dict):
                continue
            node_slug = normalize_slug(
                first_nonempty(
                    pick_key(node, "slug"),
                    pick_key(node, "gameSlug"),
                    pick_key(node, "game_slug"),
                    pick_key(node, "url"),
                    pick_key(node, "href"),
                )
            )
            if node_slug != slug:
                continue
            matches.append(node)

    if not matches:
        return None

    def score(obj: dict[str, Any]) -> tuple[int, int]:
        game_id = as_int(
            first_nonempty(
                pick_key(obj, "id"),
                pick_key(obj, "gameId"),
                pick_key(obj, "game_id"),
                pick_key(obj, "spawnd_id"),
            )
        )
        keys = {str(key).lower() for key in obj.keys()}
        useful = sum(
            key in keys
            for key in (
                "description",
                "status",
                "platforms",
                "stores",
                "steamappid",
                "steam_app_id",
                "wishlisturl",
                "wishlist_url",
                "gametype",
                "game_type",
                "librarycapsuleimage",
                "maincapsuleimage",
            )
        )
        return (100 if game_id is not None else 0) + useful, len(obj)

    return max(matches, key=score)


def extract_html_game_ids(html: str) -> dict[str, int]:
    """Extract the authoritative data-game-id/data-game-slug pairs from SSR HTML."""
    out: dict[str, int] = {}
    if not html:
        return out

    # Best case: both attributes are on the same element.
    for tag_match in re.finditer(r"<[^>]{1,3000}>", html, re.DOTALL):
        tag = tag_match.group(0)
        id_match = DATA_GAME_ID_RE.search(tag)
        slug_match = DATA_GAME_SLUG_RE.search(tag)
        if not id_match or not slug_match:
            continue
        slug = normalize_slug(slug_match.group("slug"))
        if slug:
            out[slug] = int(id_match.group("id"))

    # Current Spawnd markup can place the two data attributes on nearby nested
    # elements. This mirrors the structure used by the site's cards without
    # guessing arbitrary numeric IDs.
    id_matches = list(DATA_GAME_ID_RE.finditer(html))
    for index, id_match in enumerate(id_matches):
        start = id_match.start()
        end = id_matches[index + 1].start() if index + 1 < len(id_matches) else min(len(html), start + 1800)
        chunk = html[start:end]
        slug_match = DATA_GAME_SLUG_RE.search(chunk)
        if not slug_match:
            chunk = html[max(0, start - 700):min(len(html), id_match.end() + 1100)]
            slug_match = DATA_GAME_SLUG_RE.search(chunk)
        if not slug_match:
            continue
        slug = normalize_slug(slug_match.group("slug"))
        if slug:
            out.setdefault(slug, int(id_match.group("id")))

    return out


def collect_slugs_from_text(text: str) -> set[str]:
    slugs: set[str] = set()
    if not text:
        return slugs
    for match in GAME_PATH_RE.finditer(text):
        slug = normalize_slug(match.group("slug"))
        if slug:
            slugs.add(slug)
    return slugs


def game_id_from_record(record: dict[str, Any] | None) -> int | None:
    if not record:
        return None
    return as_int(
        first_nonempty(
            pick_key(record, "spawnd_id"),
            pick_key(record, "game_id"),
            pick_key(record, "gameId"),
            pick_key(record, "id"),
        )
    )


# ---------------------------------------------------------------------------
# Metadata extraction
# ---------------------------------------------------------------------------


def has_play_route(html: str, slug: str) -> bool:
    if not html or not slug:
        return False

    escaped_slug = re.escape(slug)
    patterns = (
        rf"/(?:en|pt|es|ja|zh|ko|-)/games/{escaped_slug}/play(?:[/?#\"'\s<]|$)",
        rf"href=[\"'][^\"']*/games/{escaped_slug}/play(?:[/?#\"']|$)",
    )
    return any(re.search(pattern, html, re.IGNORECASE) for pattern in patterns)


def normalize_status(value: Any, html: str, slug: str) -> str:
    if isinstance(value, dict):
        value = first_nonempty(value.get("slug"), value.get("name"), value.get("status"))

    if value is not None:
        key = str(value).strip().lower().replace("-", "_")
        mapped = STATUS_ALIASES.get(key) or STATUS_ALIASES.get(key.replace("_", " "))
        if mapped == "published":
            return "published"
        if mapped == "coming_soon" and not has_play_route(html, slug):
            return "coming_soon"

    # A /play route is direct evidence that the demo is launchable on Spawnd,
    # regardless of the commercial release date shown on the game page.
    if has_play_route(html, slug):
        return "published"

    return "coming_soon"


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
            )
        if item is None:
            continue

        key = str(item).strip().lower().replace("-", "_")
        mapped = PLATFORM_ALIASES.get(key) or PLATFORM_ALIASES.get(key.replace("_", " "))
        if mapped and mapped not in out:
            out.append(mapped)

    return out


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


def extract_stores(record: dict[str, Any], html: str) -> tuple[dict[str, str], str | None, int | None]:
    stores: dict[str, str] = {}

    raw = first_nonempty(
        pick_key(record, "stores"),
        pick_key(record, "store_links"),
        pick_key(record, "storeLinks"),
    )

    if isinstance(raw, dict):
        for key, value in raw.items():
            if isinstance(value, str) and value.startswith("http"):
                stores[str(key).lower()] = value
            elif isinstance(value, dict):
                url = first_nonempty(value.get("url"), value.get("href"), value.get("link"))
                if isinstance(url, str) and url.startswith("http"):
                    stores[str(key).lower()] = url
    elif isinstance(raw, list):
        for item in raw:
            if not isinstance(item, dict):
                continue
            name = first_nonempty(item.get("slug"), item.get("name"), item.get("store"))
            url = first_nonempty(item.get("url"), item.get("href"), item.get("link"))
            if name and isinstance(url, str) and url.startswith("http"):
                stores[str(name).lower()] = url

    steam_url = find_url(record, STEAM_RE)
    if not steam_url:
        match = STEAM_RE.search(html)
        if match:
            steam_url = match.group(0)

    if steam_url:
        stores["steam"] = steam_url

    steam_app_id = as_int(
        first_nonempty(
            pick_key(record, "steam_app_id"),
            pick_key(record, "steamAppId"),
            pick_key(record, "steam_id"),
            pick_key(record, "steamId"),
        )
    )
    if steam_app_id is None and steam_url:
        match = STEAM_RE.search(steam_url)
        if match:
            steam_app_id = int(match.group("id"))

    return stores, steam_url, steam_app_id


def extract_game(record: dict[str, Any], slug: str, html: str, known_id: int | None) -> dict[str, Any]:
    html_ids = extract_html_game_ids(html)

    game_id = first_nonempty(
        game_id_from_record(record),
        known_id,
        html_ids.get(slug),
    )
    game_id = as_int(game_id)

    if game_id is None:
        # Last-resort extraction from an actual embed URL serialized in the page.
        blob = json.dumps(record, ensure_ascii=False, default=str)
        match = EMBED_RE.search(blob) or EMBED_REL_RE.search(blob) or EMBED_RE.search(html) or EMBED_REL_RE.search(html)
        if match:
            game_id = int(match.group("id"))

    name = first_nonempty(
        pick_key(record, "name"),
        pick_key(record, "title"),
        pick_key(record, "game_name"),
        extract_h1(html),
    )

    description = clean_description(
        first_nonempty(
            pick_key(record, "description"),
            pick_key(record, "summary"),
            pick_key(record, "shortDescription"),
            pick_key(record, "short_description"),
            extract_meta_description(html),
        )
    )

    embed_description = clean_description(
        first_nonempty(
            pick_key(record, "embedDescription"),
            pick_key(record, "embed_description"),
            pick_key(record, "shortDescription"),
            pick_key(record, "short_description"),
            description,
        )
    )

    igdb_id = as_int(
        first_nonempty(
            pick_key(record, "igdb_id"),
            pick_key(record, "igdbId"),
            pick_key(record, "igdb"),
        )
    )
    if igdb_id is None:
        igdb_id = find_int_by_keys(record, ("igdb_id", "igdbId"))

    stores, steam_url, steam_app_id = extract_stores(record, html)

    wishlist_url = first_nonempty(
        pick_key(record, "wishlist_url"),
        pick_key(record, "wishlistUrl"),
        pick_key(record, "wishlist"),
        steam_url,
    )
    if isinstance(wishlist_url, dict):
        wishlist_url = first_nonempty(
            wishlist_url.get("url"),
            wishlist_url.get("href"),
            steam_url,
        )

    platforms = normalize_platforms(
        first_nonempty(
            pick_key(record, "platforms"),
            pick_key(record, "platform"),
            pick_key(record, "supportedPlatforms"),
            pick_key(record, "supported_platforms"),
        )
    )

    status = normalize_status(
        first_nonempty(
            pick_key(record, "status"),
            pick_key(record, "releaseStatus"),
            pick_key(record, "release_status"),
        ),
        html,
        slug,
    )

    game_type = first_nonempty(
        pick_key(record, "gameType"),
        pick_key(record, "game_type"),
        "demo",
    )
    if isinstance(game_type, dict):
        game_type = first_nonempty(game_type.get("slug"), game_type.get("name"), "demo")
    game_type = str(game_type).strip().lower() if game_type else "demo"
    if game_type not in {"demo", "game", "tech"}:
        game_type = "demo"

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


# ---------------------------------------------------------------------------
# Async HTTP
# ---------------------------------------------------------------------------


class AsyncSpawndClient:
    def __init__(
        self,
        lang: str = DEFAULT_LANG,
        timeout: int = 25,
        concurrency: int = 24,
        delay: float = 0.0,
    ):
        self.lang = lang
        self.timeout = timeout
        self.delay = max(0.0, delay)
        self.semaphore = asyncio.Semaphore(max(1, concurrency))
        self.session = requests.AsyncSession(
            impersonate="chrome",
            headers={
                "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
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
                    await asyncio.sleep((0.8 + random.random() * 0.4) * (attempt + 1))
                    continue

                if response.status_code >= 500:
                    await asyncio.sleep(0.35 * (2**attempt))
                    continue

                response.raise_for_status()

                if self.delay:
                    await asyncio.sleep(self.delay)

                return response

            except Exception as exc:
                last_error = exc
                if attempt < 3:
                    await asyncio.sleep(0.25 * (2**attempt) + random.random() * 0.10)

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


# ---------------------------------------------------------------------------
# Discovery
# ---------------------------------------------------------------------------


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


async def discover_sitemap(client: AsyncSpawndClient) -> set[str]:
    text = await client.get_text("/sitemap.xml", allow_404=True)
    if not text:
        return set()

    try:
        root = ElementTree.fromstring(text)
        locations = [element.text or "" for element in root.iter() if element.tag.endswith("loc")]
    except ElementTree.ParseError:
        locations = re.findall(r"<loc>(.*?)</loc>", text, re.IGNORECASE | re.DOTALL)

    slugs: set[str] = set()
    for location in locations:
        slugs.update(collect_slugs_from_text(location))
    return slugs


async def discover_games(client: AsyncSpawndClient) -> dict[str, dict[str, Any]]:
    requests_map = {
        "home_html": asyncio.create_task(client.get_text(f"/{client.lang}", allow_404=True)),
        "home_data": asyncio.create_task(client.get_json(f"/{client.lang}/__data.json", allow_404=True)),
        "catalog_html": asyncio.create_task(client.get_text(f"/{client.lang}/games", allow_404=True)),
        "catalog_data": asyncio.create_task(client.get_json(f"/{client.lang}/games/__data.json", allow_404=True)),
        "sitemap": asyncio.create_task(discover_sitemap(client)),
    }

    keys = list(requests_map)
    results = await asyncio.gather(*requests_map.values(), return_exceptions=True)
    fetched = dict(zip(keys, results))

    refs: dict[str, dict[str, Any]] = {}

    def ensure(slug: str) -> dict[str, Any]:
        return refs.setdefault(slug, {"slug": slug, "spawnd_id": None, "record": {}})

    # 1) Live Svelte data. This is the strongest source because each game
    # object carries its numeric database id directly.
    live_records: dict[str, dict[str, Any]] = {}
    for key in ("home_data", "catalog_data"):
        payload = fetched.get(key)
        if isinstance(payload, Exception) or payload is None:
            continue
        for slug, record in collect_live_game_records(payload).items():
            if slug in live_records:
                live_records[slug] = merge_record(live_records[slug], record)
            else:
                live_records[slug] = record

    for slug, record in live_records.items():
        ref = ensure(slug)
        ref["record"] = merge_record(ref.get("record"), record)
        game_id = game_id_from_record(record)
        if game_id is not None:
            ref["spawnd_id"] = game_id

    # 2) SSR data attributes. Spawnd's game cards expose the same numeric id as
    # data-game-id and the canonical slug as data-game-slug.
    html_id_count = 0
    for key in ("home_html", "catalog_html"):
        html = fetched.get(key)
        if isinstance(html, Exception) or not isinstance(html, str):
            continue

        ids = extract_html_game_ids(html)
        html_id_count += len(ids)
        for slug, game_id in ids.items():
            ref = ensure(slug)
            if ref.get("spawnd_id") is None:
                ref["spawnd_id"] = game_id

        for slug in collect_slugs_from_text(html):
            ensure(slug)

    # 3) Sitemap only contributes canonical game slugs; it never invents ids.
    sitemap_slugs = fetched.get("sitemap")
    if isinstance(sitemap_slugs, set):
        for slug in sitemap_slugs:
            ensure(slug)

    with_id = sum(1 for ref in refs.values() if isinstance(ref.get("spawnd_id"), int))
    print(
        "Descoberta: "
        f"jogos={len(refs)} | ids no __data={sum(game_id_from_record(r) is not None for r in live_records.values())} "
        f"| pares data-game-id={html_id_count} | ids resolvidos={with_id}"
    )

    return refs


# ---------------------------------------------------------------------------
# Per-game scrape
# ---------------------------------------------------------------------------


async def scrape_game(client: AsyncSpawndClient, ref: dict[str, Any]) -> dict[str, Any]:
    slug = ref["slug"]
    known_id = as_int(ref.get("spawnd_id"))
    known_record = ref.get("record") if isinstance(ref.get("record"), dict) else {}

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
    record = dict(known_record)

    if not isinstance(payload_result, Exception) and payload_result is not None:
        exact = find_exact_game_record(payload_result, slug)
        if exact:
            record = merge_record(record, exact)

    game = extract_game(record, slug, html, known_id)

    if not game.get("name"):
        raise RuntimeError("nome não encontrado")

    # A null ID creates a broken embed. Never silently write that to the final
    # catalog: fail the item so it is visible in the log and can be investigated.
    if game.get("spawnd_id") is None:
        raise RuntimeError("spawnd_id não encontrado; embed não pode ser gerado")

    return game


async def verify_embed(client: AsyncSpawndClient, game: dict[str, Any]) -> bool:
    url = game.get("embed_url")
    if not isinstance(url, str) or not url:
        return False
    response = await client.get(url, allow_404=True)
    return response is not None


# ---------------------------------------------------------------------------
# Old catalog merge / validation / output
# ---------------------------------------------------------------------------


def load_old(path: Path | None) -> dict[str, dict[str, Any]]:
    if path is None or not path.exists():
        return {}

    with path.open("r", encoding="utf-8") as file:
        payload = json.load(file)

    out: dict[str, dict[str, Any]] = {}
    for game in payload.get("games", []):
        if not isinstance(game, dict):
            continue
        slug = normalize_slug(game.get("slug"))
        if slug:
            out[slug] = game
    return out


def merge_game(new: dict[str, Any], old: dict[str, Any] | None) -> dict[str, Any]:
    if not old:
        return new

    merged = dict(new)

    # Current Spawnd identity/status always wins. The old JSON is only a source
    # for metadata fields that Spawnd no longer exposes publicly.
    for key in (
        "igdb_id",
        "steam_app_id",
        "name",
        "description",
        "embed_description",
        "game_type",
        "wishlist_url",
        # Steam's two. A run made with --no-steam keeps what the last one
        # learned rather than dropping both facts on the floor.
        "release_date",
        "released",
    ):
        if merged.get(key) in (None, "", []):
            merged[key] = old.get(key)

    if not merged.get("platforms"):
        merged["platforms"] = old.get("platforms", [])

    stores = dict(old.get("stores") or {})
    stores.update(merged.get("stores") or {})
    merged["stores"] = stores

    # `spawnd_id` from the live site is authoritative. Use the old id only when
    # live discovery truly did not resolve one.
    if merged.get("spawnd_id") is None:
        merged["spawnd_id"] = as_int(old.get("spawnd_id"))

    if merged.get("spawnd_id") is not None:
        merged["embed_url"] = (
            f"{BASE_URL}/-/games/embed/{merged['spawnd_id']}?description=true"
        )

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
        if not isinstance(spawnd_id, int):
            raise ValueError(f"spawnd_id ausente para {slug}")
        if spawnd_id in ids:
            raise ValueError(f"spawnd_id duplicado: {spawnd_id}")
        ids.add(spawnd_id)

        expected_embed = f"{BASE_URL}/-/games/embed/{spawnd_id}?description=true"
        if game.get("embed_url") != expected_embed:
            raise ValueError(f"embed_url inválido para {slug}")


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
        print("Descobrindo jogos e IDs oficiais do Spawnd...")
        refs = await discover_games(client)

        if not refs:
            print("Nenhum jogo encontrado.", file=sys.stderr)
            return 2

        ordered_refs = [refs[slug] for slug in sorted(refs)]
        total = len(ordered_refs)
        preknown_ids = sum(1 for ref in ordered_refs if isinstance(ref.get("spawnd_id"), int))
        print(
            f"{total} jogos candidatos | {preknown_ids} IDs já resolvidos antes das páginas individuais "
            f"| concorrência={args.concurrency}"
        )

        async def one(ref: dict[str, Any]):
            slug = ref["slug"]
            try:
                game = await scrape_game(client, ref)
                game = merge_game(game, old_by_slug.get(slug))

                # Old-data merge may rescue an id for a rare record, so enforce
                # the invariant after merge as well.
                if game.get("spawnd_id") is None:
                    return slug, None, "spawnd_id ausente"

                return slug, game, None
            except FileNotFoundError:
                return slug, None, "404"
            except Exception as exc:
                return slug, None, str(exc)

        tasks = [asyncio.create_task(one(ref)) for ref in ordered_refs]

        games: list[dict[str, Any]] = []
        errors: list[tuple[str, str]] = []
        ignored_404 = 0
        done = 0

        for future in asyncio.as_completed(tasks):
            slug, game, error = await future
            done += 1

            if game is not None:
                games.append(game)
                print(
                    f"[{done}/{total}] OK   {slug} "
                    f"| id={game['spawnd_id']} | status={game['status']}"
                )
            elif error == "404":
                ignored_404 += 1
            else:
                errors.append((slug, error or "erro desconhecido"))
                print(f"[{done}/{total}] ERRO {slug}: {error}", file=sys.stderr)

        games.sort(key=lambda game: ((game.get("name") or "").casefold(), game["slug"]))
        validate_games(games)

        if args.validate_embeds:
            print(f"Validando {len(games)} embeds em paralelo...")

            async def validate_one(game: dict[str, Any]):
                try:
                    ok = await verify_embed(client, game)
                    return game, ok, None
                except Exception as exc:
                    return game, False, str(exc)

            checks = [asyncio.create_task(validate_one(game)) for game in games]
            valid_games: list[dict[str, Any]] = []
            for future in asyncio.as_completed(checks):
                game, ok, error = await future
                if ok:
                    valid_games.append(game)
                else:
                    errors.append((game["slug"], f"embed inválido: {error or '404'}"))
                    print(
                        f"ERRO embed {game['slug']} -> {game['embed_url']}: {error or '404'}",
                        file=sys.stderr,
                    )
            games = sorted(
                valid_games,
                key=lambda game: ((game.get("name") or "").casefold(), game["slug"]),
            )
            validate_games(games)

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
        print(f"Com Spawnd ID: {sum(isinstance(g.get('spawnd_id'), int) for g in games)}/{len(games)}")
        print(f"Com IGDB: {len(by_igdb_id)}")
        if ignored_404:
            print(f"Candidatos descartados por 404: {ignored_404}")
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
        description="Sincroniza assincronamente jogos, IDs e embeds do Spawnd.gg."
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
    parser.add_argument("--concurrency", type=int, default=24)
    parser.add_argument("--delay", type=float, default=0.0)
    parser.add_argument("--timeout", type=int, default=25)
    parser.add_argument(
        "--no-steam",
        action="store_true",
        help="Não consultar a Steam sobre datas de lançamento",
    )
    parser.add_argument(
        "--validate-embeds",
        action="store_true",
        help="Faz um GET em cada embed final e remove/reporta embeds que retornarem 404.",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    return asyncio.run(run(args))


if __name__ == "__main__":
    raise SystemExit(main())

# The spawnd catalogue

[spawnd.gg](https://www.spawnd.gg) is Nuuvem's platform for playing PC demos
in the browser. The partnership with them is why a game page here can offer
one: a tab beside the reviews loads the demo in an iframe, so somebody reading
about a game can try it without leaving.

## Where it lives

`data/spawnd-games.json` holds the whole catalogue, about seventy games, and
`lib/spawnd.ts` imports it at build time. It is shipped rather than fetched
because it is small and because a game page should not wait on a third party
to find out whether a demo exists; a page that asks at render time is a page
that is slower for everybody so that a handful of games can be current.

That is also the trade: the list is as fresh as the last sync.

## Refreshing it

```bash
npm run spawnd:sync
```

`scripts/spawnd-sync.py` walks the sitemap and the catalogue pages and reads
what the site renders, because there is no public API. It needs `curl_cffi`,
which impersonates a browser's TLS fingerprint; a plain `requests` is refused
by the origin.

```bash
pip install curl_cffi
```

Two things about the run worth knowing:

- It **merges against the file it is replacing**, so a field the site stopped
  rendering is kept rather than dropped. Pass `--old` to merge against a
  different one.
- It **writes nothing but the timestamp when nothing changed**, and not even
  that: a run that finds exactly what is already there keeps the old
  `generated_at`, so a sync with no news leaves no diff.

The write is atomic, since the file is a build input and half of one would
take the build down.

## What a game carries

Each row has the spawnd id and slug, the IGDB id where one could be matched
(57 of 70 at the time of writing), the Steam app id, the demo's platforms,
whether the full game is out (`published`) or not (`coming_soon`), the store
links and a wishlist link. The panel on the game page reads all of it; a row
with no `igdb_id` is in the file but can never be matched to a page here, and
that is the number to watch after a sync.

import requests
from bs4 import BeautifulSoup
import time
import json

BASE = "https://www.backloggd.com"

HEADERS = {
	"Authority": "backloggd.com",
	"Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Upgrade-Insecure-Requests": "1",
    "Sec-CH-UA": '"Chromium";v="120", "Google Chrome";v="120", "Not=A?Brand";v="99"',
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"Windows"',
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
}

COOKIES = {
    "has_js": "true",
    "_pubcid": "8789042e-1da4-4147-a2fe-75568ddb6fa3",
    "_pubcid_cst": "znv0HA%3D%3D",
    "_lr_retry_request": "true",
    "_lr_env_src_ats": "false",
    "nitro-uid": "%7B%22TDID%22%3A%2273aade6f-c57b-4a2b-ad1f-dc5b0cbf9c5a%22%2C%22TDID_LOOKUP%22%3A%22TRUE%22%2C%22TDID_CREATED_AT%22%3A%222026-01-18T04%3A05%3A57%22%7D",
    "_lr_geo_location_state": "BA",
    "_lr_geo_location": "BR",
    "_nitroID": "1ed22c7b4e6fe9b9cc4de83155a0ac60",
    "ncmp.domain": "backloggd.com",
    "ncmp-ga": "1",
    "_lr_sampling_rate": "100",
    "nitro-uid_cst": "V0fMHQ%3D%3D",
    "_scor_uid": "d7e21a849845469b9cc8a2e43b815b7c",
    "ne_cookies_consent": "true",
    "_ga": "GA1.1.1222476375.1771387595",
    "FCNEC": "%5B%5B%22AKsRol_MutqNJON3NX5kmRmVo9xIbCjobpJb5cv1g6WPK1mNWLEtL_akCs-W-nAn5acrFUFY8WfH5bQPZMB7isA86836vqkMoMYhW2dPYpRtitWnI5bztyPiW1Btx09YF2uL8z5aTQHHfKfsztfLvQqJpn_eycGppw%3D%3D%22%5D%5D",
    "_ga_W5VPEML01P": "GS2.1.s1771387594$o1$g1$t1771391042$j60$l0$h0",
    "cto_bundle": "QY8gbF9NSjFBaE5ZUG1COG1QTm5BcnFqbkFtUVNoSDk0ajc2a0g1cm4wM2wzVjRLTVFRd0pEJTJCRiUyRlkxQlpHbzdoTnlUMWVhRFN3bTJZemZGRmh6VEx3dGElMkZuWTNRa3EwJTJCb0RHeWFuOWR1d3hia1hQckMlMkJVS2FMU0FQOUduMVZZVTd5biUyQlV3U0NVQyUyRmg4azBwcHhtbmpUekJlQSUzRCUzRA",
    "cto_bidid": "dg1tQF9JTzJnM0J4cElwY0tuOFA3QyUyQkhobDdZdUtuaktVYmNVdVBMeFd5V2hlb2pVRm82NDhUTkp6NHdta0RvS0liRVJwVlJQd2Njd0RaNnhkT2cxVUdOcFdvdTdGJTJGekEwYXNxS3ZMV2hycEtHTzQlM0Q",
    "FCCDCF": "%5Bnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2C%5B%5B32%2C%22%5B%5C%228b9c4541-2ef3-4768-88da-6fb9dd570d86%5C%22%2C%5B1771387559%2C795000000%5D%5D%22%5D%5D%5D",
    "__gads": "ID",
    "__gpi": "UID",
    "__eoi": "ID"
}


def get_total_pages(html):
    soup = BeautifulSoup(html, "html.parser")
    pages = []
    for a in soup.select(".page"):
        try:
            pages.append(int(a.text.strip()))
        except:
            pass
    return max(pages) if pages else 1


def parse_games(html):
    soup = BeautifulSoup(html, "html.parser")
    games = []

    for card in soup.select(".game-cover"):
        game_id = card.get("game_id")
        if not game_id:
            continue

        link = card.select_one("a.cover-link")
        img = card.select_one("img.card-img")

        if not link:
            continue

        href = link.get("href", "")
        slug = href.split("/games/")[-1].strip("/")

        title = img.get("alt", "").strip() if img else ""
        cover = img.get("src") or img.get("data-src") or ""
        rating_raw = card.get("data-rating")

        games.append({
            "game_id": int(game_id),
            "slug": slug,
            "title": title,
            "cover": cover,
            "rating": int(rating_raw) * 10 if rating_raw else None,
        })

    return games


def scrape_section(username, section):
    base = f"{BASE}/u/{username}/games/added/type:{section}/"
    session = requests.Session()
    session.headers.update(HEADERS)
    session.cookies.update(COOKIES)

    print(f"[{section}] Página 1...")
    r = session.get(base)
    if r.status_code != 200:
        print(f"❌ {section} erro {r.status_code}")
        return []

    total_pages = get_total_pages(r.text)
    all_games = parse_games(r.text)

    for page in range(2, total_pages + 1):
        url = f"{base}?page={page}"
        print(f"[{section}] Página {page}/{total_pages}")
        r = session.get(url)
        if r.status_code != 200:
            break

        all_games.extend(parse_games(r.text))
        time.sleep(1.5)

    return all_games


def scrape_user(username):
    sections = ["played", "playing", "backlog", "wishlist"]
    games = {}

    for section in sections:
        data = scrape_section(username, section)
        for g in data:
            gid = g["game_id"]
            if gid not in games:
                games[gid] = {
                    **g,
                    "played": False,
                    "playing": False,
                    "backlog": False,
                    "wishlist": False,
                }
            games[gid][section] = True

    return list(games.values())


if __name__ == "__main__":
    username = input("Username Backloggd: ").strip()
    games = scrape_user(username)

    print(json.dumps(games, indent=2, ensure_ascii=False))
    print(f"\nTotal: {len(games)} jogos")
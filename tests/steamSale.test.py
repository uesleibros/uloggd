import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from dateutil import parser
import re

DOC_URL = "https://partner.steamgames.com/doc/marketing/upcoming_events"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}

UTC = timezone.utc


# ------------------------
# Helpers
# ------------------------

def slugify(name):
    slug = name.lower()
    slug = re.sub(r"\(.*?\)", "", slug)  # remove parênteses
    slug = slug.replace(" fest", "")
    slug = slug.replace(" sale", "")
    slug = slug.replace("&", "")
    slug = slug.replace(" ", "")
    return slug.strip()


def parse_date(date_str, year):
    dt = parser.parse(f"{date_str} {year}")
    return dt.replace(hour=17, tzinfo=UTC)


def get_banner(event_name):
    slug = slugify(event_name)
    url = f"https://store.steampowered.com/sale/{slug}"

    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code != 200:
            return None

        soup = BeautifulSoup(r.text, "html.parser")

        og = soup.find("meta", property="og:image")
        if og and og.get("content"):
            return og["content"]

    except:
        return None

    return None


# ------------------------
# Core
# ------------------------

def get_steam_sales():
    now = datetime.now(UTC)

    r = requests.get(DOC_URL, headers=HEADERS)
    soup = BeautifulSoup(r.text, "html.parser")

    tables = soup.find_all("table")
    current_year = now.year

    events = []

    for table in tables:
        rows = table.find_all("tr")[1:]

        for row in rows:
            cols = row.find_all("td")
            if len(cols) < 2:
                continue

            raw_dates = cols[0].get_text("\n").split("\n")
            if len(raw_dates) < 2:
                continue

            start = parse_date(raw_dates[0].strip(), current_year)
            end = parse_date(raw_dates[1].strip(), current_year)

            name = cols[1].get_text(strip=True)

            status = "upcoming"
            if start <= now <= end:
                status = "active"
            elif now > end:
                status = "ended"

            banner = get_banner(name)

            events.append({
                "name": name,
                "start": start.isoformat(),
                "end": end.isoformat(),
                "status": status,
                "starts_in_seconds": max(0, int((start - now).total_seconds())),
                "ends_in_seconds": max(0, int((end - now).total_seconds())),
                "banner": banner
            })

    return sorted(events, key=lambda x: x["start"])


# ------------------------
# Exibir no terminal (exemplo)
# ------------------------

if __name__ == "__main__":
    sales = get_steam_sales()

    for sale in sales:
        if sale["status"] in ("upcoming", "active"):
            print("-------------------------------------------------")
            print(f"Name: {sale['name']}")
            print(f"Status: {sale['status']}")
            print(f"Start: {sale['start']}")
            print(f"Banner: {sale['banner']}")

const SPAWND_ORIGIN = "https://www.spawnd.gg";

const confirmedGames: Record<string, { slug: string; embedId?: number }> = {
  "deck lite": { slug: "deck-lite" },
  "gossip & potions: tales from the witch shop": {
    slug: "gossip-potions",
  },
  "isekat: crushed by a computer, my beloved kitten is transported to a fantasy world where its typing skills save the kingdom!":
    { slug: "isekat" },
  "raining blood: hellfire": { slug: "raining-blood" },
  "the posthumous investigation": {
    slug: "the-posthumous-investigation",
    embedId: 9,
  },
  "ukko & guará: stellarbound": { slug: "ukko-guara" },
};

function spawndReference(url: string) {
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      !["spawnd.gg", "www.spawnd.gg"].includes(parsed.hostname)
    ) {
      return null;
    }
    const gameMatch = parsed.pathname.match(
      /^\/(?:(?:en|pt|es|ja|zh|-)\/)?games\/([^/?#]+)\/?$/,
    );
    const embedMatch = parsed.pathname.match(
      /^\/(?:(?:en|pt|es|ja|zh|-)\/)?games\/embed\/(\d+)\/?$/,
    );
    if (embedMatch) return { embedId: Number(embedMatch[1]) };
    if (gameMatch) return { slug: gameMatch[1] };
    return null;
  } catch {
    return null;
  }
}

export function getSpawndGame({
  name,
  websites,
  lang,
}: {
  name: string;
  websites: string[];
  lang: "pt-BR" | "en";
}) {
  const websiteReference = websites.map(spawndReference).find(Boolean);
  const confirmed = confirmedGames[name.trim().toLowerCase()];
  const slug = websiteReference?.slug ?? confirmed?.slug;
  const embedId = websiteReference?.embedId ?? confirmed?.embedId;
  const locale = lang === "pt-BR" ? "pt" : "en";

  return {
    available: Boolean(slug || embedId),
    gameUrl: slug
      ? `${SPAWND_ORIGIN}/${locale}/games/${encodeURIComponent(slug)}`
      : null,
    embedUrl: embedId
      ? `${SPAWND_ORIGIN}/${locale}/games/embed/${embedId}?description=true`
      : null,
    catalogUrl: `${SPAWND_ORIGIN}/${locale}`,
  };
}

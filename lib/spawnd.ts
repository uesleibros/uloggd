const SPAWND_ORIGIN = "https://www.spawnd.gg";

const confirmedGames: Record<string, string> = {
  "deck lite": "deck-lite",
  "gossip & potions: tales from the witch shop": "gossip-potions",
  "isekat: crushed by a computer, my beloved kitten is transported to a fantasy world where its typing skills save the kingdom!":
    "isekat",
  "raining blood: hellfire": "raining-blood",
  "the posthumous investigation": "the-posthumous-investigation",
  "ukko & guará: stellarbound": "ukko-guara",
};

function spawndGamePath(url: string) {
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      !["spawnd.gg", "www.spawnd.gg"].includes(parsed.hostname)
    ) {
      return null;
    }
    const match = parsed.pathname.match(
      /^\/(?:(?:en|pt|es|ja|zh|-)\/)?games\/([^/?#]+)\/?$/,
    );
    return match?.[1] ?? null;
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
  const websiteSlug = websites.map(spawndGamePath).find(Boolean);
  const slug = websiteSlug ?? confirmedGames[name.trim().toLowerCase()];
  const locale = lang === "pt-BR" ? "pt" : "en";

  return {
    available: Boolean(slug),
    gameUrl: slug
      ? `${SPAWND_ORIGIN}/${locale}/games/${encodeURIComponent(slug)}`
      : null,
    catalogUrl: `${SPAWND_ORIGIN}/${locale}`,
  };
}

import { ImageResponse } from "next/og";
import { getYearShareSummary, parseWrappedYear } from "@/lib/year-wrapped";
import { resolveLocale } from "../../../../dictionaries";
import { tri } from "@/lib/ui-text";
import { BRAND_MARK } from "@/lib/og-card";

export const alt = "Retrospectiva anual de jogos no uloggd";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = {
  params: Promise<{ lang: string; username: string; year: string }>;
};

export default async function OpenGraphImage({ params }: Props) {
  const { lang: rawLang, username, year: rawYear } = await params;
  // The route segment is just a string; anything unknown draws the card in
  // the default locale rather than failing the image request.
  const lang = resolveLocale(rawLang);
  const year = parseWrappedYear(rawYear);
  const summary = year ? await getYearShareSummary(username, year) : null;
  const name = summary?.profile.display_name || `@${username}`;
  const hours = summary ? Math.floor(summary.minutes / 60) : 0;
  const stats = [
    {
      value: summary?.games ?? 0,
      label: tri(lang, "JOGOS", "GAMES", "JUEGOS"),
    },
    {
      value: summary?.sessions ?? 0,
      label: tri(lang, "SESSÕES", "SESSIONS", "SESIONES"),
    },
    {
      value: `${hours}h`,
      label: tri(lang, "REGISTRADAS", "LOGGED", "REGISTRADAS"),
    },
    {
      value: summary?.reviews ?? 0,
      label: tri(lang, "AVALIAÇÕES", "REVIEWS", "RESEÑAS"),
    },
  ];

  return new ImageResponse(
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        padding: "64px 72px",
        background:
          "linear-gradient(135deg, #17151b 0%, #211d2a 58%, #191722 100%)",
        color: "#f4f2f6",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -190,
          right: -90,
          display: "flex",
          width: 560,
          height: 560,
          borderRadius: 999,
          background:
            "radial-gradient(circle, rgba(88,101,242,.36) 0%, rgba(88,101,242,0) 68%)",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 26,
            fontWeight: 700,
          }}
        >
          {/* The same mark the other cards use. This layout is its own rather
              than `ogCard`'s, and it carried its own copy of the placeholder
              along with it. */}
          <img
            src={BRAND_MARK}
            alt=""
            width={38}
            height={38}
            style={{ borderRadius: 10 }}
          />
          uloggd
        </div>
        <span
          style={{
            display: "flex",
            padding: "10px 16px",
            border: "1px solid rgba(255,255,255,.16)",
            borderRadius: 999,
            color: "#aaa5af",
            fontSize: 18,
            letterSpacing: 2,
          }}
        >
          {tri(lang, "RETROSPECTIVA", "YEAR IN GAMES", "RETROSPECTIVA")}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: 58 }}>
        <span style={{ color: "#9da5ff", fontSize: 24, fontWeight: 600 }}>
          {name}
        </span>
        <span
          style={{
            marginTop: 5,
            fontSize: 66,
            fontWeight: 750,
            letterSpacing: -3,
          }}
        >
          {year ?? rawYear} {tri(lang, "em jogos", "in games", "en juegos")}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 14,
          marginTop: "auto",
        }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              display: "flex",
              flex: 1,
              flexDirection: "column",
              padding: "20px 22px",
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 14,
              background: "rgba(255,255,255,.055)",
            }}
          >
            <strong style={{ fontSize: 32 }}>{stat.value}</strong>
            <span
              style={{
                marginTop: 7,
                color: "#8d8793",
                fontSize: 14,
                fontWeight: 650,
                letterSpacing: 1.5,
              }}
            >
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}

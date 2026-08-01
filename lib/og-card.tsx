import { ImageResponse } from "next/og";

/**
 * The shared share card.
 *
 * Every page worth sharing draws the same frame, so a link posted anywhere is
 * recognisably uloggd before the text is read. Written once because the
 * alternative is five files drifting apart one gradient at a time.
 *
 * Deliberately built from data the page already loaded rather than from a
 * fresh query per image: these run on every crawl and every unfurl, and a card
 * is not worth a round trip that the page did not already pay for.
 *
 * Nothing private reaches a card. Each route resolves its own subject with the
 * visibility rules it already applies, and passes only what a signed-out
 * visitor would see; an unresolvable subject renders the generic frame instead
 * of leaking the reason it could not be resolved.
 */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const BACKGROUND =
  "linear-gradient(135deg, #17151b 0%, #211d2a 58%, #191722 100%)";

export type OgCardProps = {
  /** Small label above the title: the kind of thing being shared. */
  eyebrow: string;
  title: string;
  /** One line under the title, usually the author or the game. */
  subtitle?: string | null;
  /** Body text, clamped by the caller since only it knows what matters. */
  body?: string | null;
  /**
   * Cover or avatar, as an absolute URL. Silently dropped when the format
   * cannot be decoded here, which is most of them: this renderer handles PNG,
   * JPEG and SVG only.
   */
  image?: string | null;
  /**
   * Drawn in place of a missing image. A single letter reads as a deliberate
   * monogram, where an empty bordered box reads as a broken card, and most
   * avatars land here because the uploader stores WebP.
   */
  fallbackText?: string | null;
  /** Rounded for people, squared for games and organizations. */
  imageShape?: "circle" | "rounded";
  /** Up to three short figures, drawn along the bottom. */
  stats?: { value: string; label: string }[];
  /** Small badge at the top right, like a rating. */
  badge?: string | null;
};

/**
 * Whether this renderer can decode the image.
 *
 * Satori, which draws these cards, supports PNG, JPEG and SVG. A WebP or AVIF
 * URL is not an error: it simply draws nothing, leaving an empty bordered box
 * that looks like a bug. Since the image host used for avatars and journal
 * images converts everything to WebP, this is the common case rather than the
 * edge one.
 */
function decodable(url: string | null | undefined) {
  if (!url) return false;
  const path = url.split("?")[0].toLowerCase();
  return !/\.(webp|avif|heic|heif)$/.test(path);
}

export function ogCard({
  eyebrow,
  title,
  subtitle,
  body,
  image,
  fallbackText,
  imageShape = "rounded",
  stats = [],
  badge,
}: OgCardProps) {
  const usableImage = decodable(image) ? image : null;
  const monogram = (fallbackText ?? title).trim().charAt(0).toUpperCase();
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        padding: "64px 72px",
        background: BACKGROUND,
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
          <span
            style={{
              display: "flex",
              width: 38,
              height: 38,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              background: "#5865f2",
              color: "white",
            }}
          >
            u
          </span>
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
          {badge ?? eyebrow.toUpperCase()}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          gap: 40,
          alignItems: "center",
          marginTop: 44,
        }}
      >
        {usableImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={usableImage}
            alt=""
            width={224}
            height={224}
            style={{
              width: 224,
              height: 224,
              flexShrink: 0,
              borderRadius: imageShape === "circle" ? 999 : 24,
              border: "1px solid rgba(255,255,255,.14)",
              objectFit: "cover",
            }}
          />
        ) : (
          monogram && (
            <div
              style={{
                display: "flex",
                width: 224,
                height: 224,
                flexShrink: 0,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: imageShape === "circle" ? 999 : 24,
                background: "rgba(88,101,242,.16)",
                color: "#9da5ff",
                fontSize: 104,
                fontWeight: 800,
              }}
            >
              {monogram}
            </div>
          )
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minWidth: 0,
          }}
        >
          {subtitle && (
            <span style={{ color: "#9da5ff", fontSize: 24, fontWeight: 600 }}>
              {subtitle}
            </span>
          )}
          <span
            style={{
              display: "flex",
              marginTop: 8,
              fontSize: title.length > 44 ? 52 : 64,
              fontWeight: 800,
              letterSpacing: -1.5,
              lineHeight: 1.08,
            }}
          >
            {title}
          </span>
          {body && (
            <span
              style={{
                display: "flex",
                marginTop: 18,
                color: "#c9c5d2",
                fontSize: 26,
                lineHeight: 1.4,
              }}
            >
              {body}
            </span>
          )}
        </div>
      </div>

      {stats.length > 0 && (
        <div style={{ display: "flex", gap: 56, marginTop: 12 }}>
          {stats.map((stat) => (
            <div
              key={stat.label}
              style={{ display: "flex", flexDirection: "column" }}
            >
              <span style={{ fontSize: 40, fontWeight: 800 }}>
                {stat.value}
              </span>
              <span
                style={{ color: "#aaa5af", fontSize: 17, letterSpacing: 1.5 }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Renders the card at the standard size. */
export function ogResponse(props: OgCardProps) {
  return new ImageResponse(ogCard(props), OG_SIZE);
}

/**
 * Clamps text to something that fits, breaking on a word rather than mid-token
 * and adding an ellipsis only when something was actually removed.
 */
export function clamp(text: string | null | undefined, limit: number) {
  if (!text) return null;
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= limit) return flat || null;
  const cut = flat.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

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

/**
 * The uloggd mark at 64px, as a data URI.
 *
 * About 1.5KB of base64, which is nothing next to the card it appears on and
 * removes the only thing in the header that could fail to load.
 */
/**
 * The verified mark, the same file the site draws.
 *
 * This used to be a hand-traced star path written straight into the card, and
 * it did not match: the real mark has a different number of points and a
 * different notch depth, so every share card carried a slightly wrong badge
 * beside a name it was vouching for.
 */
export const VERIFIED_MARK =
  "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjIgMjIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGggZmlsbD0iIzFkOWJmMCIgZD0iTTIwLjM5NiAxMWMtLjAxOC0uNjQ2LS4yMTUtMS4yNzUtLjU3LTEuODE2LS4zNTQtLjU0LS44NTItLjk3Mi0xLjQzOC0xLjI0Ni4yMjMtLjYwNy4yNy0xLjI2NC4xNC0xLjg5Ny0uMTMxLS42MzQtLjQzNy0xLjIxOC0uODgyLTEuNjg3LS40Ny0uNDQ1LTEuMDUzLS43NS0xLjY4Ny0uODgyLS42MzMtLjEzLTEuMjktLjA4My0xLjg5Ny4xNC0uMjczLS41ODctLjcwNC0xLjA4Ni0xLjI0NS0xLjQ0UzExLjY0NyAxLjYyIDExIDEuNjA0Yy0uNjQ2LjAxNy0xLjI3My4yMTMtMS44MTMuNTY4cy0uOTY5Ljg1NC0xLjI0IDEuNDRjLS42MDgtLjIyMy0xLjI2Ny0uMjcyLTEuOTAyLS4xNC0uNjM1LjEzLTEuMjIuNDM2LTEuNjkuODgyLS40NDUuNDctLjc0OSAxLjA1NS0uODc4IDEuNjg4LS4xMy42MzMtLjA4IDEuMjkuMTQ0IDEuODk2LS41ODcuMjc0LTEuMDg3LjcwNS0xLjQ0MyAxLjI0NS0uMzU2LjU0LS41NTUgMS4xNy0uNTc0IDEuODE3LjAyLjY0Ny4yMTggMS4yNzYuNTc0IDEuODE3LjM1Ni41NC44NTYuOTcyIDEuNDQzIDEuMjQ1LS4yMjQuNjA2LS4yNzQgMS4yNjMtLjE0NCAxLjg5Ni4xMy42MzQuNDMzIDEuMjE4Ljg3NyAxLjY4OC40Ny40NDMgMS4wNTQuNzQ3IDEuNjg3Ljg3OC42MzMuMTMyIDEuMjkuMDg0IDEuODk3LS4xMzYuMjc0LjU4Ni43MDUgMS4wODQgMS4yNDYgMS40MzkuNTQuMzU0IDEuMTcuNTUxIDEuODE2LjU2OS42NDctLjAxNiAxLjI3Ni0uMjEzIDEuODE3LS41NjdzLjk3Mi0uODU0IDEuMjQ1LTEuNDRjLjYwNC4yMzkgMS4yNjYuMjk2IDEuOTAzLjE2NC42MzYtLjEzMiAxLjIyLS40NDcgMS42OC0uOTA3LjQ2LS40Ni43NzYtMS4wNDQuOTA4LTEuNjgxcy4wNzUtMS4yOTktLjE2NS0xLjkwM2MuNTg2LS4yNzQgMS4wODQtLjcwNSAxLjQzOS0xLjI0Ni4zNTQtLjU0LjU1MS0xLjE3LjU2OS0xLjgxNnpNOS42NjIgMTQuODVsLTMuNDI5LTMuNDI4IDEuMjkzLTEuMzAyIDIuMDcyIDIuMDcyIDQuNC00Ljc5NCAxLjM0NyAxLjI0NnoiIGZpbGw9IiMxZDliZjAiIC8+Cjwvc3ZnPgo=";

export const BRAND_MARK =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAB41BMVEUXFxkYGBoZGRsbGx0aGhwUFBYMDA4GBggPDxITExULCw0HBwkhISNJSUt0dHY9PT4PDxENDQ8QEBIpKStTU1SFhYa6urrn5+f////y8vMzMzURERNLS0yUlJTFxcXv7+/9/f339/diYmMJCQtgYGL8/Pz6+vr7+/v+/v77+/xfX2AICAq0tLRfX2EKCgyzs7S0tLVgYGEWFhgLCw4GBgkODhC1tbYmJihPT1GBgYLc3NzT09NOTk9ZWVuNjY7CwsLr6+vX19cVFRe1tbW8vLzj4+MgICIcHB5HR0jh4eEeHiAdHR9MTE3i4uJLS022trYfHyBXV1iwsLBMTE7x8fFtbW81NTYKCg38/P2urq48PD6UlJXu7u4lJSfy8vJkZGVSUlPd3d7s7OxSUlSAgIHq6uomJidKSkwfHyHj4+T19fUoKCoCAgSrq6zh4eJVVVehoaIsLC7T09SLi4xTU1Xd3d2+vr/b29taWltUVFXBwcFUVFaGhod3d3j4+Pj5+fk0NDUSEhTAwMFVVVaQkJHS0tLe3t74+PnHx8cQEBPAwMDw8PBXV1nGxsdYWFo/P0H6+vuTk5RhYWPGxsb09PTp6emioqIwMDFhYWKOjo+ysrPLy8zMzMzDwsOqqqtWVlgjIyWE8k4iAAACZElEQVRYw+2W13fTMBTGI1tNcVxoEihcKEMl2BINDTTUYVNIaUspKavsvcNeZY8S9l5l7z8VyT3OiVPOiSzeOP5e/PT9fL97ryVHIqFC/e9Cmq6pm7Gu1UXrx6kR+JuNmBltGD+hMa5C0BL1yYmTmiZPAZg6rTk4AcWnz5g5C7hIC8xO4aB+HJsjzJZNCZsLrQqA9DxosQgTotCmAMjMB8rY3wBIErCgAtDuAfhccRbJdNQPcCsQS2Es7IjphiNRBM7kqipA2YzpLFq8JLd02XKndg1jAMjQVqzsXCVGA6vzMhV0+QB6JLLGXQqbUujuydcM4a+gLdWbWAtULAVjBPrWyQC6fID+6HoY3QoOKEgBclWAgaCADb4e+AEbVSL8E6BVJUKuKkLgJpYrIDZsyvQGj+BVYANsRhEc3aIG4K8f3LpNAIJG2O6OcQfAzl279+w1cPAIAkBg3/4DB+GQACg1kcDhIwDs6LE8do5XAIqSPSBwYgCAwslTTvF0e3kqcoDUGQE4e85mzILz+cSFi2B5gG4JgG5eEoDCkAXCcvnKoOfnvKv8XKwd4ZoLuC4A3ANlP1/MGxJHGsr39/H0hZsugFmUeH6+Wbc69JoAnuE23PEqqBSB4btJmYMdle4BFO6PAQzDg7TUPaWVGh7Co6EqAHkMT7K1Wzjax6fFZ89f0Ir0/Mtg8LKnJHvX45Lx6jXhm0SpZVmUvuHDIG+z0n6eAkXj70beQ1kfPjaa2UD/GhjFnE+fv3wd+fb9x8+mX7/TcV0ufwVCa06ZmaRhOPxRh1V+lsSVjhDSxEPBHipUqED6Aw80q0lGVqLtAAAAAElFTkSuQmCC";

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
  /** The account's level, drawn beside the title before the verified mark. */
  level?: number | null;
  /**
   * Draws the verified mark beside the title. Only ever passed for an account
   * a moderator confirmed, since the whole value of the mark is that it cannot
   * be self-declared, and a share card is where it is most likely to be taken
   * at face value.
   */
  verified?: boolean;
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
  level,
  verified = false,
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
          {/* The real mark, inlined. This was a blurple square with a letter
              "u" in it, which is a placeholder somebody forgot to replace: an
              unfurl is often the first time anyone sees the site, and it was
              showing them a logo that exists nowhere else on it.
              Inlined rather than fetched because this renderer runs on every
              unfurl and a request for our own icon is a request that can fail
              and leave the card unbranded. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
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
              gap: 14,
              alignItems: "center",
              marginTop: 8,
              fontSize: title.length > 44 ? 52 : 64,
              fontWeight: 800,
              letterSpacing: -1.5,
              lineHeight: 1.08,
            }}
          >
            {title}
            {level ? (
              /* The badge follows the same order the site uses: the level is
                 the account describing itself and the mark is moderation
                 vouching for it, so the claim comes before the confirmation.
                 Drawn as a plain disc rather than the progress ring: at this
                 size an arc a few degrees along reads as a rendering fault,
                 and an unfurl has no way to explain itself. */
              <span
                style={{
                  display: "flex",
                  width: 46,
                  height: 46,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  border: "3px solid #5865f2",
                  color: "#ffffff",
                  fontSize: 22,
                  fontWeight: 800,
                }}
              >
                {level}
              </span>
            ) : null}
            {verified && (
              /* The real asset rather than a traced copy. Inlined for the same
                 reason the brand mark is: this renders on every unfurl and a
                 request that fails would drop the mark from the card. */
              // eslint-disable-next-line @next/next/no-img-element
              <img src={VERIFIED_MARK} alt="" width={44} height={44} />
            )}
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

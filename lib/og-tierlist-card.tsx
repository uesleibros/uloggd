import { ImageResponse } from "next/og";
import {
  BRAND_MARK,
  clamp,
  OG_BACKGROUND,
  OG_SIZE,
  VERIFIED_MARK,
} from "@/lib/og-card";

export type OgTierlistRow = {
  label: string;
  color: string;
  covers: string[];
};

type OgTierlistProps = {
  title: string;
  body?: string | null;
  author: string;
  authorHandle: string;
  authorImage?: string | null;
  verified?: boolean;
  rows: OgTierlistRow[];
  gameCount: number;
  gamesLabel: string;
  emptyLabel: string;
};

function safeTierColor(color: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#5865f2";
}

export function tierlistResponse({
  title,
  body,
  author,
  authorHandle,
  authorImage,
  verified = false,
  rows,
  gameCount,
  gamesLabel,
  emptyLabel,
}: OgTierlistProps) {
  const authorInitial = (author || authorHandle).trim().charAt(0).toUpperCase();
  const displayTitle = clamp(title, 72) ?? title;
  return new ImageResponse(
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        padding: "58px 64px",
        background: OG_BACKGROUND,
        color: "#f4f2f6",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -210,
          right: -70,
          display: "flex",
          width: 610,
          height: 610,
          borderRadius: 999,
          background:
            "radial-gradient(circle, rgba(88,101,242,.32) 0%, rgba(88,101,242,0) 70%)",
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
          TIERLIST
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          gap: 54,
          marginTop: 38,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 475,
            alignSelf: "stretch",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              display: "flex",
              fontSize:
                displayTitle.length > 58
                  ? 40
                  : displayTitle.length > 34
                    ? 48
                    : 58,
              fontWeight: 800,
              letterSpacing: -1.8,
              lineHeight: 1.06,
            }}
          >
            {displayTitle}
          </span>
          {body ? (
            <span
              style={{
                display: "flex",
                marginTop: 16,
                color: "#c9c5d2",
                fontSize: 23,
                lineHeight: 1.35,
              }}
            >
              {body}
            </span>
          ) : null}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 13,
              marginTop: 26,
            }}
          >
            {authorImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={authorImage}
                alt=""
                width={48}
                height={48}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  border: "2px solid rgba(255,255,255,.18)",
                  objectFit: "cover",
                }}
              />
            ) : (
              <span
                style={{
                  display: "flex",
                  width: 48,
                  height: 48,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  background: "rgba(88,101,242,.2)",
                  color: "#aeb4ff",
                  fontSize: 22,
                  fontWeight: 800,
                }}
              >
                {authorInitial}
              </span>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 20,
                  fontWeight: 650,
                }}
              >
                {author}
                {verified ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={VERIFIED_MARK} alt="" width={22} height={22} />
                ) : null}
              </span>
              <span style={{ color: "#aaa5af", fontSize: 16 }}>
                @{authorHandle}
              </span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              marginTop: 25,
            }}
          >
            <strong style={{ fontSize: 38 }}>{gameCount}</strong>
            <span
              style={{
                color: "#aaa5af",
                fontSize: 16,
                fontWeight: 650,
                letterSpacing: 1.3,
              }}
            >
              {gamesLabel}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            gap: 8,
            padding: 14,
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: 18,
            background: "rgba(11,10,13,.64)",
            boxShadow: "0 22px 50px rgba(0,0,0,.22)",
          }}
        >
          {rows.length ? (
            rows.slice(0, 4).map((row, rowIndex) => (
              <div
                key={`${row.label}-${rowIndex}`}
                style={{
                  display: "flex",
                  minHeight: 82,
                  overflow: "hidden",
                  borderRadius: 8,
                  background: "rgba(255,255,255,.055)",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    width: 82,
                    flexShrink: 0,
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 8,
                    background: safeTierColor(row.color),
                    color: "#0b0a0d",
                    fontSize: row.label.length > 5 ? 14 : 20,
                    fontWeight: 850,
                    textAlign: "center",
                  }}
                >
                  {row.label.slice(0, 10)}
                </span>
                <span
                  style={{
                    display: "flex",
                    flex: 1,
                    alignItems: "center",
                    gap: 8,
                    overflow: "hidden",
                    padding: "7px 9px",
                  }}
                >
                  {row.covers.slice(0, 6).map((cover, coverIndex) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${cover}-${coverIndex}`}
                      src={cover}
                      alt=""
                      width={50}
                      height={68}
                      style={{
                        width: 50,
                        height: 68,
                        flexShrink: 0,
                        borderRadius: 5,
                        border: "1px solid rgba(255,255,255,.12)",
                        objectFit: "cover",
                      }}
                    />
                  ))}
                </span>
              </div>
            ))
          ) : (
            <div
              style={{
                display: "flex",
                minHeight: 352,
                alignItems: "center",
                justifyContent: "center",
                color: "#aaa5af",
                fontSize: 21,
              }}
            >
              {emptyLabel}
            </div>
          )}
        </div>
      </div>
    </div>,
    OG_SIZE,
  );
}

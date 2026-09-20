import Image from "next/image";
import Link from "next/link";

export function Brand({
  lang,
  compact = false,
}: {
  lang: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/${lang}`}
      className="brand"
      aria-label="uloggd, página inicial"
    >
      {/* The 96px copy, not the 1280px one the social cards use: images are
          served as they are here, so the sidebar was downloading 37KB of
          square logo on every page to draw it at 38 across. */}
      <Image
        className="brand-logo"
        src="/logo-mark.webp"
        alt=""
        width={38}
        height={38}
        priority
      />
      {!compact && <span>uloggd</span>}
    </Link>
  );
}

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
      aria-label="uloggd — página inicial"
    >
      <Image
        className="brand-logo"
        src="/logo.jpg"
        alt=""
        width={38}
        height={38}
        priority
      />
      {!compact && <span>uloggd</span>}
    </Link>
  );
}

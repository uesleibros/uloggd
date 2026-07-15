import Image from "next/image";

export function SpawndLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Image
      src={compact ? "/spawnd-mark.svg" : "/spawnd-logo.svg"}
      alt="spawnd"
      width={compact ? 32 : 144}
      height={44}
      className={compact ? "spawnd-logo-mark" : "spawnd-logo-full"}
    />
  );
}

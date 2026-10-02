"use client";

import Image from "next/image";
import { useState } from "react";
import { MediaLightbox } from "@/components/media-lightbox";
import { tri, type UiLang } from "@/lib/ui-text";

export function ProfileAvatarViewer({
  url,
  name,
  username,
  lang,
  kind = "avatar",
}: {
  url: string;
  name: string;
  username: string;
  lang: UiLang;
  kind?: "avatar" | "banner";
}) {
  const [active, setActive] = useState<number | null>(null);
  const title = tri(
    lang,
    kind === "banner" ? `Banner de ${name}` : `Foto de ${name}`,
    kind === "banner" ? `${name}'s banner` : `${name}'s photo`,
    kind === "banner" ? `Banner de ${name}` : `Foto de ${name}`,
  );
  return (
    <>
      <button
        type="button"
        className={
          kind === "banner"
            ? "profile-banner-trigger"
            : "profile-avatar profile-avatar-trigger"
        }
        data-feedback="image"
        data-context-action="image"
        aria-label={tri(
          lang,
          kind === "banner" ? "Ver banner do perfil" : "Ver foto de perfil",
          kind === "banner" ? "View profile banner" : "View profile photo",
          kind === "banner" ? "Ver banner del perfil" : "Ver foto de perfil",
        )}
        onClick={() => setActive(0)}
      >
        {kind === "avatar" && (
          <Image src={url} alt="" fill sizes="112px" unoptimized />
        )}
      </button>
      <MediaLightbox
        items={[{ id: username, url, alt: title, label: name }]}
        active={active}
        onActiveChange={setActive}
        lang={lang}
        title={title}
        subtitle={`@${username}`}
        unoptimized
      />
    </>
  );
}

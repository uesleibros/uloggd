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
}: {
  url: string;
  name: string;
  username: string;
  lang: UiLang;
}) {
  const [active, setActive] = useState<number | null>(null);
  const title = tri(
    lang,
    `Foto de ${name}`,
    `${name}'s photo`,
    `Foto de ${name}`,
  );
  return (
    <>
      <button
        type="button"
        className="profile-avatar profile-avatar-trigger"
        data-context-action="image"
        aria-label={tri(
          lang,
          "Ver foto de perfil",
          "View profile photo",
          "Ver foto de perfil",
        )}
        onClick={() => setActive(0)}
      >
        <Image src={url} alt="" fill sizes="112px" unoptimized />
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

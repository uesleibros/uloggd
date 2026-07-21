"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

export function SafeImage({
  src,
  fallbackSrc,
  alt,
  ...props
}: ImageProps & { fallbackSrc?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      {...props}
      alt={alt}
      src={failed && fallbackSrc ? fallbackSrc : src}
      onError={() => {
        if (fallbackSrc && src !== fallbackSrc) setFailed(true);
      }}
    />
  );
}

"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

export function SafeImage({
  src,
  fallbackSrc,
  alt,
  onError,
  ...props
}: ImageProps & { fallbackSrc?: string }) {
  const [failedSource, setFailedSource] = useState<ImageProps["src"] | null>(
    null,
  );
  const failed = failedSource === src;
  return (
    <Image
      {...props}
      alt={alt}
      src={failed && fallbackSrc ? fallbackSrc : src}
      onError={(event) => {
        if (!failed && fallbackSrc && src !== fallbackSrc) setFailedSource(src);
        onError?.(event);
      }}
    />
  );
}

export function resolveGameCover(
  defaultCover: string,
  customCover?: string | null,
) {
  return customCover || defaultCover;
}

/** IGDB thumbnails and alternate covers share the same original upload. */
export function originalGameCover(cover: string) {
  try {
    const url = new URL(cover);
    if (
      url.hostname === "images.igdb.com" &&
      ["https:", "http:"].includes(url.protocol)
    ) {
      url.pathname = url.pathname.replace(
        /^\/igdb\/image\/upload\/t_[^/]+\//,
        "/igdb/image/upload/t_original/",
      );
      return url.href;
    }
  } catch {
    // Relative assets and custom uploads retain their own source.
  }
  return cover;
}

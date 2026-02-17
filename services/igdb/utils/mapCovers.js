export function mapCovers(arr, size = "t_cover_big") {
  return arr?.map(item => ({
    ...item,
    cover: item.cover?.url
      ? { ...item.cover, url: item.cover.url.replace("t_thumb", size) }
      : null
  })) || []
}
/** Browser preflight avoids feeding animated input through a single-frame canvas. Server validates fully. */
export async function isAnimatedImage(file: Blob) {
  const bytes = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  const text = new TextDecoder("latin1").decode(bytes);
  if (text.startsWith("GIF87a") || text.startsWith("GIF89a")) {
    const data = new Uint8Array(await file.arrayBuffer());
    let offset = 13 + (data[10] & 128 ? 3 * (2 << (data[10] & 7)) : 0);
    let frames = 0;
    const skipBlocks = () => {
      while (offset < data.length) {
        const size = data[offset++];
        if (!size) return;
        offset += size;
      }
    };
    while (offset < data.length) {
      const block = data[offset++];
      if (block === 0x3b) return false;
      if (block === 0x21) {
        offset++;
        skipBlocks();
      } else if (block === 0x2c) {
        if (++frames > 1) return true;
        const packed = data[offset + 8];
        offset += 9 + (packed & 128 ? 3 * (2 << (packed & 7)) : 0);
        offset++; // LZW code size
        skipBlocks();
      } else return true; // Malformed input must reach server validation unchanged.
    }
    return true;
  }
  if (bytes[0] === 137 && text.slice(1, 4) === "PNG") {
    const data = new Uint8Array(await file.arrayBuffer());
    const view = new DataView(data.buffer);
    for (let offset = 8; offset + 12 <= data.length;) {
      const length = view.getUint32(offset);
      const type = String.fromCharCode(...data.slice(offset + 4, offset + 8));
      if (type === "acTL") return true;
      if (type === "IDAT" || offset + length + 12 > data.length) break;
      offset += length + 12;
    }
  }
  if (text.startsWith("RIFF") && text.slice(8, 12) === "WEBP")
    return text.slice(12, 16) === "VP8X" && Boolean(bytes[20] & 2);
  return text.slice(4, 8) === "ftyp" && text.includes("avis");
}

import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { processUserImage } from "../lib/user-image";
async function main() {
  const hud = Buffer.from(
    `<svg width="1920" height="1080"><defs><linearGradient id="g"><stop stop-color="#205040"/><stop offset="1" stop-color="#7483ba"/></linearGradient></defs><rect width="1920" height="1080" fill="url(#g)"/><path d="M0 1050L900 200L1600 1080" fill="#455343"/><rect x="30" y="35" width="400" height="90" rx="8" fill="#17202b"/><text x="55" y="70" fill="white" font-size="24">HP 100 / 100 · QUEST COMPLETE</text><text x="55" y="105" fill="#80c0ff" font-size="24">Find the next checkpoint</text></svg>`,
  );
  const png = await sharp(hud).png().toBuffer();
  for (const effort of [2, 3, 4]) {
    const start = performance.now();
    const result = await sharp(png)
      .avif({ quality: 58, effort, chromaSubsampling: "4:4:4" })
      .toBuffer();
    console.info(
      JSON.stringify({
        sample: "HUD screenshot",
        effort,
        bytes: result.length,
        ms: Math.round(performance.now() - start),
      }),
    );
  }
  const artwork = await sharp(
    Buffer.from(
      `<svg width="1200" height="900"><rect width="1200" height="900" fill="#a787d3"/><circle cx="550" cy="440" r="230" fill="#ebbfac"/><path d="M320 480 Q340 80 630 170L800 600L690 400L330 230" fill="#252545"/><ellipse cx="480" cy="410" rx="24" ry="35" fill="#536aa8"/><ellipse cx="640" cy="410" rx="24" ry="35" fill="#536aa8"/></svg>`,
    ),
  )
    .png()
    .toBuffer();
  const pixel = await sharp(
    Buffer.from(
      `<svg width="512" height="512"><rect width="512" height="512" fill="#334477"/><path d="M100 100H400V200H300V400H200V200H100Z" fill="#fed566"/></svg>`,
    ),
  )
    .png()
    .toBuffer();
  const samples: [string, Buffer, "avatar" | "banner" | "screenshot"][] = [
    ["HUD screenshot", png, "screenshot"],
    [
      "JPEG screenshot",
      await sharp(png).jpeg({ quality: 90 }).toBuffer(),
      "screenshot",
    ],
    ["artwork", artwork, "banner"],
    ["pixel art", pixel, "avatar"],
    ["logo avatar", await readFile("public/logo.jpg"), "avatar"],
  ];
  if (process.argv[2])
    samples.push([
      "supplied animated face",
      await readFile(process.argv[2]),
      "avatar",
    ]);
  for (const [sample, input, kind] of samples) {
    const result = await processUserImage(input, kind);
    console.info(
      JSON.stringify({
        sample,
        format: result.extension,
        width: result.width,
        height: result.height,
        frames: result.frames,
        inputBytes: input.length,
        outputBytes: result.optimizedBytes,
        reductionPercent: +((1 - result.compressionRatio) * 100).toFixed(1),
        ms: result.processingMs,
      }),
    );
  }
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "benchmark failed");
  process.exitCode = 1;
});

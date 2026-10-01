import { loadSharp } from "@/lib/image-processing";

export const SCREENING_INPUT = 224;

/** Bounded, sequential views of the published bytes, never replacement uploads. */
export async function* screeningViews(processed: Buffer) {
  const sharp = await loadSharp();
  const source = await sharp(processed, { limitInputPixels: 40_000_000 })
    .rotate()
    .flatten({ background: "#ffffff" })
    .toColourspace("srgb")
    .resize({
      width: 768,
      height: 768,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
  const { width = 1, height = 1 } = await sharp(source).metadata();
  const raw = (image: ReturnType<typeof sharp>) =>
    image
      .resize(SCREENING_INPUT, SCREENING_INPUT, { fit: "fill" })
      .toColourspace("srgb")
      .removeAlpha()
      .raw()
      .toBuffer();

  yield await raw(sharp(source));
  // Colour casts and mild loss of contrast should not be the only view.
  yield await raw(sharp(source).normalise().sharpen({ sigma: 1 }));
  const monochrome = await sharp(source)
    .greyscale()
    .normalise()
    .sharpen({ sigma: 1 })
    .png()
    .toBuffer();
  yield await raw(sharp(monochrome));
  const side = Math.min(width, height);
  yield await raw(
    sharp(source).extract({
      left: Math.floor((width - side) / 2),
      top: Math.floor((height - side) / 2),
      width: side,
      height: side,
    }),
  );
  // Panoramas and tall collages otherwise shrink local content into a sliver.
  if (Math.max(width, height) / side >= 1.5) {
    for (const end of [0, 1]) {
      yield await raw(
        sharp(source)
          .extract({
            left: width > height ? end * (width - side) : 0,
            top: height > width ? end * (height - side) : 0,
            width: side,
            height: side,
          })
          .normalise()
          .sharpen({ sigma: 1 }),
      );
    }
  }
}

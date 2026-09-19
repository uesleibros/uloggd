import {
  Atkinson_Hyperlegible_Next,
  Inter,
  Source_Sans_3,
  Source_Serif_4,
} from "next/font/google";

/**
 * The site's typefaces, declared once.
 *
 * Two documents need them: the locale layout, and the global 404, which Next
 * renders outside every layout and so has to set up its own `<html>`. Declared
 * in each, the two could drift apart and the 404 would be the one page in a
 * different font.
 */
export const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

export const readable = Atkinson_Hyperlegible_Next({
  variable: "--font-readable",
  subsets: ["latin"],
  adjustFontFallback: false,
});

export const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

/** Every font's CSS variable, for the `<html>` class. */
export const fontVariables = [inter, sourceSans, readable, sourceSerif]
  .map((font) => font.variable)
  .join(" ");

import type { MetadataRoute } from "next";

/**
 * Makes uloggd installable to a home screen.
 *
 * Lives at the root of `app/` rather than under `[lang]`, because a manifest is
 * a single document per origin and the file convention only resolves there.
 * That means the copy here cannot follow the viewer's locale the way the rest
 * of the interface does, so it is written in Portuguese, the default locale and
 * the one most of the community reads.
 *
 * `start_url` is the bare root on purpose: the proxy redirects it to the
 * viewer's language, so an installed icon follows whatever their browser asks
 * for instead of freezing the language chosen on the day they installed it.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "uloggd",
    short_name: "uloggd",
    description:
      "Seu diário de jogos: registre sessões, escreva avaliações e acompanhe o que a comunidade está jogando.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["games", "social", "entertainment"],
    // Matches the app's own background so the splash screen does not flash a
    // different colour before the shell paints.
    background_color: "#0b0a0d",
    theme_color: "#0b0a0d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      // Android crops icons to whatever shape the launcher uses. The maskable
      // variant pads the mark into the safe zone so a circular mask cannot
      // clip it, and pads with the logo's own background so there is no seam.
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Buscar jogos",
        url: "/pt-BR/search",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Minha biblioteca",
        url: "/pt-BR/library",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Avaliações",
        url: "/pt-BR/reviews",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}

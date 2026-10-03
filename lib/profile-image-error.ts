import { tri, type UiLang } from "./ui-text";
export function profileImageError(
  lang: UiLang,
  code?: string,
  retryAfter = 60,
) {
  if (code === "rate_limited") {
    const minutes = Math.max(1, Math.ceil(retryAfter / 60));
    return tri(
      lang,
      `Aguarde ${minutes} min para trocar a imagem novamente.`,
      `Wait ${minutes} min before changing the image again.`,
      `Espera ${minutes} min antes de cambiar la imagen de nuevo.`,
    );
  }
  if (code === "invalid_image" || code === "too_large")
    return tri(
      lang,
      "Não foi possível processar este arquivo. Use uma imagem de até 15 MB; animações devem ter até 300 quadros e 15 s para foto ou 20 s para banner.",
      "This file could not be processed. Use an image up to 15 MB; animations allow up to 300 frames and 15 s for avatars or 20 s for banners.",
      "No se pudo procesar este archivo. Usa una imagen de hasta 15 MB; las animaciones admiten hasta 300 cuadros y 15 s para foto o 20 s para banner.",
    );
  if (code === "sensitive_image")
    return tri(
      lang,
      "Esta imagem foi recusada pela verificação de conteúdo. Escolha outra imagem.",
      "The content check refused this image. Choose another image.",
      "La verificación de contenido rechazó esta imagen. Elige otra.",
    );
  if (code === "busy" || code === "screening_unavailable")
    return tri(
      lang,
      "O processamento de imagens está indisponível agora. Tente novamente em instantes.",
      "Image processing is unavailable right now. Try again shortly.",
      "El procesamiento de imágenes no está disponible ahora. Inténtalo en unos instantes.",
    );
  return tri(
    lang,
    "Não foi possível enviar a imagem. Tente novamente; sua imagem atual foi mantida.",
    "The image could not be uploaded. Try again; your current image was kept.",
    "No se pudo subir la imagen. Inténtalo de nuevo; se conservó tu imagen actual.",
  );
}

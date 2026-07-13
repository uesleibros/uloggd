"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, LoaderCircle, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useEffect } from "react";
import ReactCrop, {
  centerCrop,
  convertToPixelCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";

function canvasBlob(
  image: HTMLImageElement,
  crop: PixelCrop,
  maxWidth: number,
) {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const sourceWidth = crop.width * scaleX;
  const sourceHeight = crop.height * scaleY;
  const scale = Math.min(1, maxWidth / sourceWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas_unavailable");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("blob_failed"))),
      "image/webp",
      0.86,
    ),
  );
}

export function ImageCropDialog({
  source,
  kind,
  lang,
  onClose,
  onSaved,
}: {
  source: string;
  kind: "avatar" | "banner";
  lang: "pt-BR" | "en";
  onClose: () => void;
  onSaved: (url: string) => void;
}) {
  const pt = lang === "pt-BR";
  const aspect = kind === "avatar" ? 1 : 3;
  const imageRef = useRef<HTMLImageElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(true);
  const [crop, setCrop] = useState<Crop>();
  const [completed, setCompleted] = useState<PixelCrop>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  function close() {
    if (!open) return;
    setOpen(false);
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 150;
    closeTimer.current = window.setTimeout(onClose, delay);
  }

  const load = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = event.currentTarget;
      const centered = centerCrop(
        makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height),
        width,
        height,
      );
      setCrop(centered);
      setCompleted(convertToPixelCrop(centered, width, height));
    },
    [aspect],
  );

  async function save() {
    if (!completed || !imageRef.current || pending) return;
    setPending(true);
    setError(null);
    try {
      const blob = await canvasBlob(
        imageRef.current,
        completed,
        kind === "avatar" ? 640 : 1800,
      );
      if (blob.size > 3 * 1024 * 1024) throw new Error("too_large");
      const body = new FormData();
      body.append("kind", kind);
      body.append("image", blob, `${kind}.webp`);
      const response = await fetch("/api/profile/image", {
        method: "POST",
        body,
      });
      const result = (await response.json()) as { url?: string };
      if (!response.ok || !result.url) throw new Error("upload_failed");
      onSaved(result.url);
      close();
    } catch {
      setError(
        pt
          ? "Não foi possível processar e enviar a imagem."
          : "Could not process and upload the image.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="profile-crop-backdrop" />
        <Dialog.Content className="profile-crop-modal">
          <header>
            <div>
              <Dialog.Title>
                {kind === "avatar"
                  ? pt
                    ? "Ajustar avatar"
                    : "Crop avatar"
                  : pt
                    ? "Ajustar banner"
                    : "Crop banner"}
              </Dialog.Title>
              <Dialog.Description>
                {pt
                  ? "Arraste e redimensione a área que será exibida."
                  : "Move and resize the area that will be displayed."}
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label={pt ? "Fechar" : "Close"}>
              <X size={18} />
            </Dialog.Close>
          </header>
          <div className={`profile-crop-stage crop-${kind}`}>
            <ReactCrop
              crop={crop}
              onChange={(_, percent) => setCrop(percent)}
              onComplete={(pixel) => setCompleted(pixel)}
              aspect={aspect}
              circularCrop={kind === "avatar"}
              keepSelection
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={imageRef} src={source} alt="" onLoad={load} />
            </ReactCrop>
          </div>
          {error && (
            <p className="profile-crop-error" role="alert">
              {error}
            </p>
          )}
          <footer>
            <button type="button" onClick={close} disabled={pending}>
              {pt ? "Cancelar" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!completed || pending}
            >
              {pending ? (
                <LoaderCircle className="spin" size={15} />
              ) : (
                <Check size={15} />
              )}
              {pt ? "Salvar imagem" : "Save image"}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

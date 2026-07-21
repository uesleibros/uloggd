"use client";

import * as Select from "@/components/ui/select";
import {
  Check,
  ChevronDown,
  ImagePlus,
  LoaderCircle,
  ShieldAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { tri, type UiLang } from "@/lib/ui-text";

type Visibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";

export function ScreenshotStudioForm({
  game,
  lang,
  onCancel,
}: {
  game: { id: number; slug: string; name: string };
  lang: UiLang;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [image, setImage] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [spoilers, setSpoilers] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(
    () => (image ? URL.createObjectURL(image) : null),
    [image],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!image || pending) return;
    setPending(true);
    setError(null);
    const body = new FormData();
    body.set("image", image);
    body.set("gameId", String(game.id));
    body.set("gameSlug", game.slug);
    body.set("description", description);
    body.set("visibility", visibility);
    body.set("spoilers", String(spoilers));
    try {
      const response = await fetch("/api/screenshots", {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as {
        id?: string;
        error?: string;
      };
      if (!response.ok || !payload.id) throw new Error(payload.error);
      router.push(`/${lang}/shot/${payload.id}`);
    } catch (reason) {
      setError(
        reason instanceof Error && reason.message === "rate_limited"
          ? tri(
              lang,
              "Você atingiu o limite temporário de publicações.",
              "You reached the temporary publishing limit.",
              "Alcanzaste el límite temporal de publicaciones.",
            )
          : tri(
              lang,
              "Não foi possível publicar a captura.",
              "Could not publish the screenshot.",
              "No se pudo publicar la captura.",
            ),
      );
      setPending(false);
    }
  }

  return (
    <form className="screenshot-studio" onSubmit={submit}>
      <label className="screenshot-dropzone" data-filled={Boolean(preview)}>
        {preview ? (
          // Blob previews are local and cannot use the Next image optimizer.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" />
        ) : (
          <span>
            <ImagePlus size={28} />
            <strong>
              {tri(
                lang,
                "Escolher captura",
                "Choose screenshot",
                "Elegir captura",
              )}
            </strong>
            <small>JPG, PNG ou WebP · 12 MB</small>
          </span>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          onChange={(event) => {
            const selected = event.target.files?.[0] ?? null;
            if (selected && selected.size > 12 * 1024 * 1024) {
              setError(
                tri(
                  lang,
                  "Imagem muito grande.",
                  "Image is too large.",
                  "La imagen es demasiado grande.",
                ),
              );
              event.target.value = "";
              return;
            }
            setError(null);
            setImage(selected);
          }}
        />
      </label>
      <label className="screenshot-description">
        <span>{tri(lang, "Descrição", "Description", "Descripción")}</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={2200}
          rows={4}
          placeholder={tri(
            lang,
            "O que estava acontecendo nesse momento?",
            "What was happening in this moment?",
            "¿Qué estaba pasando en este momento?",
          )}
        />
        <small>{description.length.toLocaleString(lang)} / 2.200</small>
      </label>
      <div className="screenshot-options">
        <label>
          <span>{tri(lang, "Visibilidade", "Visibility", "Visibilidad")}</span>
          <Select.Root
            value={visibility}
            onValueChange={(value) => setVisibility(value as Visibility)}
          >
            <Select.Trigger className="editor-select-trigger">
              <Select.Value />
              <Select.Icon>
                <ChevronDown size={14} />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                className="editor-select-content"
                position="popper"
                sideOffset={6}
              >
                <Select.Viewport>
                  {(["PUBLIC", "FOLLOWERS", "PRIVATE"] as const).map(
                    (value) => (
                      <Select.Item
                        className="editor-select-item"
                        value={value}
                        key={value}
                      >
                        <Select.ItemText>
                          {value === "PUBLIC"
                            ? tri(lang, "Pública", "Public", "Pública")
                            : value === "FOLLOWERS"
                              ? tri(
                                  lang,
                                  "Seguidores",
                                  "Followers",
                                  "Seguidores",
                                )
                              : tri(lang, "Privada", "Private", "Privada")}
                        </Select.ItemText>
                        <Select.ItemIndicator>
                          <Check size={13} />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ),
                  )}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </label>
        <label className="screenshot-spoiler">
          <input
            type="checkbox"
            checked={spoilers}
            onChange={(event) => setSpoilers(event.target.checked)}
          />
          <ShieldAlert size={16} />
          <span>
            {tri(
              lang,
              "Contém spoilers",
              "Contains spoilers",
              "Contiene spoilers",
            )}
          </span>
        </label>
      </div>
      {error && (
        <p className="social-form-error" role="alert">
          {error}
        </p>
      )}
      <footer>
        <button type="button" onClick={onCancel} disabled={pending}>
          {tri(lang, "Cancelar", "Cancel", "Cancelar")}
        </button>
        <button type="submit" disabled={!image || pending} aria-busy={pending}>
          {pending && <LoaderCircle className="spin" size={15} />}
          {pending
            ? tri(lang, "Publicando…", "Publishing…", "Publicando…")
            : tri(
                lang,
                "Publicar captura",
                "Publish screenshot",
                "Publicar captura",
              )}
        </button>
      </footer>
    </form>
  );
}

"use client";

import { Checkbox } from "@/components/ui/checkbox";

import * as Select from "@/components/ui/select";
import {
  Check,
  ChevronDown,
  EyeOff,
  Globe2,
  ImagePlus,
  LockKeyhole,
  LoaderCircle,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { tri, type UiLang } from "@/lib/ui-text";
import {
  MAX_IMAGE_SOURCE_BYTES,
  prepareImageUpload,
} from "@/lib/prepare-image-upload";
import {
  ScreeningDialog,
  useImageScreening,
} from "@/components/image-screening";
import { CommunityTextArea } from "./comment-parts";
import {
  CommunityScopeSelect,
  type CommunityScope,
} from "./community-scope-select";
import { requestXpRefresh } from "@/lib/xp-feedback";

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
  const [sensitive, setSensitive] = useState(false);
  // Whether the automatic check is what set the flag. Cleared the moment the
  // author touches the box, so an override is recorded as theirs.
  const [sensitiveAuto, setSensitiveAuto] = useState(false);
  const screening = useImageScreening();
  const [commentsScope, setCommentsScope] =
    useState<CommunityScope>("EVERYONE");
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
    body.set("sensitive", String(sensitive));
    body.set("sensitiveAuto", String(sensitiveAuto));
    body.set("commentsScope", commentsScope);
    try {
      body.set(
        "image",
        await prepareImageUpload(image, { name: "screenshot.webp" }),
      );
      const response = await fetch("/api/screenshots", {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as {
        id?: string;
        error?: string;
      };
      if (!response.ok || !payload.id)
        throw new Error(
          response.status === 503 && payload.error === "busy"
            ? "busy"
            : payload.error,
        );
      requestXpRefresh();
      router.push(`/${lang}/shot/${payload.id}`);
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : "unknown";
      setError(
        code === "busy"
          ? tri(
              lang,
              "Estamos processando muitas imagens agora. Tente de novo em alguns segundos.",
              "We are processing too many images right now. Try again in a few seconds.",
              "Estamos procesando muchas imágenes ahora. Inténtalo de nuevo en unos segundos.",
            )
          : code === "rate_limited"
            ? tri(
                lang,
                "Você atingiu o limite temporário de publicações.",
                "You reached the temporary publishing limit.",
                "Alcanzaste el límite temporal de publicaciones.",
              )
            : code === "invalid_image" || code === "transport_too_large"
              ? tri(
                  lang,
                  "Não foi possível processar esta imagem. Tente outra captura.",
                  "Could not process this image. Try another screenshot.",
                  "No se pudo procesar esta imagen. Prueba otra captura.",
                )
              : code === "service_unavailable"
                ? tri(
                    lang,
                    "O serviço está temporariamente indisponível. Tente novamente.",
                    "The service is temporarily unavailable. Try again.",
                    "El servicio no está disponible temporalmente. Inténtalo de nuevo.",
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
            if (selected && selected.size > MAX_IMAGE_SOURCE_BYTES) {
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
            setSensitive(false);
            setSensitiveAuto(false);
            // Runs on the picked file, in this browser, before anything is
            // uploaded. A failure reports itself rather than passing silently,
            // so nobody is told their picture is fine when nothing looked.
            void screening.screen(selected).then((result) => {
              if (!result.sensitive) return;
              setSensitive(true);
              setSensitiveAuto(true);
            });
          }}
        />
      </label>
      <CommunityTextArea
        className="profile-comment-composer screenshot-description"
        id="screenshot-description"
        label={tri(lang, "Descrição", "Description", "Descripción")}
        value={description}
        maxLength={2200}
        rows={4}
        placeholder={tri(
          lang,
          "O que estava acontecendo nesse momento?",
          "What was happening in this moment?",
          "¿Qué estaba pasando en este momento?",
        )}
        onChange={setDescription}
      />
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
                className="editor-select-menu"
                position="popper"
                sideOffset={6}
                collisionPadding={12}
              >
                <Select.Viewport>
                  {(["PUBLIC", "FOLLOWERS", "PRIVATE"] as const).map(
                    (value) => (
                      <Select.Item
                        className="editor-select-option"
                        value={value}
                        key={value}
                      >
                        {value === "PUBLIC" ? (
                          <Globe2 size={14} />
                        ) : value === "FOLLOWERS" ? (
                          <Users size={14} />
                        ) : (
                          <LockKeyhole size={14} />
                        )}
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
        <label>
          <span>{tri(lang, "Comentários", "Comments", "Comentarios")}</span>
          <CommunityScopeSelect
            value={commentsScope}
            onChange={setCommentsScope}
            lang={lang}
          />
        </label>
        <label className="screenshot-spoiler">
          <Checkbox checked={spoilers} onCheckedChange={setSpoilers} />
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
        <label className="screenshot-spoiler">
          <Checkbox
            checked={sensitive}
            onCheckedChange={(next) => {
              setSensitive(next);
              // Once someone decides for themselves, the flag stops being the
              // check's and the row should say so.
              setSensitiveAuto(false);
            }}
          />
          <EyeOff size={16} />
          <span>
            {tri(
              lang,
              "Conteúdo sensível",
              "Sensitive content",
              "Contenido sensible",
            )}
          </span>
        </label>
        <ScreeningDialog
          state={screening.state}
          lang={lang}
          outcome="marks"
          onClose={screening.reset}
        />
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

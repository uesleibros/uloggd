"use client";

/* eslint-disable @next/next/no-img-element */

import {
  AlertTriangle,
  CheckCircle2,
  ImageIcon,
  LoaderCircle,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { FaInstagram, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { SiTwitch } from "react-icons/si";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { RotateCcw } from "lucide-react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";
import { ProfileImageHistory } from "./profile-image-history";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import {
  ScreeningDialog,
  useImageScreening,
} from "@/components/image-screening";

const ImageCropDialog = dynamic(
  () => import("./image-crop-dialog").then((mod) => mod.ImageCropDialog),
  { ssr: false },
);

// People paste the whole profile URL ("instagram.com/foo",
// "https://youtube.com/@chan") or an @handle; the RPC only accepts the bare
// handle, so pull it out here instead of erroring on a reasonable input.
function socialHandle(raw: string): string {
  let value = raw.trim();
  if (!value) return "";
  const url = /^(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.[a-z.]{2,}\/(.+)$/i.exec(
    value,
  );
  if (url) {
    const parts = url[1].split(/[/?#]/).filter(Boolean);
    // Prefer an @handle segment (youtube.com/@chan) over a leading path like /c/.
    value = parts.find((part) => part.startsWith("@")) ?? parts[0] ?? "";
  }
  return value.split(/[/?#]/)[0].replace(/^@+/, "").trim();
}

/**
 * The failure notice for one picture, drawn inside that picture's own card.
 *
 * Its own component because the avatar and the banner sit in different places
 * in the markup, and the whole point of the fix is that the message appears
 * beside the control that produced it.
 */
function ImageError({
  error,
  kind,
}: {
  error: { kind: "avatar" | "banner"; text: string } | null;
  kind: "avatar" | "banner";
}) {
  if (!error || error.kind !== kind) return null;
  return (
    <p className="profile-image-error" role="alert">
      <AlertTriangle size={13} aria-hidden />
      {error.text}
    </p>
  );
}

const SOCIAL_RULES = {
  youtube: /^[A-Za-z0-9._-]{1,100}$/,
  instagram: /^[A-Za-z0-9._]{1,30}$/,
  twitter: /^[A-Za-z0-9_]{1,15}$/,
} as const;

export type Profile = {
  username: string;
  display_name: string | null;
  pronouns: string | null;
  bio: string | null;
  drawer: string | null;
  thought: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  // Nullable because it arrives from `own_age_profile()` rather than the
  // profile row, and that function answers nothing for a caller with no row.
  birth_date: string | null;
  youtube_username: string | null;
  instagram_username: string | null;
  twitter_username: string | null;
  /**
   * Read-only here. It arrives through OAuth in Conexões and the form never
   * sends it back; the field exists so the row is visibly a row, not a gap.
   */
  twitch_username: string | null;
};

export function ProfileSettingsPanel({
  initial,
  lang,
}: {
  initial: Profile;
  lang: UiLang;
}) {
  const t = uiText(lang);
  const router = useRouter();
  const detailsRef = useRef<HTMLFormElement>(null);
  const [detailsDirty, setDetailsDirty] = useState(false);
  const [profile, setProfile] = useState(initial);
  const [thought, setThought] = useState(initial.thought ?? "");
  const [drawer, setDrawer] = useState(initial.drawer ?? "");
  const [savedDrawer, setSavedDrawer] = useState(initial.drawer ?? "");
  const [drawerMessage, setDrawerMessage] = useState<string | null>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [crop, setCrop] = useState<{
    source: string;
    kind: "avatar" | "banner";
  } | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Separate from the form's own error on purpose. The images live in the
  // other column, and a cooldown or a rejected file used to render beside the
  // "Save profile" button, where it read as the form having failed and left
  // the picture that actually failed saying nothing.
  const [imageError, setImageError] = useState<{
    kind: "avatar" | "banner";
    text: string;
  } | null>(null);
  const screening = useImageScreening();
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  async function chooseImage(
    file: File | undefined,
    kind: "avatar" | "banner",
  ) {
    if (!file) return;
    if (
      !file.type.match(/^image\/(jpeg|png|webp|gif|avif)$/) ||
      file.size > 8 * 1024 * 1024
    ) {
      setImageError({
        kind,
        text: tri(
          lang,
          "Escolha uma imagem JPG, PNG, WebP, GIF ou AVIF de até 8 MB.",
          "Choose a JPG, PNG, WebP, GIF, or AVIF image up to 8 MB.",
          "Elige una imagen JPG, PNG, WebP, GIF o AVIF de hasta 8 MB.",
        ),
      });
      return;
    }
    setImageError(null);

    // Refused rather than marked, which is the opposite of what a screenshot
    // gets. A screenshot can sit behind a cover the reader chooses to open; an
    // avatar is drawn beside every comment its owner writes and every entry
    // they post, where nobody chose to look at it and no cover would fit. The
    // check is advisory everywhere it runs, so this raises the floor rather
    // than sealing the door: the upload endpoint is still the thing that has
    // to be moderated.
    const verdict = await screening.screen(file);
    if (verdict.sensitive) return;

    // Cropping runs through a canvas, which would flatten an animated GIF
    // to a single frame. GIFs upload untouched instead.
    if (file.type === "image/gif") {
      void uploadOriginal(file, kind);
      return;
    }
    setCrop({ source: URL.createObjectURL(file), kind });
  }

  async function uploadOriginal(file: File, kind: "avatar" | "banner") {
    if (pending) return;
    setPending(kind);
    setImageError(null);
    const body = new FormData();
    body.append("kind", kind);
    body.append("image", file, file.name);
    try {
      const response = await fetch("/api/profile/image", {
        method: "POST",
        body,
      });
      const result = (await response.json()) as {
        url?: string;
        error?: string;
        retryAfter?: number;
      };
      // The wait is the whole message. "Could not upload" over a cooldown
      // reads as a fault and gets retried immediately, which is exactly what
      // the limit is trying to stop.
      if (response.status === 429) {
        const minutes = Math.max(1, Math.ceil((result.retryAfter ?? 60) / 60));
        setImageError({
          kind,
          text: tri(
            lang,
            `Você trocou de imagem muitas vezes seguidas. Tente de novo em ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`,
            `You changed images too many times in a row. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`,
            `Cambiaste de imagen demasiadas veces seguidas. Inténtalo en ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`,
          ),
        });
        setPending(null);
        return;
      }
      if (!response.ok || !result.url) throw new Error("upload_failed");
      setProfile((current) => ({
        ...current,
        [kind === "avatar" ? "avatar_url" : "banner_url"]: result.url,
      }));
      router.refresh();
    } catch {
      setImageError({
        kind,
        text: tri(
          lang,
          "Não foi possível enviar a imagem. A anterior continua no lugar.",
          "Could not upload the image. The previous one is still in place.",
          "No se pudo subir la imagen. La anterior sigue en su lugar.",
        ),
      });
    }
    setPending(null);
  }

  async function saveDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const values = new FormData(event.currentTarget);
    const displayName = String(values.get("displayName") ?? "").trim();
    const pronouns = String(values.get("pronouns") ?? "").trim();
    const bio = String(values.get("bio") ?? "").trim();
    const currentThought = String(values.get("thought") ?? "").trim();
    const youtube = socialHandle(String(values.get("youtube") ?? ""));
    const instagram = socialHandle(String(values.get("instagram") ?? ""));
    const twitter = socialHandle(String(values.get("twitter") ?? ""));
    if (
      displayName.length > 80 ||
      pronouns.length > 30 ||
      bio.length > 500 ||
      currentThought.length > 100 ||
      /[\r\n]/.test(currentThought)
    ) {
      setError(
        tri(
          lang,
          "Algum campo passou do limite de caracteres. O contador embaixo dele mostra qual.",
          "A field is over its character limit. The counter under it shows which.",
          "Algún campo supera su límite de caracteres. El contador debajo muestra cuál.",
        ),
      );
      return;
    }
    // A specific message beats the generic "could not save" when a handle still
    // has stray characters after extraction.
    const badSocial = (
      [
        [youtube, SOCIAL_RULES.youtube, "YouTube"],
        [instagram, SOCIAL_RULES.instagram, "Instagram"],
        [twitter, SOCIAL_RULES.twitter, "X"],
      ] as const
    ).find(([value, rule]) => value && !rule.test(value));
    if (badSocial) {
      setError(
        tri(
          lang,
          `Usuário do ${badSocial[2]} inválido. Use só o @ ou o nome de usuário.`,
          `Invalid ${badSocial[2]} username. Use just the @ or the handle.`,
          `Usuario de ${badSocial[2]} inválido. Usa solo el @ o el nombre de usuario.`,
        ),
      );
      return;
    }
    setPending("details");
    setError(null);
    setMessage(null);
    const client = createClient();
    const { data, error: actionError } = await client.rpc(
      "update_profile_settings",
      {
        new_display_name: displayName,
        new_pronouns: pronouns,
        new_bio: bio,
        new_thought: currentThought,
        new_youtube_username: youtube,
        new_instagram_username: instagram,
        new_twitter_username: twitter,
      },
    );
    if (actionError || !data)
      setError(
        tri(
          lang,
          "Não foi possível salvar. Nada foi alterado, tente de novo.",
          "Could not save. Nothing changed, try again.",
          "No se pudo guardar. Nada cambió, inténtalo de nuevo.",
        ),
      );
    else {
      setProfile((current) => ({
        ...current,
        display_name: displayName || null,
        pronouns: pronouns || null,
        bio: bio || null,
        thought: currentThought || null,
        youtube_username: youtube.replace(/^@/, "") || null,
        instagram_username: instagram.replace(/^@/, "") || null,
        twitter_username: twitter.replace(/^@/, "") || null,
      }));
      setMessage(
        tri(
          lang,
          "Perfil salvo e já visível para todo mundo.",
          "Profile saved and already visible to everyone.",
          "Perfil guardado y ya visible para todos.",
        ),
      );
      setDetailsDirty(false);
      router.refresh();
    }
    setPending(null);
  }

  async function saveDrawer() {
    if (pending) return;
    const next = drawer.trim();
    if (next.length > 10000) {
      // Says how far over, not just that it is over: "too long" leaves the
      // person deleting blindly until it stops complaining.
      const over = next.length - 10000;
      setDrawerError(
        tri(
          lang,
          `A vitrine tem ${next.length.toLocaleString("pt-BR")} caracteres, ${over.toLocaleString("pt-BR")} acima do limite de 10.000.`,
          `The showcase is ${next.length.toLocaleString("en")} characters, ${over.toLocaleString("en")} over the 10,000 limit.`,
          `La vitrina tiene ${next.length.toLocaleString("es")} caracteres, ${over.toLocaleString("es")} por encima del límite de 10.000.`,
        ),
      );
      return;
    }
    setPending("drawer");
    setDrawerError(null);
    setDrawerMessage(null);
    const { data, error: actionError } = await createClient().rpc(
      "update_profile_drawer",
      { new_drawer: next },
    );
    if (actionError || !data)
      setDrawerError(
        tri(
          lang,
          "Não foi possível salvar a vitrine. Nada foi alterado, tente de novo.",
          "Could not save the showcase. Nothing changed, try again.",
          "No se pudo guardar la vitrina. Nada cambió, inténtalo de nuevo.",
        ),
      );
    else {
      setProfile((current) => ({ ...current, drawer: next || null }));
      setSavedDrawer(next);
      setDrawerMessage(
        tri(
          lang,
          "Vitrine salva e já visível no seu perfil.",
          "Showcase saved and already live on your profile.",
          "Drawer actualizado.",
        ),
      );
      router.refresh();
    }
    setPending(null);
  }

  /**
   * Applies a picture the account used before. Goes through the same endpoint
   * as an upload with a `reuse` flag rather than writing the column directly,
   * so the history and the profile stay written by one place.
   */
  async function reuseImage(kind: "avatar" | "banner", url: string) {
    if (pending) return;
    setPending(kind);
    setImageError(null);
    const response = await fetch("/api/profile/image", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, url }),
    });
    if (response.status === 429) {
      // Reusing an old picture is still a change everybody else sees, so it
      // shares the same allowance and needs the same message.
      const { retryAfter } = (await response.json()) as {
        retryAfter?: number;
      };
      const minutes = Math.max(1, Math.ceil((retryAfter ?? 60) / 60));
      setImageError({
        kind,
        text: tri(
          lang,
          `Você trocou de imagem muitas vezes seguidas. Tente de novo em ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`,
          `You changed images too many times in a row. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`,
          `Cambiaste de imagen demasiadas veces seguidas. Inténtalo en ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`,
        ),
      });
    } else if (!response.ok)
      setImageError({
        kind,
        text: tri(
          lang,
          "Não foi possível usar esta imagem.",
          "Could not use this image.",
          "No se pudo usar esta imagen.",
        ),
      });
    else {
      setProfile((current) => ({
        ...current,
        [kind === "avatar" ? "avatar_url" : "banner_url"]: url,
      }));
      router.refresh();
    }
    setPending(null);
  }

  async function removeImage(kind: "avatar" | "banner") {
    if (pending) return;
    setPending(kind);
    setImageError(null);
    const response = await fetch(`/api/profile/image?kind=${kind}`, {
      method: "DELETE",
    });
    if (!response.ok)
      setImageError({
        kind,
        text: tri(
          lang,
          "Não foi possível remover a imagem.",
          "Could not remove the image.",
          "No se pudo quitar la imagen.",
        ),
      });
    else {
      setProfile((current) => ({
        ...current,
        [kind === "avatar" ? "avatar_url" : "banner_url"]: null,
      }));
      router.refresh();
    }
    setPending(null);
  }

  return (
    <div className="profile-settings-content">
      <UnsavedChangesGuard
        lang={lang}
        dirty={detailsDirty || drawer.trim() !== savedDrawer.trim()}
      />
      <form
        className="profile-details-form"
        ref={detailsRef}
        onSubmit={saveDetails}
        onInput={() => setDetailsDirty(true)}
      >
        <header>
          <h2>
            {tri(
              lang,
              "Informações públicas",
              "Public information",
              "Información pública",
            )}
          </h2>
          <p>
            {tri(
              lang,
              "Nome de exibição, pronomes e bio aparecem no seu perfil. Todos são opcionais.",
              "Display name, pronouns, and bio appear on your profile. All are optional.",
              "El nombre visible, los pronombres y la bio aparecen en tu perfil. Todos son opcionales.",
            )}
          </p>
        </header>
        <label>
          {tri(lang, "Nome de exibição", "Display name", "Nombre visible")}
          <input
            name="displayName"
            defaultValue={profile.display_name ?? ""}
            maxLength={80}
            placeholder={tri(
              lang,
              "Como você quer ser chamado",
              "How you want to be known",
              "Cómo quieres que te llamen",
            )}
          />
        </label>
        <label>
          {tri(lang, "Pronomes", "Pronouns", "Pronombres")}
          <input
            name="pronouns"
            defaultValue={profile.pronouns ?? ""}
            maxLength={30}
            placeholder={tri(
              lang,
              "Ex.: ele/dele, ela/dela, elu/delu",
              "E.g. he/him, she/her, they/them",
              "Ej.: él, ella, elle",
            )}
          />
        </label>
        <label className="profile-thought-field">
          <span className="profile-field-label">
            <span>
              {tri(
                lang,
                "Pensamento atual",
                "Current thought",
                "Pensamiento actual",
              )}
            </span>
            <small>{thought.length}/100</small>
          </span>
          <input
            name="thought"
            value={thought}
            onChange={(event) => setThought(event.target.value)}
            maxLength={100}
            placeholder={tri(
              lang,
              "O que está passando pela sua cabeça?",
              "What's on your mind?",
              "¿Qué estás pensando?",
            )}
          />
          <small>
            {tri(
              lang,
              "Aparece em um balão sobre seu avatar.",
              "Appears in a bubble above your avatar.",
              "Aparece en un globo sobre tu avatar.",
            )}
          </small>
        </label>
        <label>
          {tri(lang, "Bio", "Bio", "Bio")}
          <textarea
            name="bio"
            defaultValue={profile.bio ?? ""}
            maxLength={500}
            rows={5}
            placeholder={tri(
              lang,
              "Conte um pouco sobre você e os jogos que gosta.",
              "Share a little about yourself and the games you enjoy.",
              "Cuenta un poco sobre ti y los juegos que te gustan.",
            )}
          />
        </label>
        <fieldset className="profile-social-fields">
          <legend>
            {tri(lang, "Redes sociais", "Social networks", "Redes sociales")}
          </legend>
          <p>
            {tri(
              lang,
              "Informe apenas o nome de usuário. Os links são montados automaticamente.",
              "Enter only the username. Links are built automatically.",
              "Escribe solo el nombre de usuario. Los enlaces se construyen automáticamente.",
            )}
          </p>
          {/* Present but not typeable. A handle written by hand is a claim
              about yourself, and this one has to come from Twitch; leaving the
              row out entirely made it look like Twitch was not supported,
              while a locked field says plainly that it is filled in elsewhere
              and shows the channel once it is. */}
          <label className="profile-social-locked">
            <SiTwitch size={14} /> Twitch
            <input
              name="twitch"
              value={profile.twitch_username ?? ""}
              disabled
              readOnly
              placeholder={tri(
                lang,
                "Conecte sua conta",
                "Connect your account",
                "Conecta tu cuenta",
              )}
            />
          </label>
          <p className="profile-social-elsewhere">
            <Link href={`/${lang}/settings?tab=connections`}>
              {profile.twitch_username
                ? tri(
                    lang,
                    "Gerenciar em Conexões",
                    "Manage in Connections",
                    "Gestionar en Conexiones",
                  )
                : tri(
                    lang,
                    "Conectar a Twitch em Conexões",
                    "Connect Twitch in Connections",
                    "Conectar Twitch en Conexiones",
                  )}
            </Link>
            {" · "}
            {tri(
              lang,
              "a conta é verificada pela própria Twitch.",
              "the account is verified by Twitch itself.",
              "la cuenta la verifica la propia Twitch.",
            )}
          </p>
          <label>
            <FaYoutube size={15} /> YouTube
            <input
              name="youtube"
              defaultValue={profile.youtube_username ?? ""}
              maxLength={100}
              placeholder="seucanal"
            />
          </label>
          <label>
            <FaInstagram size={15} /> Instagram
            <input
              name="instagram"
              defaultValue={profile.instagram_username ?? ""}
              maxLength={30}
              placeholder="seuusuario"
            />
          </label>
          <label>
            <FaXTwitter size={14} /> Twitter / X
            <input
              name="twitter"
              defaultValue={profile.twitter_username ?? ""}
              maxLength={15}
              placeholder="seuusuario"
            />
          </label>
        </fieldset>
        <div className="profile-form-footer">
          {/* Beside the button that caused it. The save error used to render
              down in the image section, so pressing Save at the top of the
              form put the reason for the failure off screen. */}
          <span
            className="settings-save-status"
            data-state={
              pending === "details"
                ? "saving"
                : error
                  ? "error"
                  : message
                    ? "saved"
                    : detailsDirty
                      ? "dirty"
                      : undefined
            }
            role={error ? "alert" : "status"}
          >
            {pending === "details" ? (
              <>
                <LoaderCircle className="spin" size={13} aria-hidden />
                {tri(lang, "Salvando…", "Saving…", "Guardando…")}
              </>
            ) : error ? (
              <>
                <AlertTriangle size={13} aria-hidden />
                {error}
              </>
            ) : message ? (
              <>
                <CheckCircle2 size={13} aria-hidden />
                {message}
              </>
            ) : detailsDirty ? (
              t.unsavedChanges
            ) : null}
          </span>
          <div className="profile-form-actions">
            {detailsDirty && (
              <button
                type="button"
                className="settings-revert"
                onClick={() => {
                  // Native reset restores every field to the value the server
                  // rendered, which is exactly "how it was".
                  detailsRef.current?.reset();
                  setThought(profile.thought ?? "");
                  setDetailsDirty(false);
                  setMessage(null);
                  setError(null);
                }}
              >
                <RotateCcw size={14} />
                {t.revert}
              </button>
            )}
            <button type="submit" disabled={Boolean(pending)}>
              {pending === "details" && (
                <LoaderCircle className="spin" size={15} />
              )}
              {pending !== "details" && <Save size={14} />}
              {tri(lang, "Salvar perfil", "Save profile", "Guardar perfil")}
            </button>
          </div>
        </div>
      </form>

      <div className="profile-settings-side">
        <section className="profile-image-setting avatar-setting">
          <header>
            <div>
              <h2>
                {tri(
                  lang,
                  "Avatar do perfil",
                  "Profile avatar",
                  "Avatar del perfil",
                )}
              </h2>
              <p>
                {tri(
                  lang,
                  "A imagem que identifica você em todo o uloggd.",
                  "The image that identifies you across uloggd.",
                  "La imagen que te identifica en todo uloggd.",
                )}
              </p>
            </div>
          </header>
          <div className="profile-image-setting-body">
            <div className="profile-avatar-preview">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" />
              ) : (
                <span>{profile.username.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div>
              <strong>{profile.display_name || `@${profile.username}`}</strong>
              {profile.display_name && (
                <span className="profile-settings-handle">
                  @{profile.username}
                </span>
              )}
              <div className="profile-image-actions">
                <button
                  type="button"
                  onClick={() => avatarInput.current?.click()}
                >
                  <Upload size={14} />
                  {profile.avatar_url
                    ? tri(
                        lang,
                        "Trocar avatar",
                        "Change avatar",
                        "Cambiar avatar",
                      )
                    : tri(
                        lang,
                        "Enviar avatar",
                        "Upload avatar",
                        "Subir avatar",
                      )}
                </button>
                {profile.avatar_url && (
                  <button
                    type="button"
                    onClick={() => removeImage("avatar")}
                    disabled={Boolean(pending)}
                  >
                    <Trash2 size={14} />
                    {t.remove}
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Below the row rather than inside it: the section is a flex row of
              preview and details, so a strip of thumbnails placed in the right
              column gets squeezed beside the avatar instead of running the
              width of the card. */}
          <ProfileImageHistory
            kind="AVATAR"
            current={profile.avatar_url}
            onSelect={(url) => reuseImage("avatar", url)}
            lang={lang}
          />
          <small>
            {tri(
              lang,
              "Recomendado: 640×640px · Máx. 8 MB · JPG, PNG, WebP, GIF ou AVIF",
              "Recommended: 640×640px · Max 8 MB · JPG, PNG, WebP, GIF, or AVIF",
              "Recomendado: 640×640px · Máx. 8 MB · JPG, PNG, WebP, GIF o AVIF",
            )}
          </small>
          <ImageError error={imageError} kind="avatar" />
        </section>

        <section className="profile-image-setting banner-setting">
          <header>
            <div>
              <h2>
                {tri(
                  lang,
                  "Banner do perfil",
                  "Profile banner",
                  "Banner del perfil",
                )}
              </h2>
              <p>
                {tri(
                  lang,
                  "Uma imagem panorâmica para o cabeçalho do seu perfil.",
                  "A wide image for your profile header.",
                  "Una imagen panorámica para la cabecera de tu perfil.",
                )}
              </p>
            </div>
          </header>
          <div className="profile-banner-preview">
            {profile.banner_url ? (
              <img src={profile.banner_url} alt="" />
            ) : (
              <ImageIcon size={28} />
            )}
          </div>
          <ProfileImageHistory
            kind="BANNER"
            current={profile.banner_url}
            onSelect={(url) => reuseImage("banner", url)}
            lang={lang}
          />
          <div className="profile-banner-actions">
            <button type="button" onClick={() => bannerInput.current?.click()}>
              <Upload size={15} />
              {profile.banner_url
                ? tri(lang, "Trocar banner", "Change banner", "Cambiar banner")
                : tri(lang, "Enviar banner", "Upload banner", "Subir banner")}
            </button>
            {profile.banner_url && (
              <button
                type="button"
                onClick={() => removeImage("banner")}
                disabled={Boolean(pending)}
              >
                <Trash2 size={14} />
                {tri(lang, "Remover banner", "Remove banner", "Quitar banner")}
              </button>
            )}
            <small>
              {tri(
                lang,
                "Recomendado: 1800×600px · Máx. 8 MB · JPG, PNG, WebP, GIF ou AVIF",
                "Recommended: 1800×600px · Max 8 MB · JPG, PNG, WebP, GIF, or AVIF",
                "Recomendado: 1800×600px · Máx. 8 MB · JPG, PNG, WebP, GIF o AVIF",
              )}
            </small>
          </div>
          <ImageError error={imageError} kind="banner" />
          {/* One notice for both pickers: they share the check, and only one
              picture is being chosen at a time. */}
          <ScreeningDialog
            state={screening.state}
            lang={lang}
            outcome="refuses"
            onClose={screening.reset}
          />
          <input
            ref={avatarInput}
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            onChange={(event) =>
              void chooseImage(event.target.files?.[0], "avatar")
            }
          />
          <input
            ref={bannerInput}
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            onChange={(event) =>
              void chooseImage(event.target.files?.[0], "banner")
            }
          />
        </section>
      </div>
      <section className="profile-drawer-setting">
        <header>
          <div>
            <h2>{tri(lang, "Vitrine", "Showcase", "Vitrina")}</h2>
            <p>
              {tri(
                lang,
                "Um espaço livre em Markdown no seu perfil: destaque jogos, listas, spoilers e o que mais quiser.",
                "A free-form Markdown space on your profile: showcase games, lists, spoilers, and anything else.",
                "Un espacio libre en Markdown en tu perfil: destaca juegos, listas, spoilers y lo que quieras.",
              )}
            </p>
          </div>
        </header>
        <MarkdownEditor
          value={drawer}
          onChange={setDrawer}
          maxLength={10000}
          rows={10}
          lang={lang}
          placeholder={tri(
            lang,
            "## Bem-vindo ao meu perfil\n\nUse a barra de ferramentas ou escreva Markdown direto.",
            "## Welcome to my profile\n\nUse the toolbar or write Markdown directly.",
            "## Bienvenido a mi perfil\n\nUsa la barra de herramientas o escribe Markdown directamente.",
          )}
        />
        <footer className="profile-form-footer">
          <span>
            {drawerError ? (
              <span className="social-form-error" role="alert">
                {drawerError}
              </span>
            ) : drawer.trim() !== savedDrawer.trim() ? (
              tri(
                lang,
                "Alterações não salvas",
                "Unsaved changes",
                "Cambios sin guardar",
              )
            ) : (
              drawerMessage
            )}
          </span>
          <div className="profile-form-actions">
            {drawer.trim() !== savedDrawer.trim() && (
              <button
                type="button"
                className="settings-revert"
                onClick={() => {
                  setDrawer(savedDrawer);
                  setDrawerMessage(null);
                  setDrawerError(null);
                }}
              >
                <RotateCcw size={14} />
                {t.revert}
              </button>
            )}
            <button
              type="button"
              onClick={() => void saveDrawer()}
              disabled={pending === "drawer"}
            >
              {pending === "drawer" ? (
                <LoaderCircle className="spin" size={15} />
              ) : (
                <Save size={15} />
              )}
              {pending === "drawer"
                ? t.saving
                : tri(
                    lang,
                    "Salvar vitrine",
                    "Save showcase",
                    "Guardar vitrina",
                  )}
            </button>
          </div>
        </footer>
      </section>
      {crop && (
        <ImageCropDialog
          source={crop.source}
          kind={crop.kind}
          lang={lang}
          onClose={() => {
            URL.revokeObjectURL(crop.source);
            setCrop(null);
          }}
          onSaved={(url) => {
            setProfile((current) => ({
              ...current,
              [crop.kind === "avatar" ? "avatar_url" : "banner_url"]: url,
            }));
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

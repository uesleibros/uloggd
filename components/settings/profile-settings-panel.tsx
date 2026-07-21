"use client";

/* eslint-disable @next/next/no-img-element */

import { ImageIcon, LoaderCircle, Save, Trash2, Upload } from "lucide-react";
import { FaInstagram, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { RotateCcw } from "lucide-react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

const ImageCropDialog = dynamic(
  () => import("./image-crop-dialog").then((mod) => mod.ImageCropDialog),
  { ssr: false },
);

export type Profile = {
  username: string;
  display_name: string | null;
  pronouns: string | null;
  bio: string | null;
  drawer: string | null;
  thought: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  birth_date: string;
  youtube_username: string | null;
  instagram_username: string | null;
  twitter_username: string | null;
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
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  function chooseImage(file: File | undefined, kind: "avatar" | "banner") {
    if (!file) return;
    if (
      !file.type.match(/^image\/(jpeg|png|webp|gif|avif)$/) ||
      file.size > 8 * 1024 * 1024
    ) {
      setError(
        tri(
          lang,
          "Escolha uma imagem JPG, PNG, WebP, GIF ou AVIF de até 8 MB.",
          "Choose a JPG, PNG, WebP, GIF, or AVIF image up to 8 MB.",
          "Elige una imagen JPG, PNG, WebP, GIF o AVIF de hasta 8 MB.",
        ),
      );
      return;
    }
    setError(null);
    // Cropping runs through a canvas, which would flatten an animated GIF
    // to a single frame — GIFs upload untouched instead.
    if (file.type === "image/gif") {
      void uploadOriginal(file, kind);
      return;
    }
    setCrop({ source: URL.createObjectURL(file), kind });
  }

  async function uploadOriginal(file: File, kind: "avatar" | "banner") {
    if (pending) return;
    setPending(kind);
    setError(null);
    const body = new FormData();
    body.append("kind", kind);
    body.append("image", file, file.name);
    try {
      const response = await fetch("/api/profile/image", {
        method: "POST",
        body,
      });
      const result = (await response.json()) as { url?: string };
      if (!response.ok || !result.url) throw new Error("upload_failed");
      setProfile((current) => ({
        ...current,
        [kind === "avatar" ? "avatar_url" : "banner_url"]: result.url,
      }));
      router.refresh();
    } catch {
      setError(
        tri(
          lang,
          "Não foi possível enviar a imagem.",
          "Could not upload the image.",
          "No se pudo subir la imagen.",
        ),
      );
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
    const youtube = String(values.get("youtube") ?? "").trim();
    const instagram = String(values.get("instagram") ?? "").trim();
    const twitter = String(values.get("twitter") ?? "").trim();
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
          "Revise os limites dos campos antes de salvar.",
          "Review the field limits before saving.",
          "Revisa los límites de los campos antes de guardar.",
        ),
      );
      return;
    }
    setPending("details");
    setError(null);
    setMessage(null);
    const { data, error: actionError } = await createClient().rpc(
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
          "Não foi possível salvar o perfil.",
          "Could not save the profile.",
          "No se pudo guardar el perfil.",
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
          "Perfil atualizado.",
          "Profile updated.",
          "Perfil actualizado.",
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
      setDrawerError(
        tri(
          lang,
          "O drawer passou do limite.",
          "The drawer is over the limit.",
          "El drawer supera el límite.",
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
          "Não foi possível salvar o drawer.",
          "Could not save the drawer.",
          "No se pudo guardar el drawer.",
        ),
      );
    else {
      setProfile((current) => ({ ...current, drawer: next || null }));
      setSavedDrawer(next);
      setDrawerMessage(
        tri(
          lang,
          "Drawer atualizado.",
          "Drawer updated.",
          "Drawer actualizado.",
        ),
      );
      router.refresh();
    }
    setPending(null);
  }

  async function removeImage(kind: "avatar" | "banner") {
    if (pending) return;
    setPending(kind);
    setError(null);
    const response = await fetch(`/api/profile/image?kind=${kind}`, {
      method: "DELETE",
    });
    if (!response.ok)
      setError(
        tri(
          lang,
          "Não foi possível remover a imagem.",
          "Could not remove the image.",
          "No se pudo quitar la imagen.",
        ),
      );
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
          <span>{detailsDirty ? t.unsavedChanges : message}</span>
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
          <small>
            {tri(
              lang,
              "Recomendado: 640×640px · Máx. 8 MB · JPG, PNG, WebP, GIF ou AVIF",
              "Recommended: 640×640px · Max 8 MB · JPG, PNG, WebP, GIF, or AVIF",
              "Recomendado: 640×640px · Máx. 8 MB · JPG, PNG, WebP, GIF o AVIF",
            )}
          </small>
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
          <input
            ref={avatarInput}
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            onChange={(event) => chooseImage(event.target.files?.[0], "avatar")}
          />
          <input
            ref={bannerInput}
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            onChange={(event) => chooseImage(event.target.files?.[0], "banner")}
          />
        </section>
        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}
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

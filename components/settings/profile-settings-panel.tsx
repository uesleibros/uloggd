"use client";

/* eslint-disable @next/next/no-img-element */

import { ImageIcon, LoaderCircle, Save, Trash2, Upload } from "lucide-react";
import { FaInstagram, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";

const ImageCropDialog = dynamic(
  () => import("./image-crop-dialog").then((mod) => mod.ImageCropDialog),
  { ssr: false },
);

export type Profile = {
  username: string;
  display_name: string | null;
  pronouns: string | null;
  bio: string | null;
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
  lang: "pt-BR" | "en";
}) {
  const pt = lang === "pt-BR";
  const router = useRouter();
  const [profile, setProfile] = useState(initial);
  const [thought, setThought] = useState(initial.thought ?? "");
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
      !file.type.match(/^image\/(jpeg|png|webp)$/) ||
      file.size > 8 * 1024 * 1024
    ) {
      setError(
        pt
          ? "Escolha uma imagem JPG, PNG ou WebP de até 8 MB."
          : "Choose a JPG, PNG, or WebP image up to 8 MB.",
      );
      return;
    }
    setError(null);
    setCrop({ source: URL.createObjectURL(file), kind });
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
        pt
          ? "Revise os limites dos campos antes de salvar."
          : "Review the field limits before saving.",
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
        pt
          ? "Não foi possível salvar o perfil."
          : "Could not save the profile.",
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
      setMessage(pt ? "Perfil atualizado." : "Profile updated.");
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
        pt
          ? "Não foi possível remover a imagem."
          : "Could not remove the image.",
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
      <form className="profile-details-form" onSubmit={saveDetails}>
        <header>
          <h2>{pt ? "Informações públicas" : "Public information"}</h2>
          <p>
            {pt
              ? "Nome de exibição, pronomes e bio aparecem no seu perfil. Todos são opcionais."
              : "Display name, pronouns, and bio appear on your profile. All are optional."}
          </p>
        </header>
        <label>
          {pt ? "Nome de exibição" : "Display name"}
          <input
            name="displayName"
            defaultValue={profile.display_name ?? ""}
            maxLength={80}
            placeholder={
              pt ? "Como você quer ser chamado" : "How you want to be known"
            }
          />
        </label>
        <label>
          {pt ? "Pronomes" : "Pronouns"}
          <input
            name="pronouns"
            defaultValue={profile.pronouns ?? ""}
            maxLength={30}
            placeholder={
              pt
                ? "Ex.: ele/dele, ela/dela, elu/delu"
                : "E.g. he/him, she/her, they/them"
            }
          />
        </label>
        <label className="profile-thought-field">
          <span className="profile-field-label">
            <span>{pt ? "Pensamento atual" : "Current thought"}</span>
            <small>{thought.length}/100</small>
          </span>
          <input
            name="thought"
            value={thought}
            onChange={(event) => setThought(event.target.value)}
            maxLength={100}
            placeholder={
              pt
                ? "O que está passando pela sua cabeça?"
                : "What's on your mind?"
            }
          />
          <small>
            {pt
              ? "Aparece em um balão sobre seu avatar."
              : "Appears in a bubble above your avatar."}
          </small>
        </label>
        <label>
          {pt ? "Bio" : "Bio"}
          <textarea
            name="bio"
            defaultValue={profile.bio ?? ""}
            maxLength={500}
            rows={5}
            placeholder={
              pt
                ? "Conte um pouco sobre você e os jogos que gosta."
                : "Share a little about yourself and the games you enjoy."
            }
          />
        </label>
        <fieldset className="profile-social-fields">
          <legend>{pt ? "Redes sociais" : "Social networks"}</legend>
          <p>
            {pt
              ? "Informe apenas o nome de usuário. Os links são montados automaticamente."
              : "Enter only the username. Links are built automatically."}
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
          <span>{message}</span>
          <button type="submit" disabled={Boolean(pending)}>
            {pending === "details" && (
              <LoaderCircle className="spin" size={15} />
            )}
            {pending !== "details" && <Save size={14} />}
            {pt ? "Salvar perfil" : "Save profile"}
          </button>
        </div>
      </form>

      <section className="profile-image-setting avatar-setting">
        <header>
          <div>
            <h2>{pt ? "Avatar do perfil" : "Profile avatar"}</h2>
            <p>
              {pt
                ? "A imagem que identifica você em todo o uloggd."
                : "The image that identifies you across uloggd."}
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
                  ? pt
                    ? "Trocar avatar"
                    : "Change avatar"
                  : pt
                    ? "Enviar avatar"
                    : "Upload avatar"}
              </button>
              {profile.avatar_url && (
                <button
                  type="button"
                  onClick={() => removeImage("avatar")}
                  disabled={Boolean(pending)}
                >
                  <Trash2 size={14} />
                  {pt ? "Remover" : "Remove"}
                </button>
              )}
            </div>
          </div>
        </div>
        <small>
          {pt
            ? "Recomendado: 640×640px · Máx. 8 MB · JPG, PNG ou WebP"
            : "Recommended: 640×640px · Max 8 MB · JPG, PNG, or WebP"}
        </small>
      </section>

      <section className="profile-image-setting banner-setting">
        <header>
          <div>
            <h2>{pt ? "Banner do perfil" : "Profile banner"}</h2>
            <p>
              {pt
                ? "Uma imagem panorâmica para o cabeçalho do seu perfil."
                : "A wide image for your profile header."}
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
              ? pt
                ? "Trocar banner"
                : "Change banner"
              : pt
                ? "Enviar banner"
                : "Upload banner"}
          </button>
          {profile.banner_url && (
            <button
              type="button"
              onClick={() => removeImage("banner")}
              disabled={Boolean(pending)}
            >
              <Trash2 size={14} />
              {pt ? "Remover banner" : "Remove banner"}
            </button>
          )}
          <small>
            {pt
              ? "Recomendado: 1800×600px · Máx. 8 MB · JPG, PNG ou WebP"
              : "Recommended: 1800×600px · Max 8 MB · JPG, PNG, or WebP"}
          </small>
        </div>
        <input
          ref={avatarInput}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => chooseImage(event.target.files?.[0], "avatar")}
        />
        <input
          ref={bannerInput}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => chooseImage(event.target.files?.[0], "banner")}
        />
      </section>
      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}
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

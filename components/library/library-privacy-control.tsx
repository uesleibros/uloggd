"use client";

import { Globe2, LoaderCircle, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

export function LibraryPrivacyControl({
  initial,
  lang,
}: {
  initial: "PUBLIC" | "PRIVATE";
  lang: UiLang;
}) {
  const t = uiText(lang);
  const [visibility, setVisibility] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function toggle() {
    if (pending) return;
    const next = visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";
    setPending(true);
    setError(false);
    const { error: actionError } = await createClient().rpc(
      "set_library_visibility",
      { new_visibility: next },
    );
    if (actionError) setError(true);
    else setVisibility(next);
    setPending(false);
  }
  const isPublic = visibility === "PUBLIC";
  return (
    <div className="library-privacy-control">
      <div>
        {isPublic ? <Globe2 size={16} /> : <LockKeyhole size={16} />}
        <span>
          <strong>
            {isPublic
              ? tri(
                  lang,
                  "Biblioteca pública",
                  "Public library",
                  "Biblioteca pública",
                )
              : tri(
                  lang,
                  "Biblioteca privada",
                  "Private library",
                  "Biblioteca privada",
                )}
          </strong>
          <small>
            {isPublic
              ? tri(
                  lang,
                  "Visível no seu perfil",
                  "Visible from your profile",
                  "Visible desde tu perfil",
                )
              : tri(
                  lang,
                  "Somente você pode acessar",
                  "Only you can access",
                  "Solo tú puedes acceder",
                )}
          </small>
        </span>
      </div>
      <button type="button" onClick={toggle} disabled={pending}>
        {pending && <LoaderCircle className="spin" size={14} />}
        <span>{t.change}</span>
      </button>
      {error && (
        <p>
          {tri(
            lang,
            "Não foi possível alterar.",
            "Could not update.",
            "No se pudo cambiar.",
          )}
        </p>
      )}
    </div>
  );
}

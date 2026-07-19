"use client";

import { Globe2, LoaderCircle, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LibraryPrivacyControl({
  initial,
  lang,
}: {
  initial: "PUBLIC" | "PRIVATE";
  lang: "pt-BR" | "en";
}) {
  const pt = lang === "pt-BR";
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
              ? pt
                ? "Biblioteca pública"
                : "Public library"
              : pt
                ? "Biblioteca privada"
                : "Private library"}
          </strong>
          <small>
            {isPublic
              ? pt
                ? "Visível no seu perfil"
                : "Visible from your profile"
              : pt
                ? "Somente você pode acessar"
                : "Only you can access"}
          </small>
        </span>
      </div>
      <button type="button" onClick={toggle} disabled={pending}>
        {pending && <LoaderCircle className="spin" size={14} />}
        <span>{pt ? "Alterar" : "Change"}</span>
      </button>
      {error && <p>{pt ? "Não foi possível alterar." : "Could not update."}</p>}
    </div>
  );
}

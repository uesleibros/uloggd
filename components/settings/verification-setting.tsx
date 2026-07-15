"use client";

import {
  BadgeCheck,
  Clock3,
  LoaderCircle,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "PENDING" | "REVIEWING" | "APPROVED" | "REJECTED" | "WITHDRAWN";

export function VerificationSetting({
  profileId,
  verified,
  requestStatus,
  lang,
}: {
  profileId: string;
  verified: boolean;
  requestStatus: Status | null;
  lang: "pt-BR" | "en";
}) {
  const pt = lang === "pt-BR";
  const [status, setStatus] = useState(requestStatus);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const values = new FormData(event.currentTarget);
    const statement = String(values.get("statement") ?? "").trim();
    const evidence = String(values.get("evidence") ?? "")
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 10);
    if (
      statement.length < 20 ||
      evidence.some((url) => !/^https:\/\//i.test(url))
    ) {
      setError(
        pt
          ? "Explique o pedido e use apenas links HTTPS, um por linha."
          : "Explain your request and use HTTPS links only, one per line.",
      );
      return;
    }
    setPending(true);
    setError(null);
    const { error: actionError } = await createClient()
      .from("verification_requests")
      .insert({ profile_id: profileId, statement, evidence_urls: evidence });
    if (actionError)
      setError(
        pt
          ? "Não foi possível enviar o pedido agora."
          : "Could not submit the request right now.",
      );
    else setStatus("PENDING");
    setPending(false);
  }
  if (verified)
    return (
      <section className="verification-setting verification-complete">
        <BadgeCheck size={24} fill="currentColor" />
        <div>
          <h2>{pt ? "Perfil verificado" : "Verified profile"}</h2>
          <p>
            {pt
              ? "O selo público confirma a autenticidade desta conta."
              : "The public badge confirms this account's authenticity."}
          </p>
        </div>
      </section>
    );
  if (status === "PENDING" || status === "REVIEWING")
    return (
      <section className="verification-setting verification-waiting">
        <Clock3 size={22} />
        <div>
          <h2>{pt ? "Pedido em análise" : "Request under review"}</h2>
          <p>
            {pt
              ? "A equipe está analisando as informações enviadas. Você verá o selo no perfil após a aprovação."
              : "The team is reviewing your information. The badge will appear on your profile after approval."}
          </p>
        </div>
      </section>
    );
  return (
    <form className="verification-setting verification-form" onSubmit={submit}>
      <header>
        <ShieldCheck size={22} />
        <div>
          <h2>{pt ? "Solicitar verificação" : "Request verification"}</h2>
          <p>
            {pt
              ? "Para pessoas públicas, criadores, marcas e organizações autênticas e relevantes."
              : "For authentic and notable public figures, creators, brands, and organizations."}
          </p>
        </div>
      </header>
      <label>
        {pt
          ? "Por que esta conta deve ser verificada?"
          : "Why should this account be verified?"}
        <textarea
          name="statement"
          minLength={20}
          maxLength={1000}
          required
          rows={4}
        />
      </label>
      <label>
        {pt
          ? "Links que comprovem identidade e relevância"
          : "Links supporting identity and notability"}
        <textarea
          name="evidence"
          rows={3}
          placeholder={
            pt ? "https://... (um por linha)" : "https://... (one per line)"
          }
        />
      </label>
      <small>
        {pt
          ? "O selo confirma autenticidade; não é recomendação do conteúdo publicado."
          : "The badge confirms authenticity; it is not an endorsement of published content."}
      </small>
      {error && (
        <p className="verification-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending}>
        {pending ? (
          <LoaderCircle className="spin" size={15} />
        ) : (
          <Send size={14} />
        )}
        {pt ? "Enviar para análise" : "Submit for review"}
      </button>
    </form>
  );
}

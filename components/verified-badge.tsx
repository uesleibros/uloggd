import { BadgeCheck, ShieldCheck } from "lucide-react";

export function VerifiedBadge({ lang }: { lang: "pt-BR" | "en" }) {
  const pt = lang === "pt-BR";
  return (
    <details className="verified-badge">
      <summary aria-label={pt ? "Conta verificada" : "Verified account"}>
        <BadgeCheck size={18} fill="currentColor" />
      </summary>
      <div className="verified-badge-info">
        <ShieldCheck size={17} />
        <div>
          <strong>{pt ? "Conta verificada" : "Verified account"}</strong>
          <p>
            {pt
              ? "O uloggd confirmou que esta conta representa a pessoa, marca ou organização indicada no perfil."
              : "uloggd confirmed that this account represents the person, brand, or organization shown on the profile."}
          </p>
        </div>
      </div>
    </details>
  );
}

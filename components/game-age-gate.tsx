import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, LogIn, ShieldCheck } from "lucide-react";

type Rating = {
  organization: string;
  rating: string;
  minimumAge: number | null;
  imageUrl: string | null;
};

export function GameAgeGate({
  gameName,
  rating,
  lang,
  signedIn,
}: {
  gameName: string;
  rating: Rating;
  lang: "pt-BR" | "en";
  signedIn: boolean;
}) {
  const pt = lang === "pt-BR";
  return (
    <main className="age-gate-page">
      <section className="age-gate-card" aria-labelledby="age-gate-title">
        <div className="age-gate-mark">
          {rating.imageUrl ? (
            <Image
              src={rating.imageUrl}
              alt={`${rating.organization}: ${rating.rating}`}
              width={92}
              height={92}
              priority
            />
          ) : (
            <ShieldCheck size={32} aria-hidden />
          )}
        </div>
        <span className="age-gate-eyebrow">
          <LockKeyhole size={13} aria-hidden />
          {pt ? "CONTEÚDO PROTEGIDO" : "PROTECTED CONTENT"}
        </span>
        <h1 id="age-gate-title">
          {pt
            ? "Este jogo não está disponível para sua faixa etária"
            : "This game is not available for your age group"}
        </h1>
        <p>
          {signedIn
            ? pt
              ? `${gameName} recebeu classificação ${rating.rating}. O uloggd protege páginas acima da idade registrada na sua conta.`
              : `${gameName} is rated ${rating.rating}. uloggd protects pages above the age recorded on your account.`
            : pt
              ? `${gameName} exige confirmação de idade por ter classificação ${rating.rating}. Entre para verificarmos sua faixa etária.`
              : `${gameName} requires age confirmation because it is rated ${rating.rating}. Sign in so we can check your age group.`}
        </p>
        <div className="age-gate-actions">
          {!signedIn && (
            <Link href={`/${lang}/login`}>
              <LogIn size={16} aria-hidden />
              {pt ? "Entrar para verificar" : "Sign in to verify"}
            </Link>
          )}
          <Link href={`/${lang}`}>
            <ArrowLeft size={16} aria-hidden />
            {pt ? "Voltar ao catálogo" : "Back to catalog"}
          </Link>
        </div>
        <small>
          {pt
            ? "A proteção considera a Classificação Indicativa brasileira e a idade calculada na data de acesso."
            : "Protection uses Brazil’s age rating and your age on the access date."}
        </small>
      </section>
    </main>
  );
}

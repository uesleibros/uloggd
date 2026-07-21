import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, LogIn, ShieldCheck } from "lucide-react";
import { AnonymousAgeForm } from "./anonymous-age-form";
import { tri, type UiLang } from "@/lib/ui-text";

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
  lang: UiLang;
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
          {tri(
            lang,
            "CONTEÚDO PROTEGIDO",
            "PROTECTED CONTENT",
            "CONTENIDO PROTEGIDO",
          )}
        </span>
        <h1 id="age-gate-title">
          {tri(
            lang,
            "Este jogo não está disponível para sua faixa etária",
            "This game is not available for your age group",
            "Este juego no está disponible para tu edad",
          )}
        </h1>
        <p>
          {signedIn
            ? pt
              ? `${gameName} recebeu classificação ${rating.rating}. O uloggd protege páginas acima da idade registrada na sua conta.`
              : `${gameName} is rated ${rating.rating}. uloggd protects pages above the age recorded on your account.`
            : pt
              ? `${gameName} exige confirmação de idade por ter classificação ${rating.rating}. Informe sua data abaixo ou entre na sua conta.`
              : `${gameName} requires age confirmation because it is rated ${rating.rating}. Enter your date below or sign in to your account.`}
        </p>
        {!signedIn && rating.minimumAge !== null && (
          <AnonymousAgeForm minimumAge={rating.minimumAge} lang={lang} />
        )}
        <div
          className={`age-gate-actions${signedIn ? "" : " age-gate-actions-guest"}`}
        >
          {!signedIn && (
            <Link href={`/${lang}/login`}>
              <LogIn size={16} aria-hidden />
              {tri(
                lang,
                "Entrar na sua conta",
                "Sign in to your account",
                "Inicia sesión en tu cuenta",
              )}
            </Link>
          )}
          <Link href={`/${lang}`}>
            <ArrowLeft size={16} aria-hidden />
            {tri(
              lang,
              "Voltar ao catálogo",
              "Back to catalog",
              "Volver al catálogo",
            )}
          </Link>
        </div>
        <small>
          {tri(
            lang,
            "A proteção considera a Classificação Indicativa brasileira e a idade calculada na data de acesso.",
            "Protection uses Brazil’s age rating and your age on the access date.",
            "La protección usa la clasificación por edades brasileña y tu edad en la fecha de acceso.",
          )}
        </small>
      </section>
    </main>
  );
}

import { serverApi } from "@/lib/api-server";
import type { AccountState } from "@/lib/account-types";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  Ban,
  Download,
  EyeOff,
  Gavel,
  LogOut,
  Mail,
  MessageSquareOff,
} from "lucide-react";
import { getAuthUser } from "@/lib/supabase/auth";
import { hasLocale, resolveLocale } from "../dictionaries";
import "./suspended.css";
import { tri, uiText } from "@/lib/ui-text";
import { RelativeTime } from "@/components/relative-time";
import { SuspensionCountdown } from "./countdown";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: tri(
      resolveLocale(lang),
      "Conta suspensa",
      "Account suspended",
      "Cuenta suspendida",
    ),
    robots: { index: false, follow: false },
  };
}

export default async function SuspendedPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = uiText(lang);
  const user = await getAuthUser();
  if (!user) redirect(`/${lang}/login`);

  const {
    data: { suspended, state, infractions, username },
  } = await serverApi.get<AccountState>("/account/state");
  if (!suspended || !state) redirect(`/${lang}`);

  // The handle goes in the appeal, because the first thing an appeal is asked
  // for is which account it is about, and the person writing it is looking at
  // a screen that will not let them open their own profile to check.
  const handle = username ? `@${username}` : "";

  const permanent = !state.banned_until;
  const appeal = `mailto:suporte@uloggd.com?subject=${encodeURIComponent(
    tri(
      lang,
      `Contestação de suspensão ${handle}`.trim(),
      `Suspension appeal ${handle}`.trim(),
      `Apelación de suspensión ${handle}`.trim(),
    ),
  )}&body=${encodeURIComponent(
    tri(
      lang,
      `Conta: ${handle || user.email || ""}\n\nPor que acredito que houve um engano:\n`,
      `Account: ${handle || user.email || ""}\n\nWhy I believe this is a mistake:\n`,
      `Cuenta: ${handle || user.email || ""}\n\nPor qué creo que hubo un error:\n`,
    ),
  )}`;

  const consequences = [
    {
      icon: EyeOff,
      text: tri(
        lang,
        "Seu perfil aparece como indisponível para todo mundo.",
        "Your profile shows as unavailable to everyone.",
        "Tu perfil aparece como no disponible para todos.",
      ),
    },
    {
      icon: MessageSquareOff,
      text: tri(
        lang,
        "Você não consegue publicar, avaliar, comentar nem seguir ninguém.",
        "You cannot post, rate, comment or follow anyone.",
        "No puedes publicar, valorar, comentar ni seguir a nadie.",
      ),
    },
    {
      icon: Download,
      text: tri(
        lang,
        "Nada seu foi apagado: sua biblioteca, listas e avaliações continuam guardadas.",
        "Nothing of yours was deleted: your library, lists and reviews are all still there.",
        "No se ha borrado nada tuyo: tu biblioteca, listas y reseñas siguen guardadas.",
      ),
    },
  ];

  return (
    <main className="suspension-screen">
      <div className="suspension-card">
        <header className="suspension-head">
          <span className="suspension-mark" aria-hidden>
            <Ban size={24} />
          </span>
          <div>
            <small>
              {tri(
                lang,
                "Decisão da moderação",
                "Moderation decision",
                "Decisión de moderación",
              )}
            </small>
            <h1>
              {permanent
                ? tri(
                    lang,
                    "Sua conta foi suspensa permanentemente",
                    "Your account has been permanently suspended",
                    "Tu cuenta ha sido suspendida permanentemente",
                  )
                : tri(
                    lang,
                    "Sua conta está suspensa temporariamente",
                    "Your account is temporarily suspended",
                    "Tu cuenta está suspendida temporalmente",
                  )}
            </h1>
          </div>
        </header>

        {/* The one thing somebody opens this screen to find out. */}
        {state.banned_until ? (
          <SuspensionCountdown
            from={state.banned_at}
            until={state.banned_until}
            lang={lang}
          />
        ) : (
          <div className="suspension-countdown" data-permanent>
            <small>
              {tri(lang, "Liberação", "Reinstatement", "Reincorporación")}
            </small>
            <strong>
              {tri(
                lang,
                "Sem previsão de retorno",
                "No scheduled return",
                "Sin fecha de regreso",
              )}
            </strong>
          </div>
        )}

        {state.reason && (
          <blockquote className="suspension-reason">
            <strong>
              {tri(
                lang,
                "Motivo informado",
                "Stated reason",
                "Motivo indicado",
              )}
            </strong>
            {state.reason}
          </blockquote>
        )}

        <dl className="suspension-facts">
          <div>
            <dt>{tri(lang, "Suspensa em", "Suspended on", "Suspendida el")}</dt>
            <dd>
              <RelativeTime value={state.banned_at} lang={lang} />
            </dd>
          </div>
          <div>
            <dt>
              {tri(lang, "Registros na ficha", "On your record", "En tu ficha")}
            </dt>
            <dd>
              {infractions === 1
                ? tri(lang, "1 registro", "1 entry", "1 registro")
                : tri(
                    lang,
                    `${infractions} registros`,
                    `${infractions} entries`,
                    `${infractions} registros`,
                  )}
            </dd>
          </div>
        </dl>

        <ul className="suspension-effects">
          {consequences.map(({ icon: Icon, text }) => (
            <li key={text}>
              <Icon size={15} aria-hidden />
              {text}
            </li>
          ))}
        </ul>

        <section className="suspension-appeal">
          <h2>
            <Gavel size={15} aria-hidden />
            {tri(
              lang,
              "Acha que houve um engano?",
              "Think this is a mistake?",
              "¿Crees que hubo un error?",
            )}
          </h2>
          <p>
            {tri(
              lang,
              "Escreva para a equipe com o seu @ e o que aconteceu. Toda contestação é lida por uma pessoa, e a decisão pode ser revertida.",
              "Write to the team with your handle and what happened. Every appeal is read by a person, and a decision can be reversed.",
              "Escribe al equipo con tu @ y lo que pasó. Cada apelación la lee una persona, y la decisión puede revertirse.",
            )}
          </p>
        </section>

        <div className="suspension-actions">
          <a href={appeal}>
            <Mail size={15} />
            {tri(
              lang,
              "Contestar decisão",
              "Appeal this decision",
              "Apelar la decisión",
            )}
          </a>
          <Link href={`/${lang}/legal/terms`} prefetch={false}>
            {tri(lang, "Regras da comunidade", "Community rules", "Reglas")}
          </Link>
          <Link href={`/${lang}/auth/signout`} prefetch={false}>
            <LogOut size={15} />
            {t.signOut}
          </Link>
        </div>
      </div>
    </main>
  );
}

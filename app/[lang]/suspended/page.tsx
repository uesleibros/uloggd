import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Ban, LogOut, Mail } from "lucide-react";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../dictionaries";
import "./suspended.css";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: lang === "pt-BR" ? "Conta suspensa" : "Account suspended",
    robots: { index: false, follow: false },
  };
}

export default async function SuspendedPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const pt = lang === "pt-BR";
  const user = await getAuthUser();
  if (!user) redirect(`/${lang}/login`);

  const supabase = await getSupabase();
  // Whether the suspension is still running is decided by the database, so
  // there is one clock and no time arithmetic during render.
  const [{ data: active }, { data: state }] = await Promise.all([
    supabase.rpc("profile_suspension", { target: user.id }),
    supabase
      .from("profile_moderation_state")
      .select("banned_at,banned_until,reason")
      .eq("profile_id", user.id)
      .maybeSingle(),
  ]);
  // The proxy already redirects an unsuspended account away; this only
  // covers a suspension that lapsed between the two checks.
  if (!active?.length || !state) redirect(`/${lang}`);

  const permanent = !state.banned_until;
  const formatter = new Intl.DateTimeFormat(lang, {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <main className="suspension-screen">
      <div className="suspension-card">
        <span className="suspension-mark" aria-hidden>
          <Ban size={26} />
        </span>
        <small>{pt ? "CONTA SUSPENSA" : "ACCOUNT SUSPENDED"}</small>
        <h1>
          {permanent
            ? pt
              ? "Sua conta foi suspensa permanentemente"
              : "Your account has been permanently suspended"
            : pt
              ? "Sua conta está suspensa temporariamente"
              : "Your account is temporarily suspended"}
        </h1>
        <p>
          {pt
            ? "Enquanto a suspensão estiver ativa você não consegue navegar, publicar, avaliar ou interagir no uloggd, e seu perfil aparece como indisponível para outras pessoas."
            : "While the suspension is active you cannot browse, post, rate or interact on uloggd, and your profile shows as unavailable to everyone else."}
        </p>

        <dl className="suspension-facts">
          <div>
            <dt>{pt ? "Suspensa em" : "Suspended on"}</dt>
            <dd>{formatter.format(new Date(state.banned_at))}</dd>
          </div>
          <div>
            <dt>{pt ? "Liberação" : "Reinstatement"}</dt>
            <dd>
              {permanent
                ? pt
                  ? "Sem previsão"
                  : "No scheduled date"
                : formatter.format(new Date(state.banned_until!))}
            </dd>
          </div>
        </dl>

        {state.reason && (
          <blockquote className="suspension-reason">
            <strong>{pt ? "Motivo informado" : "Stated reason"}</strong>
            {state.reason}
          </blockquote>
        )}

        <p className="suspension-appeal">
          {pt
            ? "Se você acredita que houve um engano, responda a este e-mail com o seu @ para que a decisão seja revisada."
            : "If you believe this is a mistake, reply to this address with your handle so the decision can be reviewed."}
        </p>

        <div className="suspension-actions">
          <a href="mailto:suporte@uloggd.com">
            <Mail size={15} />
            {pt ? "Contestar decisão" : "Appeal this decision"}
          </a>
          <Link href={`/${lang}/auth/signout`} prefetch={false}>
            <LogOut size={15} />
            {pt ? "Sair da conta" : "Sign out"}
          </Link>
        </div>
      </div>
    </main>
  );
}

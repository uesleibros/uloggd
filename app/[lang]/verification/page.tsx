import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import { VerifiedMark } from "@/components/verified-badge";
import { localeAlternates } from "@/lib/seo";
import { tri } from "@/lib/ui-text";
import { hasLocale } from "../dictionaries";

type Props = PageProps<"/[lang]/verification">;

const VERIFICATION_FORM = "https://forms.gle/xATkgcuaDvw2dCz3A";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const title = tri(
    lang,
    "Sobre o selo de verificado",
    "About the verification badge",
    "Sobre la insignia de verificación",
  );
  const description = tri(
    lang,
    "Entenda o que o selo de verificado do uloggd confirma, como funciona a análise e como solicitar a verificação de uma conta.",
    "Learn what the uloggd verification badge confirms, how review works, and how to request account verification.",
    "Entiende qué confirma la insignia de uloggd, cómo funciona la revisión y cómo solicitar la verificación de una cuenta.",
  );
  return {
    title,
    description,
    alternates: localeAlternates(lang, "/verification"),
    openGraph: {
      title: `${title} · uloggd`,
      description,
      type: "website",
      siteName: "uloggd",
    },
    twitter: { card: "summary", title: `${title} · uloggd`, description },
  };
}

export default async function VerificationPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const principles = [
    {
      title: tri(
        lang,
        "Identidade autêntica",
        "Authentic identity",
        "Identidad auténtica",
      ),
      body: tri(
        lang,
        "O selo indica que a moderação confirmou que a conta representa a pessoa, marca, projeto ou organização apresentada no perfil.",
        "The badge indicates that moderation confirmed the account represents the person, brand, project, or organization shown on the profile.",
        "La insignia indica que moderación confirmó que la cuenta representa a la persona, marca, proyecto u organización mostrada en el perfil.",
      ),
    },
    {
      title: tri(
        lang,
        "Um sinal, não um endosso",
        "A signal, not an endorsement",
        "Una señal, no un respaldo",
      ),
      body: tri(
        lang,
        "A verificação ajuda a reconhecer quem está falando. Ela não significa que o uloggd concorda com opiniões, avaliações ou outros conteúdos da conta.",
        "Verification helps people recognize who is speaking. It does not mean uloggd agrees with the account's opinions, reviews, or other content.",
        "La verificación ayuda a reconocer quién habla. No significa que uloggd esté de acuerdo con las opiniones, reseñas u otros contenidos de la cuenta.",
      ),
    },
    {
      title: tri(lang, "Análise humana", "Human review", "Revisión humana"),
      body: tri(
        lang,
        "Cada solicitação é avaliada pela moderação. Enviar o formulário não garante o selo, e podemos pedir informações adicionais para confirmar a identidade.",
        "Every request is reviewed by moderation. Submitting the form does not guarantee a badge, and we may request more information to confirm identity.",
        "Cada solicitud es evaluada por moderación. Enviar el formulario no garantiza la insignia y podemos pedir más información para confirmar la identidad.",
      ),
    },
  ];

  const steps = [
    tri(
      lang,
      "Preencha a solicitação com seu perfil do uloggd e referências públicas que ajudem a confirmar a identidade.",
      "Submit your uloggd profile and public references that help confirm the identity.",
      "Envía tu perfil de uloggd y referencias públicas que ayuden a confirmar la identidad.",
    ),
    tri(
      lang,
      "A moderação confere autenticidade, contexto público e consistência entre as informações apresentadas.",
      "Moderation checks authenticity, public context, and consistency across the information provided.",
      "Moderación comprueba la autenticidad, el contexto público y la coherencia de la información presentada.",
    ),
    tri(
      lang,
      "Se a verificação for aprovada, o selo passa a acompanhar a identidade da conta nas áreas públicas do uloggd.",
      "If approved, the badge follows the account identity across public areas of uloggd.",
      "Si se aprueba, la insignia acompaña la identidad de la cuenta en las áreas públicas de uloggd.",
    ),
  ];

  return (
    <main className="social-page verification-page">
      <Link className="page-back-link" href={`/${lang}`}>
        <ArrowLeft size={14} />
        {tri(lang, "Voltar ao início", "Back home", "Volver al inicio")}
      </Link>

      <article className="verification-document">
        <header className="verification-hero">
          <div className="verification-mark" aria-hidden="true">
            <VerifiedMark size={54} />
          </div>
          <div>
            <span>
              {tri(
                lang,
                "IDENTIDADE NO ULOGGD",
                "IDENTITY ON ULOGGD",
                "IDENTIDAD EN ULOGGD",
              )}
            </span>
            <h1>
              {tri(
                lang,
                "Saiba quem está por trás de uma conta.",
                "Know who is behind an account.",
                "Conoce quién está detrás de una cuenta.",
              )}
            </h1>
            <p>
              {tri(
                lang,
                "O selo de verificado é uma indicação visual de autenticidade. Ele existe para reduzir dúvidas sobre identidade e tornar as conversas da comunidade mais claras.",
                "The verification badge is a visual signal of authenticity. It exists to reduce uncertainty about identity and make community conversations clearer.",
                "La insignia de verificación es una señal visual de autenticidad. Existe para reducir dudas sobre la identidad y hacer más claras las conversaciones de la comunidad.",
              )}
            </p>
            <a
              className="verification-apply"
              href={VERIFICATION_FORM}
              target="_blank"
              rel="noreferrer"
            >
              {tri(
                lang,
                "Solicitar verificação",
                "Request verification",
                "Solicitar verificación",
              )}
              <ArrowUpRight size={16} />
            </a>
          </div>
        </header>

        <div className="verification-layout">
          <div className="verification-copy">
            <section>
              <span>
                {tri(
                  lang,
                  "O QUE O SELO SIGNIFICA",
                  "WHAT THE BADGE MEANS",
                  "QUÉ SIGNIFICA LA INSIGNIA",
                )}
              </span>
              <h2>
                {tri(
                  lang,
                  "Confiança começa com contexto.",
                  "Trust starts with context.",
                  "La confianza empieza con contexto.",
                )}
              </h2>
              <p>
                {tri(
                  lang,
                  "Em uma comunidade feita de opiniões pessoais, reconhecer a origem de uma voz importa. A verificação confirma identidade; o conteúdo continua sendo responsabilidade de quem o publica.",
                  "In a community built around personal opinions, knowing where a voice comes from matters. Verification confirms identity; content remains the publisher's responsibility.",
                  "En una comunidad basada en opiniones personales, importa reconocer el origen de una voz. La verificación confirma la identidad; el contenido sigue siendo responsabilidad de quien lo publica.",
                )}
              </p>
            </section>

            <div className="verification-principles">
              {principles.map((principle, index) => (
                <section key={principle.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{principle.title}</h3>
                    <p>{principle.body}</p>
                  </div>
                </section>
              ))}
            </div>

            <section className="verification-note">
              <span>
                {tri(
                  lang,
                  "DEPOIS DA APROVAÇÃO",
                  "AFTER APPROVAL",
                  "DESPUÉS DE LA APROBACIÓN",
                )}
              </span>
              <h2>
                {tri(
                  lang,
                  "O selo acompanha a identidade, não o conteúdo.",
                  "The badge follows identity, not content.",
                  "La insignia acompaña la identidad, no el contenido.",
                )}
              </h2>
              <p>
                {tri(
                  lang,
                  "Mudanças que tornem a conta enganosa, transferência de controle ou perda dos sinais usados na análise podem levar a uma nova revisão ou à remoção do selo.",
                  "Changes that make an account misleading, a transfer of control, or loss of the signals used during review may lead to another review or removal of the badge.",
                  "Los cambios que hagan engañosa una cuenta, la transferencia de control o la pérdida de las señales usadas en la revisión pueden llevar a una nueva revisión o a retirar la insignia.",
                )}
              </p>
            </section>
          </div>

          <aside className="verification-process">
            <span>
              {tri(lang, "COMO FUNCIONA", "HOW IT WORKS", "CÓMO FUNCIONA")}
            </span>
            <h2>
              {tri(
                lang,
                "Da solicitação ao selo",
                "From request to badge",
                "De la solicitud a la insignia",
              )}
            </h2>
            <ol>
              {steps.map((step, index) => (
                <li key={step}>
                  <span>{index + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
            <a href={VERIFICATION_FORM} target="_blank" rel="noreferrer">
              {tri(
                lang,
                "Abrir formulário",
                "Open application form",
                "Abrir formulario",
              )}
              <ArrowUpRight size={15} />
            </a>
            <small>
              {tri(
                lang,
                "O formulário abre no Google Forms. Nunca envie sua senha, código de acesso ou chave de segurança.",
                "The application opens in Google Forms. Never submit your password, sign-in code, or security key.",
                "El formulario se abre en Google Forms. Nunca envíes tu contraseña, código de acceso o llave de seguridad.",
              )}
            </small>
          </aside>
        </div>
      </article>
    </main>
  );
}

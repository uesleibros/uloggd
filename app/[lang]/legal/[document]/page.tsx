import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { Brand } from "@/components/brand";
import { getLegalContent, isLegalDocument } from "@/lib/legal-content";
import { hasLocale } from "../../dictionaries";

type Props = PageProps<"/[lang]/legal/[document]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, document } = await params;
  if (!hasLocale(lang) || !isLegalDocument(document)) return {};
  return { title: getLegalContent(lang, document).title };
}

export default async function LegalPage({ params }: Props) {
  const { lang, document } = await params;
  if (!hasLocale(lang) || !isLegalDocument(document)) notFound();
  const content = getLegalContent(lang, document);

  return (
    <div className="legal-shell">
      <header className="legal-header">
        <Brand lang={lang} />
        <Link href={`/${lang}`}>
          <ArrowLeft size={18} />
          Voltar ao início
        </Link>
      </header>
      <main className="legal-page">
        <div className="legal-title">
          <span>
            <ShieldCheck size={18} /> Legal e segurança
          </span>
          <h1>{content.title}</h1>
          <p>{content.intro}</p>
          <small>{content.updated}</small>
        </div>
        <div className="legal-content">
          {content.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets && (
                <ul>
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        <aside className="legal-contact">
          <Mail size={20} />
          <div>
            <strong>Precisa falar com a gente?</strong>
            <a href="mailto:uloggd.gg@gmail.com">uloggd.gg@gmail.com</a>
          </div>
        </aside>
      </main>
    </div>
  );
}

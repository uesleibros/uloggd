import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Cookie,
} from "lucide-react";
import { notFound } from "next/navigation";
import { getLegalContent, isLegalDocument } from "@/lib/legal-content";
import { getDictionary, hasLocale } from "../../dictionaries";
import "../legal.css";

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
  const d = await getDictionary(lang);
  const documents = [
    { slug: "terms", label: d.legal.terms, icon: FileText },
    { slug: "privacy", label: d.legal.privacy, icon: LockKeyhole },
    {
      slug: "cookies",
      label: lang === "pt-BR" ? "Política de Cookies" : "Cookie Policy",
      icon: Cookie,
    },
    { slug: "child-safety", label: d.legal.safety, icon: ShieldCheck },
  ] as const;

  return (
    <div className="legal-shell">
      <header className="legal-header">
        <Link href={`/${lang}`}>
          <ArrowLeft size={18} />
          {d.legalUi.back}
        </Link>
      </header>
      <main className="legal-page">
        <nav className="legal-document-nav" aria-label={d.legalUi.documents}>
          {documents.map(({ slug, label, icon: Icon }) => (
            <Link
              key={slug}
              href={`/${lang}/legal/${slug}`}
              aria-current={document === slug ? "page" : undefined}
            >
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="legal-title">
          <span>
            <ShieldCheck size={18} /> {d.legalUi.section}
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
            <strong>{d.legalUi.help}</strong>
            <a href="mailto:contact@uloggd.com">contact@uloggd.com</a>
          </div>
        </aside>
      </main>
    </div>
  );
}

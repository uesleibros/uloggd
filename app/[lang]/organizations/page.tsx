import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Building2, Globe, Search, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { PageLinks } from "@/components/page-links";
import { SearchSubmit } from "@/components/search-submit";
import { VerifiedNameMark } from "@/components/verified-badge";
import {
  categoryLabel,
  displayUrl,
  ORGANIZATION_CATEGORIES,
  type OrganizationCategory,
} from "@/lib/organization";
import { localeAlternates } from "@/lib/seo";
import { getSupabase } from "@/lib/supabase/auth";
import { tri } from "@/lib/ui-text";
import { hasLocale, resolveLocale } from "../dictionaries";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
};

const PAGE_SIZE = 24;

type Row = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  organization_tagline: string | null;
  organization_category: OrganizationCategory | null;
  organization_url: string | null;
  organization_company_slug: string | null;
  verified: boolean;
  follower_count: number;
  total_count: number;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const title = tri(lang, "Organizações", "Organizations", "Organizaciones");
  const description = tri(
    lang,
    "Lojas, estúdios, publicadoras, veículos e comunidades com conta no uloggd.",
    "Stores, studios, publishers, outlets and communities with an account on uloggd.",
    "Tiendas, estudios, editoras, medios y comunidades con cuenta en uloggd.",
  );
  return {
    title,
    description,
    alternates: localeAlternates(lang, "/organizations"),
    openGraph: { title: `${title} · uloggd`, description, siteName: "uloggd" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function OrganizationsPage({
  params,
  searchParams,
}: Props) {
  const [{ lang: rawLang }, requested] = await Promise.all([
    params,
    searchParams,
  ]);
  if (!hasLocale(rawLang)) notFound();
  const lang = resolveLocale(rawLang);

  const query = (requested.q ?? "").trim().slice(0, 60);
  const category = ORGANIZATION_CATEGORIES.includes(
    requested.category as OrganizationCategory,
  )
    ? (requested.category as OrganizationCategory)
    : null;
  const page = Math.max(1, Number(requested.page) || 1);

  const supabase = await getSupabase();
  const { data } = await supabase.rpc("organization_directory", {
    search: query || null,
    category_filter: category,
    page_limit: PAGE_SIZE,
    page_offset: (page - 1) * PAGE_SIZE,
  });
  const rows = (data as Row[] | null) ?? [];
  const total = rows[0]?.total_count ?? 0;

  const href = (next: Record<string, string | undefined>) => {
    const merged: Record<string, string | undefined> = {
      q: query || undefined,
      category: category ?? undefined,
      ...next,
    };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(merged))
      if (value) params.set(key, value);
    const search = params.toString();
    return search
      ? `/${lang}/organizations?${search}`
      : `/${lang}/organizations`;
  };

  return (
    <main className="social-page organizations-page">
      <header className="organizations-header">
        <span>
          <Building2 size={22} />
        </span>
        <div>
          <h1>
            {tri(lang, "Organizações", "Organizations", "Organizaciones")}
          </h1>
          <p>
            {tri(
              lang,
              "Lojas, estúdios, publicadoras, veículos e comunidades. O selo azul é confirmado pela moderação; o resto é declarado pela própria conta.",
              "Stores, studios, publishers, outlets and communities. The blue mark is confirmed by moderation; everything else is what the account says about itself.",
              "Tiendas, estudios, editoras, medios y comunidades. La marca azul la confirma la moderación; el resto lo declara la propia cuenta.",
            )}
          </p>
        </div>
      </header>

      <nav
        className="game-page-nav organizations-categories"
        aria-label={tri(
          lang,
          "Filtrar por tipo",
          "Filter by type",
          "Filtrar por tipo",
        )}
      >
        <Link
          href={href({ category: undefined, page: undefined })}
          aria-current={!category ? "page" : undefined}
        >
          {tri(lang, "Todas", "All", "Todas")}
        </Link>
        {ORGANIZATION_CATEGORIES.map((value) => (
          <Link
            key={value}
            href={href({ category: value, page: undefined })}
            aria-current={category === value ? "page" : undefined}
          >
            {categoryLabel(value, lang)}
          </Link>
        ))}
      </nav>

      <form className="profile-connections-search">
        {category && <input type="hidden" name="category" value={category} />}
        <label className="search-field-hit">
          <Search size={16} />
          <input
            type="search"
            name="q"
            defaultValue={query}
            maxLength={60}
            placeholder={tri(
              lang,
              "Buscar organização",
              "Search organizations",
              "Buscar organización",
            )}
            aria-label={tri(
              lang,
              "Buscar organização",
              "Search organizations",
              "Buscar organización",
            )}
          />
        </label>
        <SearchSubmit lang={lang} />
      </form>

      {rows.length === 0 ? (
        <div className="social-empty">
          <span>
            <Building2 size={22} />
          </span>
          <p>
            {query || category
              ? tri(
                  lang,
                  "Nenhuma organização com esse filtro.",
                  "No organization matches this filter.",
                  "Ninguna organización con ese filtro.",
                )
              : tri(
                  lang,
                  "Ainda não há organizações por aqui. Qualquer conta pode se declarar uma em Configurações.",
                  "There are no organizations here yet. Any account can declare itself one in Settings.",
                  "Todavía no hay organizaciones aquí. Cualquier cuenta puede declararse una en Ajustes.",
                )}
          </p>
        </div>
      ) : (
        <ul className="organizations-grid">
          {rows.map((row) => (
            <li key={row.username}>
              <Link href={`/${lang}/u/${row.username}`}>
                <span
                  className="organizations-avatar"
                  data-account-type="ORGANIZATION"
                >
                  {row.avatar_url ? (
                    <Image
                      src={row.avatar_url}
                      alt=""
                      fill
                      sizes="52px"
                      unoptimized
                    />
                  ) : (
                    (row.display_name || row.username).slice(0, 1).toUpperCase()
                  )}
                </span>
                <span className="organizations-copy">
                  <strong>
                    {row.display_name || `@${row.username}`}
                    {row.verified && <VerifiedNameMark />}
                  </strong>
                  <small>
                    @{row.username}
                    {row.organization_category && (
                      <b>{categoryLabel(row.organization_category, lang)}</b>
                    )}
                  </small>
                  {row.organization_tagline && (
                    <p>{row.organization_tagline}</p>
                  )}
                  <span className="organizations-meta">
                    <span>
                      <Users size={12} aria-hidden /> {row.follower_count}
                    </span>
                    {row.organization_url && (
                      <span>
                        <Globe size={12} aria-hidden />{" "}
                        {displayUrl(row.organization_url)}
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <PageLinks
        page={page}
        pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        hrefFor={(next) => href({ page: next > 1 ? String(next) : undefined })}
        lang={lang}
        label={tri(
          lang,
          "Páginas de organizações",
          "Organization pages",
          "Páginas de organizaciones",
        )}
      />
    </main>
  );
}

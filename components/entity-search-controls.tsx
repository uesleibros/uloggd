"use client";

import * as Dialog from "@/components/ui/dialog";
import * as Select from "@/components/ui/select";
import { Check, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import type { SearchScope } from "./search-scope-tabs";

type Option = { value: string; label: string };

export function EntitySearchControls({
  lang,
  scope,
  sort,
  sortOptions,
  role = "any",
  status = "any",
  verified = false,
}: {
  lang: UiLang;
  scope: Exclude<SearchScope, "games">;
  sort: string;
  sortOptions: Option[];
  role?: string;
  status?: string;
  verified?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const current = useSearchParams();
  const [draftRole, setDraftRole] = useState(role);
  const [draftStatus, setDraftStatus] = useState(status);
  const [draftVerified, setDraftVerified] = useState(verified);
  const hasFilters = scope === "people" || scope === "companies";
  const appliedCount =
    (verified ? 1 : 0) + (role !== "any" ? 1 : 0) + (status !== "any" ? 1 : 0);
  const t = uiText(lang);

  function navigate(changes: Record<string, string | null>) {
    const params = new URLSearchParams(current.toString());
    Object.entries(changes).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    params.delete("page");
    router.push(`${pathname}?${params}`);
  }

  function applyFilters() {
    navigate({
      verified: draftVerified ? "1" : null,
      role: draftRole === "any" ? null : draftRole,
      status: draftStatus === "any" ? null : draftStatus,
    });
  }

  const controls = (
    <div className="catalog-results-tools">
      {hasFilters && (
        <Dialog.Trigger asChild>
          <button type="button" className="catalog-filter-trigger">
            <SlidersHorizontal size={15} />
            <span>{t.advancedFilters}</span>
            {appliedCount > 0 && <b>{appliedCount}</b>}
          </button>
        </Dialog.Trigger>
      )}
      <Select.Root
        value={sort}
        onValueChange={(value) =>
          navigate({ sort: value === sortOptions[0]?.value ? null : value })
        }
      >
        <Select.Trigger
          className="catalog-sort-trigger"
          aria-label={tri(
            lang,
            "Ordenar resultados",
            "Sort results",
            "Ordenar resultados",
          )}
        >
          <Select.Value />
          <Select.Icon>
            <ChevronDown size={13} />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            className="catalog-sort-menu"
            position="popper"
            sideOffset={6}
          >
            <Select.Viewport>
              {sortOptions.map((option) => (
                <Select.Item
                  className="catalog-sort-option"
                  key={option.value}
                  value={option.value}
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check size={13} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );

  if (!hasFilters) return controls;
  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (open) {
          setDraftRole(role);
          setDraftStatus(status);
          setDraftVerified(verified);
        }
      }}
    >
      {controls}
      <Dialog.Portal>
        <Dialog.Overlay className="catalog-filter-overlay" />
        <Dialog.Content className="catalog-filter-dialog entity-filter-dialog">
          <header className="catalog-filter-dialog-head">
            <div>
              <span>{tri(lang, "REFINAR", "REFINE", "REFINAR")}</span>
              <Dialog.Title>{t.advancedFilters}</Dialog.Title>
            </div>
            <div>
              {appliedCount > 0 && (
                <button
                  type="button"
                  className="catalog-filter-clear"
                  onClick={() => {
                    setDraftRole("any");
                    setDraftStatus("any");
                    setDraftVerified(false);
                  }}
                >
                  {t.clear}
                </button>
              )}
              <Dialog.Close
                className="catalog-filter-dialog-close"
                aria-label={t.close}
              >
                <X size={17} />
              </Dialog.Close>
            </div>
          </header>
          <div className="catalog-filter-dialog-body">
            {scope === "people" && (
              <FilterGroup
                title={tri(
                  lang,
                  "Tipo de conta",
                  "Account type",
                  "Tipo de cuenta",
                )}
                value={draftVerified ? "verified" : "any"}
                onChange={(value) => setDraftVerified(value === "verified")}
                options={[
                  { value: "any", label: tri(lang, "Todas", "All", "Todas") },
                  {
                    value: "verified",
                    label: tri(lang, "Verificadas", "Verified", "Verificadas"),
                  },
                ]}
              />
            )}
            {scope === "companies" && (
              <>
                <FilterGroup
                  title={tri(
                    lang,
                    "Papel da empresa",
                    "Company role",
                    "Función de la empresa",
                  )}
                  value={draftRole}
                  onChange={setDraftRole}
                  options={[
                    { value: "any", label: t.all },
                    {
                      value: "publisher",
                      label: tri(
                        lang,
                        "Publicadoras",
                        "Publishers",
                        "Editoras",
                      ),
                    },
                    {
                      value: "developer",
                      label: tri(
                        lang,
                        "Desenvolvedoras",
                        "Developers",
                        "Desarrolladoras",
                      ),
                    },
                  ]}
                />
                <FilterGroup
                  title={tri(lang, "Situação", "Status", "Estado")}
                  value={draftStatus}
                  onChange={setDraftStatus}
                  options={[
                    { value: "any", label: t.all },
                    {
                      value: "active",
                      label: tri(lang, "Ativas", "Active", "Activas"),
                    },
                  ]}
                />
              </>
            )}
          </div>
          <footer className="catalog-filter-dialog-actions">
            <span>
              {tri(
                lang,
                "A URL será atualizada",
                "The URL will be updated",
                "La URL se actualizará",
              )}
            </span>
            <Dialog.Close asChild>
              <button type="button" onClick={applyFilters}>
                {tri(
                  lang,
                  "Aplicar filtros",
                  "Apply filters",
                  "Aplicar filtros",
                )}
              </button>
            </Dialog.Close>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function FilterGroup({
  title,
  value,
  onChange,
  options,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}) {
  return (
    <section className="catalog-choice-filter">
      <header>{title}</header>
      <div
        className="catalog-segmented-filter"
        style={{
          gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
        }}
      >
        {options.map((option) => (
          <label
            key={option.value}
            data-selected={value === option.value || undefined}
          >
            <input
              type="radio"
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </section>
  );
}

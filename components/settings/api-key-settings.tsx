"use client";

import { api, settle } from "@/lib/api-client";

import {
  Check,
  ChevronDown,
  Copy,
  KeyRound,
  LoaderCircle,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { RelativeTime } from "@/components/relative-time";
import { Checkbox } from "@/components/ui/checkbox";
import * as Select from "@/components/ui/select";
import { tri, type UiLang } from "@/lib/ui-text";


type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

type Resource = {
  id: string;
  pt: string;
  en: string;
  es: string;
  readOnly?: boolean;
  /** Liking has nothing to read that a key does not already get elsewhere. */
  writeOnly?: boolean;
};

const RESOURCES: Resource[] = [
  {
    id: "catalog",
    pt: "Catálogo",
    en: "Catalog",
    es: "Catálogo",
    readOnly: true,
  },
  { id: "profile", pt: "Perfil", en: "Profile", es: "Perfil" },
  { id: "library", pt: "Biblioteca", en: "Library", es: "Biblioteca" },
  { id: "reviews", pt: "Avaliações", en: "Reviews", es: "Reseñas" },
  { id: "journal", pt: "Diário", en: "Journal", es: "Diario" },
  { id: "lists", pt: "Listas", en: "Lists", es: "Listas" },
  { id: "screenshots", pt: "Capturas", en: "Screenshots", es: "Capturas" },
  { id: "social", pt: "Social", en: "Social", es: "Social" },
  {
    id: "comments",
    pt: "Comentários",
    en: "Comments",
    es: "Comentarios",
  },
  {
    id: "likes",
    pt: "Curtidas",
    en: "Likes",
    es: "Me gusta",
    writeOnly: true,
  },
];

const LIFETIMES = [30, 90, 365, 0];

export function ApiKeySettings({ lang }: { lang: UiLang }) {
  const [items, setItems] = useState<ApiKey[]>([]);
  const [pending, setPending] = useState<string | null>("load");
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["catalog.read"]);
  const [days, setDays] = useState(90);
  const [issued, setIssued] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // One phrasing for the closed trigger and for the open list, so the two can
  // never drift apart the way a duplicated label eventually does.
  const lifetime = (value: number) =>
    value === 0
      ? tri(lang, "Nunca", "Never", "Nunca")
      : tri(lang, `${value} dias`, `${value} days`, `${value} días`);

  const loadFailed = tri(
    lang,
    "Não foi possível carregar suas chaves.",
    "Could not load your keys.",
    "No se pudieron cargar tus llaves.",
  );

  async function load() {
    const { data, error: loadError } = await settle(
      api.get<{ data: ApiKey[] }>("/account/keys"),
    );
    if (loadError) setError(loadFailed);
    else setItems(data ?? []);
    setPending(null);
  }

  useEffect(() => {
    let alive = true;
    void settle(api.get<{ data: ApiKey[] }>("/account/keys")).then(
      ({ data, error: loadError }) => {
        if (!alive) return;
        if (loadError) setError(loadFailed);
        else setItems(data ?? []);
        setPending(null);
      },
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  function toggle(scope: string) {
    setScopes((current) =>
      current.includes(scope)
        ? current.filter((one) => one !== scope)
        : [...current, scope],
    );
  }

  async function create() {
    if (!name.trim() || pending) return;
    setPending("create");
    setError(null);
    setIssued(null);
    const { data: row, error: createError } = await settle(
      api.post<{ data: { token: string } }>("/account/keys", {
        name: name.trim(),
        scopes,
        expires_in_days: days > 0 ? days : null,
      }),
    );
    if (createError || !row) {
      setError(
        tri(
          lang,
          "Não foi possível criar a chave.",
          "Could not create the key.",
          "No se pudo crear la llave.",
        ),
      );
      setPending(null);
      return;
    }
    setIssued(row.token);
    setName("");
    setCopied(false);
    await load();
  }

  async function revoke(id: string) {
    if (pending) return;
    setPending(id);
    setError(null);
    const { error: revokeError } = await settle(
      api.delete<{ data: unknown }>(`/account/keys/${id}`),
    );
    if (revokeError)
      setError(
        tri(
          lang,
          "Não foi possível revogar a chave.",
          "Could not revoke the key.",
          "No se pudo revocar la llave.",
        ),
      );
    await load();
  }

  const active = items.filter((item) => !item.revoked_at);

  return (
    <section className="settings-api-keys">
      <header>
        <div>
          <h2>{tri(lang, "Chaves de API", "API keys", "Llaves de API")}</h2>
          <p>
            {tri(
              lang,
              "Uma chave age como você, nunca além. O que a sua conta não pode fazer, ela também não pode.",
              "A key acts as you, never beyond. What your account cannot do, it cannot do either.",
              "Una llave actúa como tú, nunca más allá. Lo que tu cuenta no puede hacer, ella tampoco.",
            )}{" "}
            <Link href={`/${lang}/developers`}>
              {tri(
                lang,
                "Ler a documentação",
                "Read the documentation",
                "Leer la documentación",
              )}
            </Link>
          </p>
        </div>
      </header>

      {issued && (
        <div className="settings-api-issued" role="status">
          <strong>
            <TriangleAlert size={15} />
            {tri(
              lang,
              "Copie agora. Esta chave não será mostrada de novo.",
              "Copy it now. This key will not be shown again.",
              "Cópiala ahora. Esta llave no se mostrará otra vez.",
            )}
          </strong>
          <div>
            <code>{issued}</code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(issued);
                setCopied(true);
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied
                ? tri(lang, "Copiada", "Copied", "Copiada")
                : tri(lang, "Copiar", "Copy", "Copiar")}
            </button>
          </div>
        </div>
      )}

      <div className="settings-api-create">
        <label>
          <span>{tri(lang, "Nome", "Name", "Nombre")}</span>
          <input
            type="text"
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            placeholder={tri(
              lang,
              "Ex: meu bot do Discord",
              "e.g. my Discord bot",
              "Ej: mi bot de Discord",
            )}
          />
        </label>
        <div className="settings-api-field">
          <span id="settings-api-lifetime">
            {tri(lang, "Expira em", "Expires in", "Expira en")}
          </span>
          <Select.Root
            value={String(days)}
            onValueChange={(next) => setDays(Number(next))}
          >
            <Select.Trigger
              className="settings-api-select"
              aria-labelledby="settings-api-lifetime"
            >
              <Select.Value />
              <Select.Icon>
                <ChevronDown size={13} />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                className="settings-api-select-menu"
                position="popper"
                sideOffset={6}
              >
                <Select.Viewport>
                  {LIFETIMES.map((option) => (
                    <Select.Item
                      className="settings-api-select-option"
                      key={option}
                      value={String(option)}
                    >
                      <Select.ItemText>{lifetime(option)}</Select.ItemText>
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
      </div>

      <fieldset className="settings-api-scopes">
        <legend>{tri(lang, "Permissões", "Permissions", "Permisos")}</legend>
        {RESOURCES.map((resource) => (
          <div key={resource.id}>
            <strong>{tri(lang, resource.pt, resource.en, resource.es)}</strong>
            {!resource.writeOnly && (
              <label>
                <Checkbox
                  checked={scopes.includes(resource.id + ".read")}
                  onCheckedChange={() => toggle(resource.id + ".read")}
                />
                {tri(lang, "Ler", "Read", "Leer")}
              </label>
            )}
            {!resource.readOnly && (
              <label>
                <Checkbox
                  checked={scopes.includes(resource.id + ".write")}
                  onCheckedChange={() => toggle(resource.id + ".write")}
                />
                {tri(lang, "Escrever", "Write", "Escribir")}
              </label>
            )}
          </div>
        ))}
      </fieldset>

      <button
        type="button"
        className="settings-api-submit"
        onClick={create}
        disabled={!name.trim() || Boolean(pending)}
      >
        {pending === "create" ? (
          <LoaderCircle className="spin" size={15} />
        ) : (
          <Plus size={15} />
        )}
        {tri(lang, "Criar chave", "Create key", "Crear llave")}
      </button>

      {error && <p className="settings-api-error">{error}</p>}

      {pending === "load" ? (
        <div className="settings-api-loading">
          <LoaderCircle className="spin" size={18} />
        </div>
      ) : active.length ? (
        <div className="settings-api-list">
          {active.map((item) => (
            <article key={item.id}>
              <span>
                <KeyRound size={17} />
              </span>
              <div>
                <strong>{item.name}</strong>
                <small>
                  <code>ulg_live_{item.prefix}…</code>
                  {" · "}
                  {item.scopes.length
                    ? item.scopes.join(", ")
                    : tri(
                        lang,
                        "sem permissões",
                        "no permissions",
                        "sin permisos",
                      )}
                </small>
                <small>
                  {item.last_used_at ? (
                    <>
                      {tri(lang, "Usada", "Used", "Usada")}{" "}
                      <RelativeTime value={item.last_used_at} lang={lang} />
                    </>
                  ) : (
                    tri(lang, "Nunca usada", "Never used", "Nunca usada")
                  )}
                  {item.expires_at && (
                    <>
                      {" · "}
                      {tri(lang, "expira", "expires", "expira")}{" "}
                      <RelativeTime value={item.expires_at} lang={lang} />
                    </>
                  )}
                </small>
              </div>
              <button
                type="button"
                onClick={() => revoke(item.id)}
                disabled={Boolean(pending)}
                aria-label={tri(
                  lang,
                  "Revogar chave",
                  "Revoke key",
                  "Revocar llave",
                )}
              >
                {pending === item.id ? (
                  <LoaderCircle className="spin" size={15} />
                ) : (
                  <Trash2 size={15} />
                )}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="settings-api-empty">
          {tri(
            lang,
            "Nenhuma chave ativa nesta conta.",
            "No active keys on this account.",
            "Ninguna llave activa en esta cuenta.",
          )}
        </p>
      )}
    </section>
  );
}

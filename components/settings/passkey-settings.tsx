"use client";

import {
  KeyRound,
  LoaderCircle,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { tri, type UiLang } from "@/lib/ui-text";

type Passkey = {
  id: string;
  friendly_name?: string;
  created_at: string;
  last_used_at?: string;
};

export function PasskeySettings({ lang }: { lang: UiLang }) {
  const [items, setItems] = useState<Passkey[]>([]);
  const [pending, setPending] = useState<string | null>("load");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data, error: actionError } =
      await createClient().auth.passkey.list();
    if (actionError)
      setError(
        tri(
          lang,
          "Não foi possível carregar suas passkeys.",
          "Could not load your passkeys.",
          "No se pudieron cargar tus passkeys.",
        ),
      );
    else setItems(data ?? []);
    setPending(null);
  }
  useEffect(() => {
    void createClient()
      .auth.passkey.list()
      .then(({ data, error: actionError }) => {
        if (actionError)
          setError(
            tri(
              lang,
              "Não foi possível carregar suas passkeys.",
              "Could not load your passkeys.",
              "No se pudieron cargar tus passkeys.",
            ),
          );
        else setItems(data ?? []);
        setPending(null);
      });
  }, [lang]);

  async function register() {
    if (!("PublicKeyCredential" in window)) {
      setError(
        tri(
          lang,
          "Este dispositivo não oferece suporte a passkeys.",
          "This device does not support passkeys.",
          "Este dispositivo no admite passkeys.",
        ),
      );
      return;
    }
    setPending("register");
    setError(null);
    const { error: actionError } = await createClient().auth.registerPasskey();
    if (actionError)
      setError(
        actionError.code === "passkey_disabled"
          ? tri(
              lang,
              "Passkeys ainda não estão habilitadas no projeto.",
              "Passkeys are not enabled for this project yet.",
              "Las passkeys todavía no están habilitadas en el proyecto.",
            )
          : tri(
              lang,
              "Cadastro cancelado ou não concluído.",
              "Registration was cancelled or not completed.",
              "Registro cancelado o no completado.",
            ),
      );
    else await load();
    setPending(null);
  }

  async function remove(id: string) {
    setPending(id);
    setError(null);
    const { error: actionError } = await createClient().auth.passkey.delete({
      passkeyId: id,
    });
    if (actionError)
      setError(
        tri(
          lang,
          "Não foi possível remover esta passkey.",
          "Could not remove this passkey.",
          "No se pudo quitar esta passkey.",
        ),
      );
    else setItems((current) => current.filter((item) => item.id !== id));
    setPending(null);
  }

  return (
    <section className="settings-security-card">
      <header>
        <span>
          <ShieldCheck size={20} />
        </span>
        <div>
          <h2>Passkeys</h2>
          <p>
            {tri(
              lang,
              "Entre com biometria, PIN ou uma chave física. A chave privada nunca sai do seu dispositivo.",
              "Sign in with biometrics, a PIN, or a hardware key. Your private key never leaves your device.",
              "Entra con biometría, PIN o una llave física. La clave privada nunca sale de tu dispositivo.",
            )}
          </p>
        </div>
      </header>
      {pending === "load" ? (
        <div className="settings-passkey-loading">
          <LoaderCircle className="spin" size={18} />
        </div>
      ) : items.length ? (
        <div className="settings-passkey-list">
          {items.map((item) => (
            <article key={item.id}>
              <span>
                <KeyRound size={17} />
              </span>
              <div>
                <strong>
                  {item.friendly_name ||
                    tri(
                      lang,
                      "Passkey sem nome",
                      "Unnamed passkey",
                      "Passkey sin nombre",
                    )}
                </strong>
                <small>
                  {tri(lang, "Criada em", "Created", "Creada el")}{" "}
                  {new Intl.DateTimeFormat(lang, {
                    dateStyle: "medium",
                  }).format(new Date(item.created_at))}
                </small>
              </div>
              <button
                type="button"
                onClick={() => remove(item.id)}
                disabled={Boolean(pending)}
                aria-label={tri(
                  lang,
                  "Remover passkey",
                  "Remove passkey",
                  "Quitar passkey",
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
        <p className="settings-passkey-empty">
          {tri(
            lang,
            "Nenhuma passkey cadastrada nesta conta.",
            "No passkeys registered for this account.",
            "Ninguna passkey registrada en esta cuenta.",
          )}
        </p>
      )}
      {error && (
        <p className="settings-security-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="settings-passkey-add"
        type="button"
        onClick={register}
        disabled={Boolean(pending)}
      >
        {pending === "register" ? (
          <LoaderCircle className="spin" size={15} />
        ) : (
          <Plus size={15} />
        )}
        {tri(
          lang,
          "Cadastrar passkey",
          "Register passkey",
          "Registrar passkey",
        )}
      </button>
    </section>
  );
}

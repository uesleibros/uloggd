"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, UserMinus, UserPlus, Users } from "lucide-react";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * The people who hold this organization account.
 *
 * An organization used to be a shared login: everyone running it shared one
 * password, nothing recorded who did what, and removing someone meant changing
 * that password on everybody. This lists them instead, and lets the account
 * add and remove.
 *
 * Deliberately honest about what it is not: being listed does not yet grant
 * anyone the ability to post as the account. Saying so here is better than
 * implying otherwise and letting someone discover it by trying.
 */
type Member = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: "OWNER" | "MANAGER";
};

export function OrganizationMembers({
  lang,
}: {
  lang: UiLang;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [username, setUsername] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const answer = await fetch("/api/organization/members");
    if (!answer.ok) return [];
    return ((await answer.json()).members ?? []) as Member[];
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rows = await load();
      // Guarded rather than set unconditionally: the account id can change
      // under a client navigation, and a late response would otherwise
      // overwrite the list for the account now on screen.
      if (!cancelled) setMembers(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const handle = username.trim().replace(/^@/, "");
    if (!handle || pending) return;
    setPending(true);
    setError(null);
    const answer = await fetch("/api/organization/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: handle }),
    });
    const rpcError = answer.ok
      ? null
      : { code: (await answer.json().catch(() => ({}))).error };
    if (rpcError) {
      // The function distinguishes these, so the message can too rather than
      // saying "something went wrong" to someone who simply typed a typo.
      setError(
        rpcError.code === "not_found"
          ? tri(
              lang,
              "Não existe conta com esse nome.",
              "No account with that username.",
              "No existe una cuenta con ese nombre.",
            )
          : rpcError.code === "invalid_request"
            ? tri(
                lang,
                "Essa conta não pode ser adicionada.",
                "That account cannot be added.",
                "Esa cuenta no se puede añadir.",
              )
            : tri(
                lang,
                "Não foi possível adicionar agora.",
                "Could not add right now.",
                "No se pudo añadir ahora.",
              ),
      );
    } else {
      setUsername("");
      setMembers(await load());
    }
    setPending(false);
  }

  async function remove(member: Member) {
    if (pending) return;
    setPending(true);
    setError(null);
    await fetch(
      `/api/organization/members?username=${encodeURIComponent(member.username)}`,
      { method: "DELETE" },
    );
    setMembers(await load());
    setPending(false);
  }

  return (
    <section className="push-settings">
      <header>
        <span>
          <Users size={20} />
        </span>
        <div>
          <h2>
            {tri(
              lang,
              "Quem administra esta conta",
              "Who runs this account",
              "Quién administra esta cuenta",
            )}
          </h2>
          <p>
            {tri(
              lang,
              "As pessoas listadas aqui aparecem publicamente no perfil, para quem quiser saber quem está por trás da conta. Ainda não é um login separado: entrar continua sendo pela senha desta conta.",
              "The people listed here appear publicly on the profile, for anyone wanting to know who is behind the account. It is not a separate login yet: signing in still uses this account's password.",
              "Las personas aquí aparecen públicamente en el perfil, para quien quiera saber quién está detrás de la cuenta. Todavía no es un inicio de sesión aparte: se sigue entrando con la contraseña de esta cuenta.",
            )}
          </p>
        </div>
      </header>

      <div className="push-settings-body">
        <form className="organization-member-add" onSubmit={add}>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder={tri(
              lang,
              "nome de usuário",
              "username",
              "nombre de usuario",
            )}
            maxLength={40}
            disabled={pending}
            aria-label={tri(
              lang,
              "Nome de usuário para adicionar",
              "Username to add",
              "Nombre de usuario para añadir",
            )}
          />
          <button
            type="submit"
            className="push-settings-enable"
            disabled={pending || !username.trim()}
          >
            {pending ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <UserPlus size={15} />
            )}
            {tri(lang, "Adicionar", "Add", "Añadir")}
          </button>
        </form>

        {members.length > 0 && (
          <ul className="push-device-list">
            {members.map((member) => (
              <li key={member.username}>
                <span>
                  <strong>
                    {member.display_name || `@${member.username}`}
                  </strong>
                  <b>
                    {member.role === "OWNER"
                      ? tri(lang, "Responsável", "Owner", "Responsable")
                      : tri(lang, "Gestor", "Manager", "Gestor")}
                  </b>
                </span>
                <button
                  type="button"
                  onClick={() => void remove(member)}
                  disabled={pending}
                  aria-label={tri(lang, "Remover", "Remove", "Eliminar")}
                >
                  <UserMinus size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p className="push-settings-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

"use client";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function CreateListForm({ lang }: { lang: "pt-BR" | "en" }) {
  const pt = lang === "pt-BR";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    const { error: actionError } = await createClient().rpc(
      "create_game_list",
      {
        list_name: formData.get("name"),
        list_description: formData.get("description"),
        list_visibility: formData.get("visibility"),
      },
    );
    if (actionError)
      setError(
        pt ? "Não foi possível criar a lista." : "Could not create the list.",
      );
    else {
      setOpen(false);
      router.refresh();
    }
    setPending(false);
  }
  if (!open)
    return (
      <button
        className="create-list-trigger"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Plus size={15} /> {pt ? "Nova lista" : "New list"}
      </button>
    );
  return (
    <form action={submit} className="create-list-form">
      <label>
        <span>{pt ? "Nome" : "Name"}</span>
        <input name="name" required minLength={1} maxLength={100} autoFocus />
      </label>
      <label>
        <span>{pt ? "Descrição" : "Description"}</span>
        <textarea name="description" rows={3} maxLength={500} />
      </label>
      <label>
        <span>{pt ? "Visibilidade" : "Visibility"}</span>
        <select name="visibility">
          <option value="PUBLIC">{pt ? "Pública" : "Public"}</option>
          <option value="FOLLOWERS">{pt ? "Seguidores" : "Followers"}</option>
          <option value="PRIVATE">{pt ? "Privada" : "Private"}</option>
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      <footer>
        <button type="button" onClick={() => setOpen(false)}>
          {pt ? "Cancelar" : "Cancel"}
        </button>
        <button type="submit" disabled={pending}>
          {pending
            ? pt
              ? "Criando…"
              : "Creating…"
            : pt
              ? "Criar lista"
              : "Create list"}
        </button>
      </footer>
    </form>
  );
}

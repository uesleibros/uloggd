"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import * as Dialog from "@/components/ui/dialog";
import {
  CheckCircle2,
  HandCoins,
  LoaderCircle,
  Minus,
  Plus,
  Send,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MINERAL_ART, type MineralHolding } from "@/lib/minerals";
import { MINERAL_NAMES } from "@/components/wallet-workspace";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

/**
 * Sends minerals to somebody else, from their profile.
 *
 * The balance shown is the sender's own, read on open, and the steppers stop
 * at it. That is a courtesy rather than a control: the database checks every
 * amount again and refuses the whole transfer if any of it is short, because a
 * limit enforced in a browser is a limit the browser can lift.
 *
 * All or nothing on purpose. A transfer that quietly sends the affordable half
 * would leave the sender believing something else happened.
 */
export function SendMinerals({
  lang,
  recipientId,
  recipientName,
  wallet,
}: {
  lang: UiLang;
  recipientId: string;
  recipientName: string;
  /** The sender's own balances, for the ceilings on each stepper. */
  wallet: MineralHolding[];
}) {
  const t = uiText(lang);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const spendable = wallet.filter((holding) => holding.amount > 0);
  const total = Object.values(amounts).reduce((sum, value) => sum + value, 0);

  function step(mineral: string, delta: number, ceiling: number) {
    setAmounts((current) => {
      const next = Math.min(
        ceiling,
        Math.max(0, (current[mineral] ?? 0) + delta),
      );
      return { ...current, [mineral]: next };
    });
  }

  async function send(event?: React.FormEvent) {
    event?.preventDefault();
    if (!total || pending) return;
    setPending(true);
    setError(null);
    const items = Object.fromEntries(
      Object.entries(amounts).filter(([, value]) => value > 0),
    );
    const { error: failed } = await createClient().rpc("send_minerals", {
      recipient: recipientId,
      items,
      note: note.trim() || null,
    });
    setPending(false);
    if (failed) {
      // The database says which mineral ran short; that message is more useful
      // than a generic failure, and it is the only place that knows.
      setError(
        failed.message.startsWith("not enough")
          ? tri(
              lang,
              "Você não tem tudo isso.",
              "You do not have all of that.",
              "No tienes todo eso.",
            )
          : tri(
              lang,
              "Não foi possível enviar.",
              "Could not send.",
              "No se pudo enviar.",
            ),
      );
      return;
    }
    setSent(true);
    setAmounts({});
    setNote("");
    router.refresh();
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError(null);
          setSent(false);
        }
      }}
    >
      <Dialog.Trigger asChild>
        <button type="button" className="send-minerals-trigger">
          <HandCoins size={14} aria-hidden />
          {tri(lang, "Enviar minérios", "Send minerals", "Enviar minerales")}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-backdrop" />
        <Dialog.Content
          className="social-editor-dialog send-minerals-dialog"
          aria-describedby={undefined}
        >
          <header>
            <div>
              <Dialog.Title>
                {tri(
                  lang,
                  `Enviar para ${recipientName}`,
                  `Send to ${recipientName}`,
                  `Enviar a ${recipientName}`,
                )}
              </Dialog.Title>
            </div>
            <Dialog.Close aria-label={t.close}>
              <X size={19} />
            </Dialog.Close>
          </header>

          {/* A real `.social-editor-form`, like every other dialog here: the
              padding, the field rhythm, the sticky footer and the primary
              button all come from that class, and the first version of this
              modal used none of it and looked exactly that way. */}
          <form className="social-editor-form" onSubmit={send}>
            {sent ? (
              <div className="send-minerals-done" role="status">
                <CheckCircle2 size={28} aria-hidden />
                <p>
                  {tri(
                    lang,
                    "Enviado. Já está na carteira de quem recebeu.",
                    "Sent. It is already in their wallet.",
                    "Enviado. Ya está en su cartera.",
                  )}
                </p>
                <footer>
                  <button type="button" onClick={() => setOpen(false)}>
                    {tri(lang, "Fechar", "Close", "Cerrar")}
                  </button>
                </footer>
              </div>
            ) : !spendable.length ? (
              <p className="send-minerals-empty">
                {tri(
                  lang,
                  "Você ainda não tem minérios para enviar.",
                  "You have no minerals to send yet.",
                  "Todavía no tienes minerales para enviar.",
                )}
              </p>
            ) : (
              <>
                <ul className="send-minerals-list">
                  {spendable.map((holding) => {
                    const chosen = amounts[holding.mineral] ?? 0;
                    return (
                      <li
                        key={holding.mineral}
                        data-chosen={chosen > 0 || undefined}
                      >
                        <Image
                          src={MINERAL_ART[holding.mineral]}
                          alt=""
                          width={30}
                          height={30}
                          aria-hidden
                        />
                        <span>
                          <strong>
                            {MINERAL_NAMES[holding.mineral](lang)}
                          </strong>
                          <small>
                            {tri(
                              lang,
                              `Você tem ${holding.amount}`,
                              `You have ${holding.amount}`,
                              `Tienes ${holding.amount}`,
                            )}
                          </small>
                        </span>
                        <span className="send-minerals-stepper">
                          <button
                            type="button"
                            onClick={() =>
                              step(holding.mineral, -1, holding.amount)
                            }
                            disabled={chosen === 0}
                            aria-label={tri(lang, "Menos", "Less", "Menos")}
                          >
                            <Minus size={13} />
                          </button>
                          <b>{chosen}</b>
                          <button
                            type="button"
                            onClick={() =>
                              step(holding.mineral, 1, holding.amount)
                            }
                            disabled={chosen >= holding.amount}
                            aria-label={tri(lang, "Mais", "More", "Más")}
                          >
                            <Plus size={13} />
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <label className="send-minerals-note">
                  <span>{tri(lang, "Recado", "Note", "Nota")}</span>
                  <input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={140}
                    placeholder={tri(lang, "Opcional", "Optional", "Opcional")}
                  />
                </label>

                {error && (
                  <p className="social-form-error" role="alert">
                    {error}
                  </p>
                )}

                <footer>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={pending}
                  >
                    {tri(lang, "Cancelar", "Cancel", "Cancelar")}
                  </button>
                  <button type="submit" disabled={!total || pending}>
                    {pending ? (
                      <LoaderCircle className="spin" size={14} aria-hidden />
                    ) : (
                      <Send size={14} aria-hidden />
                    )}
                    {total
                      ? tri(
                          lang,
                          `Enviar ${total}`,
                          `Send ${total}`,
                          `Enviar ${total}`,
                        )
                      : tri(lang, "Enviar", "Send", "Enviar")}
                  </button>
                </footer>
              </>
            )}
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

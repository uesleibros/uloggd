"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDownLeft, ArrowUpRight, Coins, History } from "lucide-react";
import { FilterSelect } from "@/components/social/filter-select";
import { createClient } from "@/lib/supabase/client";
import {
  MINERAL_ART,
  mineralOdds,
  totalWeight,
  type MineralHolding,
  type MineralKind,
} from "@/lib/minerals";
import { EASE_OUT, MOTION_MS } from "@/lib/motion";
import { tri, type UiLang } from "@/lib/ui-text";

export const MINERAL_NAMES: Record<MineralKind, (lang: UiLang) => string> = {
  COPPER: (lang) => tri(lang, "Cobre", "Copper", "Cobre"),
  IRON: (lang) => tri(lang, "Ferro", "Iron", "Hierro"),
  GOLD: (lang) => tri(lang, "Ouro", "Gold", "Oro"),
  EMERALD: (lang) => tri(lang, "Esmeralda", "Emerald", "Esmeralda"),
  DIAMOND: (lang) => tri(lang, "Diamante", "Diamond", "Diamante"),
  RUBY: (lang) => tri(lang, "Rubi", "Ruby", "Rubí"),
};

type Grant = { level: number; mineral: MineralKind; created_at: string };
type Transfer = {
  id: string;
  sender_id: string;
  recipient_id: string;
  note: string | null;
  created_at: string;
  mineral_transfer_items: { mineral: MineralKind; amount: number }[];
  sender: { username: string; display_name: string | null } | null;
  recipient: { username: string; display_name: string | null } | null;
};

type Show = "all" | "owned" | "missing";
type Sort = "rarity" | "amount" | "name";

/**
 * The wallet body: the six slots, filtered, and the ledger under them.
 *
 * Filtering matters more than it looks like it should. Six slots always
 * showing all six is a picture, not a wallet; being able to ask "what do I
 * actually have" and "what am I missing" is what makes it answer a question.
 *
 * The history is only fetched for the owner. Transfers are readable by the two
 * accounts in them and nothing else, so asking for someone else's would return
 * an empty list and a panel that looks broken rather than private.
 */
export function WalletWorkspace({
  holdings,
  lang,
  profileId,
  canClaim,
}: {
  holdings: MineralHolding[];
  lang: UiLang;
  profileId: string;
  canClaim: boolean;
}) {
  const [show, setShow] = useState<Show>("all");
  const [sort, setSort] = useState<Sort>("rarity");
  const [grants, setGrants] = useState<Grant[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const total = totalWeight(holdings);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    void (async () => {
      if (canClaim) await supabase.rpc("claim_level_minerals");
      // Both reads are filtered by hand. The grants policy is `using (true)`,
      // because a wallet is public the way a level is, which puts the scoping
      // on every query rather than on the table.
      const [{ data: grantRows }, { data: transferRows }] = await Promise.all([
        supabase
          .from("mineral_grants")
          .select("level,mineral,created_at")
          .eq("profile_id", profileId)
          .order("level", { ascending: false }),
        canClaim
          ? supabase
              .from("mineral_transfers")
              .select(
                "id,sender_id,recipient_id,note,created_at,mineral_transfer_items(mineral,amount),sender:profiles!mineral_transfers_sender_id_fkey(username,display_name),recipient:profiles!mineral_transfers_recipient_id_fkey(username,display_name)",
              )
              .order("created_at", { ascending: false })
              .limit(50)
          : Promise.resolve({ data: [] }),
      ]);
      if (!active) return;
      setGrants((grantRows ?? []) as Grant[]);
      setTransfers((transferRows ?? []) as unknown as Transfer[]);
    })();
    return () => {
      active = false;
    };
  }, [profileId, canClaim]);

  const visible = useMemo(() => {
    const filtered = holdings.filter((holding) =>
      show === "owned"
        ? holding.amount > 0
        : show === "missing"
          ? holding.amount === 0
          : true,
    );
    return [...filtered].sort((a, b) => {
      if (sort === "amount") return b.amount - a.amount || a.rank - b.rank;
      if (sort === "name")
        return MINERAL_NAMES[a.mineral](lang).localeCompare(
          MINERAL_NAMES[b.mineral](lang),
        );
      return a.rank - b.rank;
    });
  }, [holdings, show, sort, lang]);

  const date = new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      <div className="wallet-filters">
        <FilterSelect
          value={show}
          onChange={(next) => setShow(next as Show)}
          label={tri(lang, "Mostrar", "Show", "Mostrar")}
          options={[
            {
              value: "all",
              label: tri(lang, "Todos", "All", "Todos"),
              icon: <Coins size={14} />,
            },
            {
              value: "owned",
              label: tri(lang, "Que tenho", "Owned", "Que tengo"),
              icon: <ArrowDownLeft size={14} />,
            },
            {
              value: "missing",
              label: tri(lang, "Que faltam", "Missing", "Que faltan"),
              icon: <ArrowUpRight size={14} />,
            },
          ]}
        />
        <FilterSelect
          value={sort}
          onChange={(next) => setSort(next as Sort)}
          label={tri(lang, "Ordenar", "Sort", "Ordenar")}
          options={[
            {
              value: "rarity",
              label: tri(lang, "Raridade", "Rarity", "Rareza"),
              icon: <Coins size={14} />,
            },
            {
              value: "amount",
              label: tri(lang, "Quantidade", "Amount", "Cantidad"),
              icon: <Coins size={14} />,
            },
            {
              value: "name",
              label: tri(lang, "Nome", "Name", "Nombre"),
              icon: <Coins size={14} />,
            },
          ]}
        />
      </div>

      <ol className="wallet-grid">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((holding) => {
            const odds = mineralOdds(holding.weight, total);
            return (
              <motion.li
                key={holding.mineral}
                layout="position"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{
                  duration: MOTION_MS.quick / 1000,
                  ease: EASE_OUT,
                }}
                data-empty={holding.amount === 0 || undefined}
              >
                <Image
                  src={MINERAL_ART[holding.mineral]}
                  alt=""
                  width={72}
                  height={72}
                  aria-hidden
                />
                <strong>{holding.amount}</strong>
                <span>{MINERAL_NAMES[holding.mineral](lang)}</span>
                {/* Two decimals at the rare end: ruby is 0.2%, and a whole
                    number would print it as 0% and read as broken. */}
                <small>
                  {odds < 1 ? odds.toFixed(2) : odds.toFixed(odds < 10 ? 1 : 0)}
                  {tri(lang, "% por nível", "% per level", "% por nivel")}
                </small>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
      {!visible.length && (
        <p className="wallet-empty">
          {show === "owned"
            ? tri(
                lang,
                "Nenhum minério ainda.",
                "No minerals yet.",
                "Ningún mineral todavía.",
              )
            : tri(
                lang,
                "A coleção está completa.",
                "The collection is complete.",
                "La colección está completa.",
              )}
        </p>
      )}

      {canClaim && transfers.length > 0 && (
        <section className="wallet-history">
          <h2>
            <History size={16} aria-hidden />
            {tri(lang, "Transferências", "Transfers", "Transferencias")}
          </h2>
          <ol>
            {transfers.map((transfer) => {
              const outgoing = transfer.sender_id === profileId;
              const other = outgoing ? transfer.recipient : transfer.sender;
              return (
                <li key={transfer.id} data-outgoing={outgoing || undefined}>
                  {outgoing ? (
                    <ArrowUpRight size={16} aria-hidden />
                  ) : (
                    <ArrowDownLeft size={16} aria-hidden />
                  )}
                  <span className="wallet-transfer-copy">
                    <strong>
                      {outgoing
                        ? tri(lang, "Enviado para", "Sent to", "Enviado a")
                        : tri(
                            lang,
                            "Recebido de",
                            "Received from",
                            "Recibido de",
                          )}{" "}
                      {other ? (
                        <Link href={`/${lang}/u/${other.username}`}>
                          {other.display_name || `@${other.username}`}
                        </Link>
                      ) : (
                        tri(
                          lang,
                          "conta removida",
                          "removed account",
                          "cuenta eliminada",
                        )
                      )}
                    </strong>
                    {transfer.note && <em>{transfer.note}</em>}
                  </span>
                  <span className="wallet-transfer-items">
                    {transfer.mineral_transfer_items.map((item) => (
                      <span key={item.mineral}>
                        <Image
                          src={MINERAL_ART[item.mineral]}
                          alt={MINERAL_NAMES[item.mineral](lang)}
                          width={18}
                          height={18}
                        />
                        {item.amount}
                      </span>
                    ))}
                  </span>
                  <small>{date.format(new Date(transfer.created_at))}</small>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {grants.length > 0 && (
        <section className="wallet-history">
          <h2>
            <History size={16} aria-hidden />
            {tri(lang, "Sorteios de nível", "Level draws", "Sorteos de nivel")}
          </h2>
          <ol>
            {grants.map((grant) => (
              <li key={grant.level}>
                <Image
                  src={MINERAL_ART[grant.mineral]}
                  alt=""
                  width={24}
                  height={24}
                  aria-hidden
                />
                <span className="wallet-transfer-copy">
                  <strong>
                    {tri(
                      lang,
                      `Nível ${grant.level}`,
                      `Level ${grant.level}`,
                      `Nivel ${grant.level}`,
                    )}
                  </strong>
                </span>
                <span className="wallet-transfer-items">
                  {MINERAL_NAMES[grant.mineral](lang)}
                </span>
                <small>{date.format(new Date(grant.created_at))}</small>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

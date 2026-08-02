"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import {
  MINERAL_ART,
  mineralOdds,
  totalWeight,
  type MineralHolding,
  type MineralKind,
} from "@/lib/minerals";
import { EASE_OUT, MOTION_MS } from "@/lib/motion";
import { tri, type UiLang } from "@/lib/ui-text";

/** What each mineral is called. The rest of a slot comes from the database. */
const NAMES: Record<MineralKind, (lang: UiLang) => string> = {
  COPPER: (lang) => tri(lang, "Cobre", "Copper", "Cobre"),
  IRON: (lang) => tri(lang, "Ferro", "Iron", "Hierro"),
  GOLD: (lang) => tri(lang, "Ouro", "Gold", "Oro"),
  EMERALD: (lang) => tri(lang, "Esmeralda", "Emerald", "Esmeralda"),
  DIAMOND: (lang) => tri(lang, "Diamante", "Diamond", "Diamante"),
  RUBY: (lang) => tri(lang, "Rubi", "Ruby", "Rubí"),
};

/**
 * The six minerals a profile has collected, in rarity order.
 *
 * Empty slots are drawn rather than hidden. A wallet listing only what someone
 * owns cannot show what there is to want, and the gaps are most of what makes
 * a ruby legible as a ruby.
 *
 * The odds under each name are read from the same weights the draw uses, so
 * what someone is told is what they are playing.
 */
export function MineralWallet({
  holdings,
  lang,
}: {
  holdings: MineralHolding[];
  lang: UiLang;
}) {
  const still = useReducedMotion();
  if (!holdings.length) return null;
  const total = totalWeight(holdings);
  const owned = holdings.reduce((sum, holding) => sum + holding.amount, 0);

  return (
    <section className="mineral-wallet">
      <header>
        <h3>{tri(lang, "Carteira", "Wallet", "Cartera")}</h3>
        <small>
          {owned > 0
            ? tri(
                lang,
                `${owned} ${owned === 1 ? "minério" : "minérios"}`,
                `${owned} ${owned === 1 ? "mineral" : "minerals"}`,
                `${owned} ${owned === 1 ? "mineral" : "minerales"}`,
              )
            : tri(
                lang,
                "Suba de nível para ganhar",
                "Level up to earn them",
                "Sube de nivel para ganarlos",
              )}
        </small>
      </header>
      <ul>
        {holdings.map((holding, index) => {
          const odds = mineralOdds(holding.weight, total);
          return (
            <motion.li
              key={holding.mineral}
              data-empty={holding.amount === 0 || undefined}
              initial={still ? false : { opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                still
                  ? { duration: 0 }
                  : {
                      duration: MOTION_MS.quick / 1000,
                      ease: EASE_OUT,
                      delay: index * 0.04,
                    }
              }
            >
              <Image
                src={MINERAL_ART[holding.mineral]}
                alt=""
                width={34}
                height={34}
                aria-hidden
              />
              <strong>{holding.amount}</strong>
              <span>{NAMES[holding.mineral](lang)}</span>
              {/* Two decimals for the rare end: ruby is 0.2%, and a whole
                  number would print it as 0% and make it look broken. */}
              <small>
                {odds < 1 ? odds.toFixed(2) : odds.toFixed(odds < 10 ? 1 : 0)}%
              </small>
            </motion.li>
          );
        })}
      </ul>
      <p className="mineral-wallet-note">
        {tri(
          lang,
          "Cada nível alcançado sorteia um minério.",
          "Every level reached draws one mineral.",
          "Cada nivel alcanzado sortea un mineral.",
        )}
      </p>
    </section>
  );
}

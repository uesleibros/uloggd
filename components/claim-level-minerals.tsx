"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MINERAL_ART, mineralName, type MineralKind } from "@/lib/minerals";
import { EASE_OUT, MOTION_MS } from "@/lib/motion";
import { tri, type UiLang } from "@/lib/ui-text";

type Grant = { level: number; mineral: MineralKind };

/**
 * Collects the minerals owed for levels reached since the last visit.
 *
 * Rendered on your own profile only. A level here is derived from what you
 * have logged rather than raised by an event, so there is no moment a reward
 * could be pushed from; something has to ask, and your own profile is the page
 * where finding out what you won makes sense.
 *
 * Safe to call whenever it mounts. The ledger has one row per level with a
 * unique key, so a second call pays nothing and returns nothing.
 */
export function ClaimLevelMinerals({ lang }: { lang: UiLang }) {
  const [grants, setGrants] = useState<Grant[]>([]);

  useEffect(() => {
    let active = true;
    createClient()
      .rpc("claim_level_minerals")
      .then(({ data }) => {
        // Nothing owed is the common case and says nothing: the panel only
        // appears when there is something new to show.
        if (active && data?.length) setGrants(data as Grant[]);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <AnimatePresence>
      {grants.length > 0 && (
        <motion.aside
          className="mineral-claim"
          role="status"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: MOTION_MS.normal / 1000, ease: EASE_OUT }}
        >
          <div>
            <strong>
              {grants.length === 1
                ? tri(
                    lang,
                    `Nível ${grants[0].level} alcançado`,
                    `Level ${grants[0].level} reached`,
                    `Nivel ${grants[0].level} alcanzado`,
                  )
                : tri(
                    lang,
                    `${grants.length} níveis alcançados`,
                    `${grants.length} levels reached`,
                    `${grants.length} niveles alcanzados`,
                  )}
            </strong>
            <ul>
              {grants.map((grant) => (
                <li key={grant.level}>
                  <Image
                    src={MINERAL_ART[grant.mineral]}
                    alt=""
                    width={26}
                    height={26}
                    aria-hidden
                  />
                  <span>{mineralName(grant.mineral, lang)}</span>
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setGrants([])}
            aria-label={tri(lang, "Fechar", "Close", "Cerrar")}
          >
            <X size={16} />
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

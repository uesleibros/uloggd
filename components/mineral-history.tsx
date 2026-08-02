"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { MINERAL_ART, type MineralKind } from "@/lib/minerals";
import { tri, type UiLang } from "@/lib/ui-text";

type Grant = { level: number; mineral: MineralKind; created_at: string };

/**
 * Which level paid which mineral, newest first.
 *
 * The wallet above says what someone has; this says where it came from. Both
 * matter for a currency that is drawn rather than earned at a fixed rate:
 * without the ledger, a run of copper looks like the odds are broken, and with
 * it the run is visibly just a run.
 *
 * Claims the outstanding levels first, so arriving here is one of the ways to
 * collect. The call is idempotent, so doing it here and on the profile cannot
 * pay twice.
 */
export function MineralHistory({
  lang,
  profileId,
  canClaim,
  name,
}: {
  lang: UiLang;
  profileId: string;
  /** Only the owner's visit collects what is owed. */
  canClaim: boolean;
  name: string;
}) {
  const [grants, setGrants] = useState<Grant[] | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    void (async () => {
      if (canClaim) await supabase.rpc("claim_level_minerals");
      // Filtered explicitly. The read policy on this table is `using (true)`,
      // because a wallet is public like a level is, so an unfiltered select
      // here would list every grant on the site rather than this profile's.
      const { data } = await supabase
        .from("mineral_grants")
        .select("level,mineral,created_at")
        .eq("profile_id", profileId)
        .order("level", { ascending: false });
      if (active) setGrants((data ?? []) as Grant[]);
    })();
    return () => {
      active = false;
    };
  }, [profileId, canClaim]);

  if (grants === null || !grants.length) return null;

  const date = new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <section className="wallet-history">
      <h2>
        {canClaim
          ? tri(
              lang,
              "Como você conseguiu",
              "How you got them",
              "Cómo los conseguiste",
            )
          : tri(
              lang,
              `Como ${name} conseguiu`,
              `How ${name} got them`,
              `Cómo ${name} los consiguió`,
            )}
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
            <strong>
              {tri(
                lang,
                `Nível ${grant.level}`,
                `Level ${grant.level}`,
                `Nivel ${grant.level}`,
              )}
            </strong>
            <small>{date.format(new Date(grant.created_at))}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}

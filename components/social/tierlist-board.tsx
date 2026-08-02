import Link from "next/link";
import { SafeImage } from "@/components/safe-image";
import { readableInk, tierLabelFontSize } from "@/lib/tier-color";
import type { TierlistItem, TierlistTier } from "@/lib/tierlists";
import { tri, type UiLang } from "@/lib/ui-text";
import { Tooltip } from "@/components/ui/tooltip";

/**
 * The read-only tierlist: one row per tier, its coloured label on the left and
 * the games ranked into it on the right. This is the single renderer for a
 * finished board, the detail page shows it, and the editor's live preview
 * reuses it, so what an author arranges is exactly what a reader sees.
 *
 * `compact` drops covers to a thumbnail strip for the collection card; the
 * default size matches the list-detail column.
 */
export function TierlistBoard({
  tiers,
  items,
  lang,
  linkGames = false,
  compact = false,
}: {
  tiers: TierlistTier[];
  items: TierlistItem[];
  lang: UiLang;
  linkGames?: boolean;
  compact?: boolean;
}) {
  const byTier = new Map<string, TierlistItem[]>();
  for (const item of items) {
    const bucket = byTier.get(item.tierId);
    if (bucket) bucket.push(item);
    else byTier.set(item.tierId, [item]);
  }

  return (
    <div className="tierlist-board" data-compact={compact || undefined}>
      {tiers.map((tier) => {
        const games = byTier.get(tier.id) ?? [];
        return (
          <div className="tierlist-row" key={tier.id}>
            <Tooltip label={tier.label}>
              <span
                className="tierlist-row-label"
                style={{
                  background: tier.color,
                  color: readableInk(tier.color),
                  fontSize: tierLabelFontSize(tier.label, compact ? 0.72 : 1),
                }}
              >
                {tier.label}
              </span>
            </Tooltip>
            <div className="tierlist-row-games">
              {games.length ? (
                games.map((game) => {
                  const cover = (
                    <SafeImage
                      src={game.coverUrl}
                      fallbackSrc={game.fallbackUrl}
                      alt={game.name}
                      width={compact ? 34 : 84}
                      height={compact ? 45 : 112}
                      unoptimized
                    />
                  );
                  return linkGames && !compact ? (
                    <Tooltip key={game.igdbId} label={game.name}>
                      <Link
                        className="tierlist-cover"
                        href={`/${lang}/game/${game.slug}`}
                      >
                        {cover}
                      </Link>
                    </Tooltip>
                  ) : (
                    <Tooltip key={game.igdbId} label={game.name}>
                      <span className="tierlist-cover">{cover}</span>
                    </Tooltip>
                  );
                })
              ) : (
                <span className="tierlist-row-empty" aria-hidden />
              )}
            </div>
          </div>
        );
      })}
      {!tiers.length && (
        <p className="tierlist-board-empty">
          {tri(
            lang,
            "Nenhuma tier ainda.",
            "No tiers yet.",
            "Ninguna tier todavía.",
          )}
        </p>
      )}
    </div>
  );
}

/**
 * Loading state for the board, the same row shape (label plate + a strip of
 * covers) so the tierlist page never flashes the collection cover-grid
 * skeleton while the games load. Rows taper to read as a real board.
 */
export function TierlistSkeleton() {
  return (
    <div className="tierlist-board" aria-busy="true" aria-hidden>
      {[6, 5, 4, 3, 2].map((count, row) => (
        <div className="tierlist-row" key={row}>
          <span className="tierlist-row-label skeleton-block" />
          <div className="tierlist-row-games">
            {Array.from({ length: count }, (_, index) => (
              <span
                className="tierlist-cover skeleton-block"
                key={index}
                style={{ width: "84px", height: "112px" }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

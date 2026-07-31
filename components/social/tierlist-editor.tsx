"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as DropdownMenu from "@/components/ui/dropdown-menu";
import {
  ArrowDownAZ,
  ArrowDownUp,
  ArrowUpAZ,
  Check,
  GripVertical,
  Layers3,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { SafeImage } from "@/components/safe-image";
import { createClient } from "@/lib/supabase/client";
import {
  readableInk,
  TIER_COLORS,
  TIER_LABEL_MAX,
  tierLabelFontSize,
} from "@/lib/tier-color";
import type { TierlistData, TierlistGame, TierlistTier } from "@/lib/tierlists";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

// "pool" or "tier:<id>", the zone a game currently sits in.
const POOL = "pool";
const tierZone = (id: string) => `tier:${id}`;

type Drag =
  | { kind: "game"; igdbId: number; zone: string }
  | { kind: "tier"; tierId: string }
  | null;

type SortMode = "manual" | "az" | "za" | "newest" | "oldest";

function newId() {
  return crypto.randomUUID();
}

function sortGames(games: TierlistGame[], mode: SortMode) {
  const copy = [...games];
  if (mode === "az") copy.sort((a, b) => a.name.localeCompare(b.name));
  else if (mode === "za") copy.sort((a, b) => b.name.localeCompare(a.name));
  else if (mode === "newest")
    copy.sort((a, b) => (b.releaseTimestamp ?? 0) - (a.releaseTimestamp ?? 0));
  else if (mode === "oldest")
    copy.sort((a, b) => (a.releaseTimestamp ?? 0) - (b.releaseTimestamp ?? 0));
  return copy;
}

export function TierlistEditor({
  listId,
  initial,
  lang,
}: {
  listId: string;
  initial: TierlistData;
  lang: UiLang;
}) {
  const t = uiText(lang);
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  // Every game the board knows about, tiered or pooled, keyed by igdb id.
  const gamesById = useMemo(() => {
    const map = new Map<number, TierlistGame>();
    for (const item of initial.items) map.set(item.igdbId, item);
    for (const game of initial.pool) map.set(game.igdbId, game);
    return map;
  }, [initial]);

  const [tiers, setTiers] = useState<TierlistTier[]>(initial.tiers);
  // Ordered igdb ids per zone. Built once from the reconciled initial data.
  const [zones, setZones] = useState<Record<string, number[]>>(() => {
    const next: Record<string, number[]> = { [POOL]: [] };
    for (const tier of initial.tiers) next[tierZone(tier.id)] = [];
    for (const item of initial.items)
      (next[tierZone(item.tierId)] ??= []).push(item.igdbId);
    next[POOL] = initial.pool.map((game) => game.igdbId);
    return next;
  });

  const [drag, setDrag] = useState<Drag>(null);
  const [dropTarget, setDropTarget] = useState<{
    zone: string;
    index: number;
  } | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);

  const [poolQuery, setPoolQuery] = useState("");
  const [editingTier, setEditingTier] = useState<TierlistTier | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markDirty = useCallback(() => {
    setDirty(true);
    setSaved(false);
  }, []);

  // Live references the rAF auto-scroll loop reads without re-subscribing. The
  // drag handlers also set dragRef imperatively so the loop sees a drag the
  // same frame it starts; these effects keep the refs honest afterwards.
  const dragRef = useRef<Drag>(null);
  const tiersRef = useRef(tiers);
  const pointerRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);
  // The tier order at the moment a tier drag began, so live reordering is
  // always derived from a stable base instead of a mutating one (no jitter).
  const baseTiersRef = useRef<TierlistTier[]>([]);

  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);
  useEffect(() => {
    tiersRef.current = tiers;
  }, [tiers]);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // The sticky site header sits over the top of the viewport; sampling a point
  // under it hits the header instead of a tier, which is what made the drop
  // indicator flicker near the top. Every hit test is pushed below it.
  function headerBottom() {
    const header = document.querySelector<HTMLElement>(".content-header");
    return header ? header.getBoundingClientRect().bottom : 0;
  }

  // ── Game drag ────────────────────────────────────────────────────────────
  function gameTargetFromPoint(clientX: number, clientY: number) {
    const sampleY = Math.max(clientY, headerBottom() + 6);
    const zoneEl = document
      .elementFromPoint(clientX, sampleY)
      ?.closest<HTMLElement>("[data-zone]");
    if (!zoneEl) return null;
    const zone = zoneEl.dataset.zone!;
    const covers = [
      ...zoneEl.querySelectorAll<HTMLElement>("[data-cover]"),
    ].filter((cover) => cover.dataset.dragging !== "true");
    if (!covers.length) return { zone, index: 0 };
    // Nearest cover centre wins, then before/after by pointer x, robust when
    // covers wrap onto several rows.
    let best = 0;
    let bestDist = Infinity;
    covers.forEach((cover, index) => {
      const rect = cover.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = (cx - clientX) ** 2 + (cy - clientY) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        const after = clientX > cx;
        best = index + (after ? 1 : 0);
      }
    });
    return { zone, index: best };
  }

  // Re-evaluates the drop for the current pointer position. Called on move and
  // by the auto-scroll loop, so the indicator stays live even when the finger
  // holds still at an edge while the page scrolls under it.
  function applyMove(x: number, y: number) {
    const current = dragRef.current;
    if (!current) return;
    if (current.kind === "game") {
      // Keep the last valid target when the point resolves to nothing (over a
      // gutter or the header) so the indicator never blinks off mid-drag.
      const target = gameTargetFromPoint(x, y);
      if (target) setDropTarget(target);
    } else {
      applyTierOrder(x, Math.max(y, headerBottom() + 6), current.tierId);
    }
  }

  // Tiers reorder live as you drag, the rearrangement itself is the preview,
  // the same way a real tier maker shows it. Derived from the frozen base order
  // so passing a row back and forth never oscillates.
  function applyTierOrder(x: number, y: number, tierId: string) {
    const root = rootRef.current;
    if (!root) return;
    const base = baseTiersRef.current;
    const dragged = base.find((tier) => tier.id === tierId);
    if (!dragged) return;
    const rows = [...root.querySelectorAll<HTMLElement>("[data-tier-row]")];
    let index = 0;
    for (const el of rows) {
      if (el.dataset.tierRow === tierId) continue;
      const rect = el.getBoundingClientRect();
      if (y < rect.top + rect.height / 2) break;
      index += 1;
    }
    const without = base.filter((tier) => tier.id !== tierId);
    const next = [...without.slice(0, index), dragged, ...without.slice(index)];
    const same =
      tiersRef.current.length === next.length &&
      tiersRef.current.every((tier, i) => tier.id === next[i].id);
    if (same) return;
    setTiers(next);
    markDirty();
  }

  function autoScroll() {
    if (!dragRef.current) {
      rafRef.current = 0;
      return;
    }
    const { x, y } = pointerRef.current;
    // The top band starts below the sticky header so the page already scrolls
    // by the time the finger reaches it. Speed ramps quadratically to the edge.
    const EDGE = 150;
    const MAX = 46;
    const height = window.innerHeight;
    const topLine = headerBottom() + EDGE;
    let dy = 0;
    if (y < topLine) {
      const t = Math.min(1, (topLine - y) / EDGE);
      dy = -Math.ceil(t * t * MAX);
    } else if (y > height - EDGE) {
      const t = Math.min(1, (y - (height - EDGE)) / EDGE);
      dy = Math.ceil(t * t * MAX);
    }
    if (dy !== 0) {
      window.scrollBy(0, dy);
      applyMove(x, y);
    }
    rafRef.current = requestAnimationFrame(autoScroll);
  }

  function trackPointer(x: number, y: number) {
    pointerRef.current = { x, y };
    if (!rafRef.current) rafRef.current = requestAnimationFrame(autoScroll);
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!drag) return;
    setGhost({ x: event.clientX, y: event.clientY });
    trackPointer(event.clientX, event.clientY);
    applyMove(event.clientX, event.clientY);
  }

  function moveGame(igdbId: number, from: string, to: string, index: number) {
    setZones((current) => {
      const next = { ...current };
      const source = next[from].filter((id) => id !== igdbId);
      const target = from === to ? source : [...(next[to] ?? [])];
      // Dropping onto its own zone: the index was computed with the card still
      // counted, so clamp against the shortened array.
      const clamped = Math.min(index, target.length);
      target.splice(clamped, 0, igdbId);
      next[from] = source;
      next[to] = target;
      return next;
    });
    markDirty();
  }

  function stopDrag() {
    dragRef.current = null;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    setDrag(null);
    setDropTarget(null);
    setGhost(null);
  }

  function endGameDrag() {
    if (drag?.kind === "game" && dropTarget) {
      moveGame(drag.igdbId, drag.zone, dropTarget.zone, dropTarget.index);
    }
    stopDrag();
  }

  function endTierDrag() {
    // The order is already applied live; nothing to commit here.
    stopDrag();
  }

  function startGameDrag(
    event: React.PointerEvent,
    igdbId: number,
    zone: string,
  ) {
    event.preventDefault();
    rootRef.current?.setPointerCapture(event.pointerId);
    const next: Drag = { kind: "game", igdbId, zone };
    dragRef.current = next;
    setDrag(next);
    setGhost({ x: event.clientX, y: event.clientY });
    trackPointer(event.clientX, event.clientY);
  }

  function startTierDrag(event: React.PointerEvent, tierId: string) {
    event.preventDefault();
    rootRef.current?.setPointerCapture(event.pointerId);
    baseTiersRef.current = tiers;
    const next: Drag = { kind: "tier", tierId };
    dragRef.current = next;
    setDrag(next);
    setGhost({ x: event.clientX, y: event.clientY });
    trackPointer(event.clientX, event.clientY);
  }

  // ── Tier CRUD ──────────────────────────────────────────────────────────
  function addTier() {
    const id = newId();
    const label = String.fromCharCode(65 + (tiers.length % 26)); // A, B, C…
    const color = TIER_COLORS[tiers.length % TIER_COLORS.length];
    setTiers((current) => [
      ...current,
      { id, label, color, position: current.length },
    ]);
    setZones((current) => ({ ...current, [tierZone(id)]: [] }));
    markDirty();
  }

  function deleteTier(tierId: string) {
    // Games in a removed tier are not lost, they go back to the pool.
    setZones((current) => {
      const next = { ...current };
      const stranded = next[tierZone(tierId)] ?? [];
      next[POOL] = [...stranded, ...next[POOL]];
      delete next[tierZone(tierId)];
      return next;
    });
    setTiers((current) => current.filter((tier) => tier.id !== tierId));
    markDirty();
  }

  function saveTierEdit(next: TierlistTier) {
    setTiers((current) =>
      current.map((tier) => (tier.id === next.id ? next : tier)),
    );
    setEditingTier(null);
    markDirty();
  }

  function sortTier(tierId: string, mode: SortMode) {
    setZones((current) => {
      const ids = current[tierZone(tierId)] ?? [];
      const games = ids
        .map((id) => gamesById.get(id))
        .filter((game): game is TierlistGame => Boolean(game));
      return {
        ...current,
        [tierZone(tierId)]: sortGames(games, mode).map((game) => game.igdbId),
      };
    });
    markDirty();
  }

  // ── Save ────────────────────────────────────────────────────────────────
  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    const tierPayload = tiers.map((tier, index) => ({
      id: tier.id,
      label: tier.label,
      color: tier.color,
      position: index,
    }));
    const itemPayload = tiers.flatMap((tier) =>
      (zones[tierZone(tier.id)] ?? []).map((igdbId, index) => {
        const game = gamesById.get(igdbId);
        return {
          tier_id: tier.id,
          igdb_id: igdbId,
          game_slug: game?.slug ?? "",
          position: index,
        };
      }),
    );
    const { error: saveError } = await createClient().rpc("save_tierlist", {
      target_list: listId,
      tiers: tierPayload,
      items: itemPayload,
    });
    if (saveError) {
      setError(
        tri(
          lang,
          "Não foi possível salvar a tierlist.",
          "Could not save the tierlist.",
          "No se pudo guardar la tierlist.",
        ),
      );
      setSaving(false);
      return;
    }
    setDirty(false);
    setSaved(true);
    setSaving(false);
    router.refresh();
  }

  const filteredPool = useMemo(() => {
    const query = poolQuery.trim().toLocaleLowerCase();
    const ids = zones[POOL] ?? [];
    const games = ids
      .map((id) => gamesById.get(id))
      .filter((game): game is TierlistGame => Boolean(game));
    return query
      ? games.filter((game) => game.name.toLocaleLowerCase().includes(query))
      : games;
  }, [zones, gamesById, poolQuery]);

  const draggedGame = drag?.kind === "game" ? gamesById.get(drag.igdbId) : null;
  const draggedTier =
    drag?.kind === "tier"
      ? tiers.find((tier) => tier.id === drag.tierId)
      : null;
  const draggedTierCount = draggedTier
    ? (zones[tierZone(draggedTier.id)] ?? []).length
    : 0;

  // Portaled to the body so the fixed ghost is positioned against the viewport.
  // The route wrapper keeps a residual transform from its enter animation, and
  // a fixed child of a transformed element anchors to that element instead 
  // which is why the ghost drifted from the finger on mobile.
  const ghostNode =
    ghost && (draggedGame || draggedTier) ? (
      <div
        className="tierlist-ghost"
        style={{ left: ghost.x, top: ghost.y }}
        aria-hidden
      >
        {draggedGame ? (
          <span className="tierlist-ghost-cover">
            <SafeImage
              src={draggedGame.coverUrl}
              fallbackSrc={draggedGame.fallbackUrl}
              alt=""
              width={84}
              height={112}
              unoptimized
              draggable={false}
            />
          </span>
        ) : (
          draggedTier && (
            <span
              className="tierlist-ghost-tier"
              style={{
                background: draggedTier.color,
                color: readableInk(draggedTier.color),
              }}
            >
              <b>{draggedTier.label}</b>
              <small>{draggedTierCount}</small>
            </span>
          )
        )}
      </div>
    ) : null;

  return (
    <div
      className="tierlist-editor"
      ref={rootRef}
      data-dragging={drag ? drag.kind : undefined}
      onPointerMove={onPointerMove}
      onPointerUp={() => {
        if (drag?.kind === "game") endGameDrag();
        else if (drag?.kind === "tier") endTierDrag();
      }}
      onPointerCancel={stopDrag}
    >
      <div className="tierlist-editor-bar">
        <p>
          {dirty
            ? tri(
                lang,
                "Alterações não salvas",
                "Unsaved changes",
                "Cambios sin guardar",
              )
            : saved
              ? tri(lang, "Tudo salvo", "All saved", "Todo guardado")
              : tri(
                  lang,
                  "Arraste os jogos para as tiers",
                  "Drag games into the tiers",
                  "Arrastra los juegos a las tiers",
                )}
        </p>
        <button
          type="button"
          className="tierlist-save"
          onClick={() => void save()}
          disabled={!dirty || saving}
        >
          {saving ? (
            <LoaderCircle className="spin" size={14} aria-hidden />
          ) : (
            <Check size={14} aria-hidden />
          )}
          <span>{saving ? t.saving : t.save}</span>
        </button>
      </div>
      {error && (
        <p className="tierlist-editor-error" role="alert">
          {error}
        </p>
      )}

      <div className="tierlist-rows">
        {tiers.map((tier) => {
          const zone = tierZone(tier.id);
          const ids = zones[zone] ?? [];
          const isDropZone = drag?.kind === "game" && dropTarget?.zone === zone;
          return (
            <div
              className="tierlist-edit-row"
              key={tier.id}
              data-tier-row={tier.id}
              data-dragging={
                (drag?.kind === "tier" && drag.tierId === tier.id) || undefined
              }
            >
              <span
                className="tierlist-edit-label"
                style={{
                  background: tier.color,
                  color: readableInk(tier.color),
                }}
              >
                <button
                  type="button"
                  className="tierlist-tier-handle"
                  aria-label={tri(
                    lang,
                    "Mover tier",
                    "Move tier",
                    "Mover tier",
                  )}
                  onPointerDown={(event) => startTierDrag(event, tier.id)}
                  onContextMenu={(event) => event.preventDefault()}
                >
                  <GripVertical size={13} />
                </button>
                <b style={{ fontSize: tierLabelFontSize(tier.label) }}>
                  {tier.label}
                </b>
              </span>
              <div
                className="tierlist-edit-games"
                data-zone={zone}
                data-active={isDropZone || undefined}
              >
                {ids.map((igdbId, index) => {
                  const game = gamesById.get(igdbId);
                  if (!game) return null;
                  const showBefore = isDropZone && dropTarget?.index === index;
                  return (
                    <span
                      key={igdbId}
                      className="tierlist-cover tierlist-cover-drag"
                      data-cover={igdbId}
                      data-dragging={
                        drag?.kind === "game" && drag.igdbId === igdbId
                          ? "true"
                          : undefined
                      }
                      data-drop-before={showBefore || undefined}
                      onPointerDown={(event) =>
                        startGameDrag(event, igdbId, zone)
                      }
                      onContextMenu={(event) => event.preventDefault()}
                    >
                      <SafeImage
                        src={game.coverUrl}
                        fallbackSrc={game.fallbackUrl}
                        alt={game.name}
                        title={game.name}
                        width={84}
                        height={112}
                        unoptimized
                        draggable={false}
                      />
                    </span>
                  );
                })}
                {isDropZone && dropTarget?.index === ids.length && (
                  <span className="tierlist-drop-tail" aria-hidden />
                )}
              </div>
              <div className="tierlist-edit-tools">
                <TierSortMenu tierId={tier.id} onSort={sortTier} lang={lang} />
                <button
                  type="button"
                  aria-label={tri(
                    lang,
                    "Editar tier",
                    "Edit tier",
                    "Editar tier",
                  )}
                  onClick={() => setEditingTier(tier)}
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  data-danger
                  aria-label={tri(
                    lang,
                    "Excluir tier",
                    "Delete tier",
                    "Eliminar tier",
                  )}
                  onClick={() => deleteTier(tier.id)}
                  disabled={tiers.length <= 1}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
        <button type="button" className="tierlist-add-tier" onClick={addTier}>
          <Plus size={14} /> {tri(lang, "Nova tier", "New tier", "Nueva tier")}
        </button>
      </div>

      <div className="tierlist-pool">
        <header>
          <div>
            <Layers3 size={14} aria-hidden />
            <h3>
              {tri(lang, "Sua biblioteca", "Your library", "Tu biblioteca")}
            </h3>
            <small>{filteredPool.length}</small>
          </div>
          <label className="tierlist-pool-search">
            <Search size={14} aria-hidden />
            <input
              value={poolQuery}
              onChange={(event) => setPoolQuery(event.target.value)}
              placeholder={tri(lang, "Filtrar", "Filter", "Filtrar")}
              aria-label={tri(
                lang,
                "Filtrar jogos",
                "Filter games",
                "Filtrar juegos",
              )}
            />
          </label>
        </header>
        <div
          className="tierlist-pool-games"
          data-zone={POOL}
          data-active={
            (drag?.kind === "game" && dropTarget?.zone === POOL) || undefined
          }
        >
          {filteredPool.map((game) => (
            <span
              key={game.igdbId}
              className="tierlist-cover tierlist-cover-drag"
              data-cover={game.igdbId}
              data-dragging={
                drag?.kind === "game" && drag.igdbId === game.igdbId
                  ? "true"
                  : undefined
              }
              onPointerDown={(event) => startGameDrag(event, game.igdbId, POOL)}
              onContextMenu={(event) => event.preventDefault()}
            >
              <SafeImage
                src={game.coverUrl}
                fallbackSrc={game.fallbackUrl}
                alt={game.name}
                title={game.name}
                width={84}
                height={112}
                unoptimized
                draggable={false}
              />
            </span>
          ))}
          {!filteredPool.length && (
            <p className="tierlist-pool-empty">
              {zones[POOL]?.length
                ? tri(
                    lang,
                    "Nada encontrado.",
                    "Nothing found.",
                    "Nada encontrado.",
                  )
                : tri(
                    lang,
                    "Todos os jogos da biblioteca já estão classificados.",
                    "Every library game is ranked.",
                    "Todos los juegos de la biblioteca están clasificados.",
                  )}
            </p>
          )}
        </div>
      </div>

      {ghostNode &&
        typeof document !== "undefined" &&
        createPortal(ghostNode, document.body)}

      {editingTier && (
        <TierEditDialog
          tier={editingTier}
          lang={lang}
          onCancel={() => setEditingTier(null)}
          onSave={saveTierEdit}
        />
      )}
    </div>
  );
}

function TierSortMenu({
  tierId,
  onSort,
  lang,
}: {
  tierId: string;
  onSort: (tierId: string, mode: SortMode) => void;
  lang: UiLang;
}) {
  const options: { mode: SortMode; label: string; icon: typeof ArrowDownAZ }[] =
    [
      { mode: "az", label: "A–Z", icon: ArrowDownAZ },
      { mode: "za", label: "Z–A", icon: ArrowUpAZ },
      {
        mode: "newest",
        label: tri(lang, "Mais novos", "Newest", "Más nuevos"),
        icon: Sparkles,
      },
      {
        mode: "oldest",
        label: tri(lang, "Mais antigos", "Oldest", "Más antiguos"),
        icon: Sparkles,
      },
    ];
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={tri(lang, "Ordenar tier", "Sort tier", "Ordenar tier")}
        >
          <ArrowDownUp size={13} />
        </button>
      </DropdownMenu.Trigger>
      {/* Portaled: the tier row clips its overflow for the rounded label, which
          used to cut this menu in half. */}
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="tierlist-sort-menu"
          align="end"
          sideOffset={6}
          collisionPadding={12}
        >
          {options.map(({ mode, label, icon: Icon }) => (
            <DropdownMenu.Item key={mode} onSelect={() => onSort(tierId, mode)}>
              <Icon size={13} /> {label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function TierEditDialog({
  tier,
  lang,
  onCancel,
  onSave,
}: {
  tier: TierlistTier;
  lang: UiLang;
  onCancel: () => void;
  onSave: (tier: TierlistTier) => void;
}) {
  const t = uiText(lang);
  const [label, setLabel] = useState(tier.label);
  const [color, setColor] = useState(tier.color);
  return (
    <div className="tierlist-dialog-overlay" onClick={onCancel}>
      <div
        className="tierlist-dialog"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h3>{tri(lang, "Editar tier", "Edit tier", "Editar tier")}</h3>
          <button type="button" aria-label={t.close} onClick={onCancel}>
            <X size={17} />
          </button>
        </header>
        <label className="tierlist-dialog-field">
          <span>{tri(lang, "Rótulo", "Label", "Etiqueta")}</span>
          <input
            value={label}
            maxLength={TIER_LABEL_MAX}
            autoFocus
            onChange={(event) => setLabel(event.target.value)}
          />
        </label>
        <span className="tierlist-dialog-swatches">
          {TIER_COLORS.map((preset) => (
            <button
              key={preset}
              type="button"
              style={{ background: preset }}
              data-selected={preset === color || undefined}
              aria-label={preset}
              onClick={() => setColor(preset)}
            />
          ))}
          <label
            className="tierlist-dialog-custom"
            style={{ background: color }}
          >
            <Pencil size={12} style={{ color: readableInk(color) }} />
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
          </label>
        </span>
        <footer>
          <button type="button" onClick={onCancel}>
            {t.cancel}
          </button>
          <button
            type="button"
            className="tierlist-dialog-save"
            disabled={!label.trim()}
            onClick={() =>
              onSave({
                ...tier,
                label: label.trim().slice(0, TIER_LABEL_MAX),
                color,
              })
            }
          >
            {t.save}
          </button>
        </footer>
      </div>
    </div>
  );
}

"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import {
  BookOpen,
  CalendarPlus,
  Check,
  ChevronDown,
  CircleGauge,
  Eye,
  Gamepad2,
  Heart,
  ListPlus,
  Lock,
  Plus,
  RotateCcw,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StarRating } from "@/components/library/star-rating";

type Mode = "review" | "diary" | "list";
type ReviewSection = "review" | "aspects" | "details";
type RatingMode =
  "stars_5" | "level_5" | "score_10" | "score_100" | "recommend";
type Aspect = { id: string; label: string; rating: number; note: string };
type ListOption = { id: string; name: string };

export function GameLogActions({
  game,
  lang,
  lists,
  initialReview,
  logCount,
}: {
  game: { id: number; slug: string; name: string; releaseYear: number | null };
  lang: "pt-BR" | "en";
  lists: ListOption[];
  initialReview: {
    id: string;
    rating: number | null;
    content: string | null;
    contains_spoilers: boolean;
    visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
    title: string | null;
    rating_mode: RatingMode;
    recommended: boolean | null;
    mastered: boolean;
    replay: boolean;
    started_on: string | null;
    finished_on: string | null;
    platform: string | null;
    aspect_ratings: Array<{ label: string; rating: number; note?: string }>;
  } | null;
  logCount: number;
}) {
  const pt = lang === "pt-BR";
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const [open, setOpen] = useState(false);
  const [reviewSection, setReviewSection] = useState<ReviewSection>("review");
  const [rating, setRating] = useState<number | null>(
    initialReview?.rating ?? null,
  );
  const [ratingMode, setRatingMode] = useState<RatingMode>(
    initialReview?.rating_mode ?? "stars_5",
  );
  const [recommended, setRecommended] = useState<boolean | null>(
    initialReview?.recommended ?? null,
  );
  const [pending, setPending] = useState(false);
  const [content, setContent] = useState(initialReview?.content ?? "");
  const [spoilers, setSpoilers] = useState(
    initialReview?.contains_spoilers ?? false,
  );
  const [visibility, setVisibility] = useState(
    initialReview?.visibility ?? "PUBLIC",
  );
  const [diaryVisibility, setDiaryVisibility] = useState<
    "PUBLIC" | "FOLLOWERS" | "PRIVATE"
  >("PUBLIC");
  const [title, setTitle] = useState(initialReview?.title ?? "");
  const [mastered, setMastered] = useState(initialReview?.mastered ?? false);
  const [replay, setReplay] = useState(initialReview?.replay ?? false);
  const [startedOn, setStartedOn] = useState(initialReview?.started_on ?? "");
  const [finishedOn, setFinishedOn] = useState(
    initialReview?.finished_on ?? "",
  );
  const [platform, setPlatform] = useState(initialReview?.platform ?? "");
  const [aspects, setAspects] = useState<Aspect[]>(() =>
    (initialReview?.aspect_ratings ?? []).map((aspect) => ({
      id: crypto.randomUUID(),
      label: aspect.label,
      rating: aspect.rating,
      note: aspect.note ?? "",
    })),
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(formData: FormData) {
    if (!mode || pending) return;
    if (
      mode === "review" &&
      startedOn &&
      finishedOn &&
      finishedOn < startedOn
    ) {
      setError(
        pt
          ? "A data de término não pode vir antes do início."
          : "The finish date cannot be before the start date.",
      );
      setReviewSection("details");
      return;
    }
    setPending(true);
    setError(null);
    setSuccess(null);
    const supabase = createClient();
    let result;
    if (mode === "review") {
      result = await supabase.rpc("save_review", {
        game_id: game.id,
        game_slug: game.slug,
        review_rating: rating,
        review_content: content,
        spoilers,
        review_visibility: visibility,
        review_title: title,
        review_rating_mode: ratingMode,
        review_recommended: ratingMode === "recommend" ? recommended : null,
        review_mastered: mastered,
        review_replay: replay,
        review_started_on: startedOn || null,
        review_finished_on: finishedOn || null,
        review_platform: platform,
        review_aspects: aspects
          .filter(({ label }) => label.trim())
          .map(({ label, rating, note }) => ({
            label: label.trim(),
            rating,
            note: note.trim() || null,
          })),
      });
    } else if (mode === "diary") {
      const minutes = String(formData.get("minutes") ?? "");
      result = await supabase.rpc("save_diary_entry", {
        game_id: game.id,
        game_slug: game.slug,
        entry_date: formData.get("playedOn"),
        entry_minutes: minutes ? Number(minutes) : null,
        entry_note: String(formData.get("note") ?? ""),
        spoilers: formData.get("spoilers") === "on",
        entry_visibility: formData.get("visibility"),
      });
    } else {
      result = await supabase.rpc("add_game_to_list", {
        target_list: formData.get("listId"),
        game_id: game.id,
        game_slug: game.slug,
      });
    }
    if (result.error) {
      setError(
        pt
          ? "Não foi possível salvar. Confira os campos e tente novamente."
          : "Could not save. Check the fields and try again.",
      );
    } else {
      setSuccess(pt ? "Salvo na sua jornada." : "Saved to your journey.");
      if (mode === "review")
        localStorage.removeItem(`uloggd:review-draft:${game.id}`);
      router.refresh();
      window.setTimeout(() => setOpen(false), 420);
    }
    setPending(false);
  }

  async function removeReview() {
    if (!initialReview || pending) return;
    setPending(true);
    setError(null);
    const { data, error: actionError } = await createClient().rpc(
      "delete_review",
      { review_id: initialReview.id },
    );
    if (actionError || data !== true)
      setError(
        pt
          ? "Não foi possível remover a avaliação."
          : "Could not remove the review.",
      );
    else {
      setOpen(false);
      router.refresh();
    }
    setPending(false);
  }

  const labels = {
    review: pt ? "Escrever avaliação" : "Write review",
    diary: pt ? "Registrar sessão" : "Log session",
    list: pt ? "Adicionar à lista" : "Add to list",
  };
  const reviewHasSubstance =
    content.trim().length > 0 ||
    aspects.some(({ label }) => label.trim()) ||
    (ratingMode === "recommend" ? recommended !== null : rating !== null);
  function openMode(nextMode: Mode) {
    setError(null);
    setSuccess(null);
    setMode(nextMode);
    if (nextMode === "review" && !initialReview) {
      const draft = localStorage.getItem(`uloggd:review-draft:${game.id}`);
      if (draft) setContent(draft);
    }
    setConfirmingDelete(false);
    setReviewSection("review");
    setOpen(true);
  }

  return (
    <>
      <div className="game-log-actions">
        <button type="button" onClick={() => openMode("review")}>
          <BookOpen size={15} /> {labels.review}
        </button>
        <button type="button" onClick={() => openMode("diary")}>
          <CalendarPlus size={15} /> {labels.diary}
        </button>
        {logCount > 0 && (
          <Link href={`/${lang}/game/${game.slug}/logs`}>
            {pt ? `Ver registros (${logCount})` : `View logs (${logCount})`}
          </Link>
        )}
        <button type="button" onClick={() => openMode("list")}>
          <ListPlus size={15} /> {labels.list}
        </button>
      </div>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="drawer-backdrop" />
          <Dialog.Content
            className={`social-editor-dialog${mode === "review" ? " review-studio-dialog" : ""}`}
            aria-describedby={undefined}
          >
            <header>
              <div>
                <span>{mode ? labels[mode] : ""}</span>
                <Dialog.Title>{game.name}</Dialog.Title>
              </div>
              {game.releaseYear && <time>{game.releaseYear}</time>}
              <Dialog.Close aria-label={pt ? "Fechar" : "Close"}>
                <X size={19} />
              </Dialog.Close>
            </header>
            {(mode === "review" || mode === "diary") && (
              <nav
                className="game-editor-tabs"
                aria-label={pt ? "Tipo de registro" : "Entry type"}
              >
                <button
                  type="button"
                  data-active={mode === "review" || undefined}
                  onClick={() => setMode("review")}
                >
                  <BookOpen size={16} /> {pt ? "Avaliação" : "Review"}
                </button>
                <button
                  type="button"
                  data-active={mode === "diary" || undefined}
                  onClick={() => setMode("diary")}
                >
                  <CalendarPlus size={16} /> {pt ? "Diário" : "Journal"}
                </button>
              </nav>
            )}
            {mode && (
              <form action={submit} className="social-editor-form">
                {mode === "review" && (
                  <>
                    <nav
                      className="review-section-tabs"
                      aria-label={
                        pt ? "Partes da avaliação" : "Review sections"
                      }
                    >
                      {(
                        [
                          ["review", BookOpen, pt ? "Avaliação" : "Review"],
                          ["aspects", CircleGauge, pt ? "Aspectos" : "Aspects"],
                          ["details", Gamepad2, pt ? "Detalhes" : "Details"],
                        ] as const
                      ).map(([section, Icon, label]) => (
                        <button
                          key={section}
                          type="button"
                          data-active={reviewSection === section || undefined}
                          onClick={() => setReviewSection(section)}
                        >
                          <Icon size={15} />
                          <span>{label}</span>
                          {section === "aspects" && aspects.length > 0 && (
                            <small>{aspects.length}</small>
                          )}
                        </button>
                      ))}
                    </nav>

                    {reviewSection === "review" && (
                      <div
                        className="review-editor-section"
                        data-section="review"
                      >
                        <section className="review-score-stage">
                          <header>
                            <div>
                              <small>
                                {pt ? "SEU JULGAMENTO" : "YOUR VERDICT"}
                              </small>
                              <h3>
                                {pt
                                  ? "Como você quer avaliar?"
                                  : "How do you want to rate it?"}
                              </h3>
                            </div>
                            {rating !== null && ratingMode !== "recommend" && (
                              <button
                                type="button"
                                onClick={() => setRating(null)}
                              >
                                <RotateCcw size={13} />{" "}
                                {pt ? "Limpar" : "Clear"}
                              </button>
                            )}
                          </header>
                          <RatingModeSelect
                            value={ratingMode}
                            onChange={(next) => {
                              setRatingMode(next);
                              setRating(null);
                              setRecommended(null);
                            }}
                            pt={pt}
                          />
                          <RatingInput
                            mode={ratingMode}
                            value={rating}
                            recommended={recommended}
                            onChange={setRating}
                            onRecommend={setRecommended}
                            lang={lang}
                          />
                          <div
                            className="review-verdict-line"
                            data-empty={
                              (rating === null && recommended === null) ||
                              undefined
                            }
                          >
                            <strong>
                              {ratingMode === "recommend"
                                ? recommended === null
                                  ? pt
                                    ? "Escolha uma opção"
                                    : "Choose an option"
                                  : recommended
                                    ? pt
                                      ? "Recomendo"
                                      : "Recommended"
                                    : pt
                                      ? "Não recomendo"
                                      : "Not recommended"
                                : rating === null
                                  ? pt
                                    ? "Sem nota"
                                    : "Not rated"
                                  : formatRatingForMode(
                                      rating,
                                      ratingMode,
                                      lang,
                                    )}
                            </strong>
                            <span>
                              {ratingMode === "recommend"
                                ? pt
                                  ? "Uma recomendação direta para outros jogadores."
                                  : "A direct recommendation for other players."
                                : rating === null
                                  ? pt
                                    ? "Sua avaliação começa vazia e a nota é opcional."
                                    : "Your review starts empty and rating is optional."
                                  : ratingLabel(rating, pt)}
                            </span>
                          </div>
                        </section>

                        <label className="review-title-field">
                          <span>
                            {pt ? "Título" : "Title"}{" "}
                            <small>{title.length}/80</small>
                          </span>
                          <input
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            maxLength={80}
                            placeholder={
                              pt
                                ? "Dê um título à sua experiência (opcional)"
                                : "Give your experience a title (optional)"
                            }
                          />
                        </label>
                        <label className="review-writing-field">
                          <span>
                            <b>{pt ? "Sua avaliação" : "Your review"}</b>
                            <small>
                              {content.length.toLocaleString(lang)} / 5.000
                            </small>
                          </span>
                          <textarea
                            name="content"
                            maxLength={5000}
                            rows={8}
                            value={content}
                            onChange={(event) => {
                              setContent(event.target.value);
                              localStorage.setItem(
                                `uloggd:review-draft:${game.id}`,
                                event.target.value,
                              );
                            }}
                            placeholder={
                              pt
                                ? "O que funcionou? O que não funcionou? O que ficou com você?"
                                : "What worked? What didn't? What stayed with you?"
                            }
                          />
                        </label>
                      </div>
                    )}

                    {reviewSection === "aspects" && (
                      <AspectEditor
                        aspects={aspects}
                        onChange={setAspects}
                        lang={lang}
                      />
                    )}

                    {reviewSection === "details" && (
                      <div
                        className="review-editor-section review-details-section"
                        data-section="details"
                      >
                        <div className="review-achievement-toggles">
                          <button
                            type="button"
                            aria-pressed={mastered}
                            onClick={() => setMastered((value) => !value)}
                          >
                            <Trophy size={18} />
                            <span>
                              <strong>{pt ? "Dominei" : "Mastered"}</strong>
                              <small>
                                {pt
                                  ? "Completei tudo que importava para mim"
                                  : "Completed everything that mattered to me"}
                              </small>
                            </span>
                          </button>
                          <button
                            type="button"
                            aria-pressed={replay}
                            onClick={() => setReplay((value) => !value)}
                          >
                            <RotateCcw size={18} />
                            <span>
                              <strong>{pt ? "Rejogada" : "Replay"}</strong>
                              <small>
                                {pt
                                  ? "Esta não foi minha primeira jornada"
                                  : "This was not my first journey"}
                              </small>
                            </span>
                          </button>
                        </div>
                        <label>
                          <span>
                            {pt ? "Plataforma jogada" : "Platform played"}
                          </span>
                          <input
                            value={platform}
                            onChange={(event) =>
                              setPlatform(event.target.value)
                            }
                            maxLength={80}
                            placeholder={
                              pt
                                ? "Ex.: PC, PlayStation 5, Switch"
                                : "E.g. PC, PlayStation 5, Switch"
                            }
                          />
                        </label>
                        <div className="social-form-row review-date-fields">
                          <label>
                            <span>{pt ? "Comecei em" : "Started on"}</span>
                            <input
                              type="date"
                              value={startedOn}
                              max={new Date().toISOString().slice(0, 10)}
                              onChange={(event) =>
                                setStartedOn(event.target.value)
                              }
                            />
                          </label>
                          <label>
                            <span>{pt ? "Terminei em" : "Finished on"}</span>
                            <input
                              type="date"
                              value={finishedOn}
                              min={startedOn || undefined}
                              max={new Date().toISOString().slice(0, 10)}
                              onChange={(event) =>
                                setFinishedOn(event.target.value)
                              }
                            />
                          </label>
                        </div>
                        <div className="review-publishing-options">
                          <label>
                            <span>{pt ? "Visibilidade" : "Visibility"}</span>
                            <EditorVisibilitySelect
                              value={visibility}
                              onChange={setVisibility}
                              pt={pt}
                            />
                          </label>
                          <label className="review-spoiler-toggle">
                            <input
                              type="checkbox"
                              checked={spoilers}
                              onChange={(event) =>
                                setSpoilers(event.target.checked)
                              }
                            />
                            <span aria-hidden="true" />
                            <p>
                              <strong>
                                {pt ? "Contém spoilers" : "Contains spoilers"}
                              </strong>
                              <small>
                                {pt
                                  ? "O texto ficará protegido até o leitor revelar."
                                  : "The text stays hidden until the reader reveals it."}
                              </small>
                            </p>
                          </label>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {mode === "diary" && (
                  <>
                    <div className="social-form-row">
                      <label>
                        <span>{pt ? "Data" : "Date"}</span>
                        <input
                          name="playedOn"
                          type="date"
                          max={new Date().toISOString().slice(0, 10)}
                          defaultValue={new Date().toISOString().slice(0, 10)}
                          required
                        />
                      </label>
                      <label>
                        <span>{pt ? "Minutos jogados" : "Minutes played"}</span>
                        <input
                          name="minutes"
                          type="number"
                          min={0}
                          max={100000}
                          inputMode="numeric"
                        />
                      </label>
                    </div>
                    <label>
                      <span>{pt ? "Nota da sessão" : "Session note"}</span>
                      <textarea
                        name="note"
                        maxLength={1000}
                        rows={6}
                        placeholder={
                          pt
                            ? "Registre onde parou ou como foi a sessão."
                            : "Note where you stopped or how the session went."
                        }
                      />
                    </label>
                  </>
                )}
                {mode === "list" &&
                  (lists.length ? (
                    <label>
                      <span>{pt ? "Lista" : "List"}</span>
                      <select name="listId" required>
                        {lists.map((list) => (
                          <option value={list.id} key={list.id}>
                            {list.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <p className="social-empty-inline">
                      {pt
                        ? "Crie uma lista primeiro na página de listas."
                        : "Create a list on the lists page first."}
                    </p>
                  ))}
                {mode === "diary" && (
                  <div
                    key={mode}
                    className="social-form-row social-form-options"
                  >
                    <label>
                      <span>{pt ? "Visibilidade" : "Visibility"}</span>
                      <EditorVisibilitySelect
                        value={diaryVisibility}
                        onChange={setDiaryVisibility}
                        pt={pt}
                      />
                    </label>
                    <label className="social-check">
                      <input type="checkbox" name="spoilers" />{" "}
                      <span>
                        {pt ? "Contém spoilers" : "Contains spoilers"}
                      </span>
                    </label>
                  </div>
                )}
                {error && (
                  <p className="social-form-error" role="alert">
                    {error}
                  </p>
                )}
                {success && (
                  <p className="social-form-success" role="status">
                    {success}
                  </p>
                )}
                <footer>
                  {mode === "review" &&
                    initialReview &&
                    (confirmingDelete ? (
                      <div className="review-delete-confirm">
                        <span>
                          {pt ? "Remover de vez?" : "Delete permanently?"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setConfirmingDelete(false)}
                        >
                          {pt ? "Não" : "No"}
                        </button>
                        <button
                          type="button"
                          onClick={removeReview}
                          disabled={pending}
                        >
                          {pt ? "Sim, remover" : "Yes, delete"}
                        </button>
                      </div>
                    ) : (
                      <button
                        className="social-delete-button"
                        type="button"
                        onClick={() => setConfirmingDelete(true)}
                        disabled={pending}
                      >
                        <Trash2 size={14} /> {pt ? "Remover" : "Remove"}
                      </button>
                    ))}
                  <Dialog.Close type="button">
                    {pt ? "Cancelar" : "Cancel"}
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={
                      pending ||
                      (mode === "list" && !lists.length) ||
                      (mode === "review" && !reviewHasSubstance)
                    }
                  >
                    {pending
                      ? pt
                        ? "Salvando…"
                        : "Saving…"
                      : pt
                        ? "Salvar"
                        : "Save"}
                  </button>
                </footer>
              </form>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function ratingLabel(rating: number, pt: boolean) {
  if (rating >= 90) return pt ? "Excepcional" : "Exceptional";
  if (rating >= 80) return pt ? "Ótimo" : "Great";
  if (rating >= 70) return pt ? "Muito bom" : "Very good";
  if (rating >= 60) return pt ? "Bom" : "Good";
  if (rating >= 40) return pt ? "Regular" : "Mixed";
  return pt ? "Não funcionou para mim" : "Not for me";
}

const ratingModes: Array<{ value: RatingMode; pt: string; en: string }> = [
  { value: "stars_5", pt: "Estrelas · 0,5 a 5", en: "Stars · 0.5 to 5" },
  { value: "level_5", pt: "Níveis · 1 a 5", en: "Levels · 1 to 5" },
  { value: "score_10", pt: "Pontos · 0 a 10", en: "Score · 0 to 10" },
  { value: "score_100", pt: "Precisão · 0 a 100", en: "Precision · 0 to 100" },
  {
    value: "recommend",
    pt: "Recomendo / não recomendo",
    en: "Recommend / don't recommend",
  },
];

function formatRatingForMode(
  rating: number,
  mode: RatingMode,
  lang: "pt-BR" | "en",
) {
  if (mode === "stars_5")
    return `${(rating / 20).toLocaleString(lang, { maximumFractionDigits: 1 })} / 5`;
  if (mode === "level_5") return `${Math.round(rating / 20)} / 5`;
  if (mode === "score_10")
    return `${(rating / 10).toLocaleString(lang, { maximumFractionDigits: 1 })} / 10`;
  return `${rating} / 100`;
}

function RatingModeSelect({
  value,
  onChange,
  pt,
}: {
  value: RatingMode;
  onChange: (value: RatingMode) => void;
  pt: boolean;
}) {
  return (
    <Select.Root
      value={value}
      onValueChange={(next) => onChange(next as RatingMode)}
    >
      <Select.Trigger
        className="review-mode-trigger"
        aria-label={pt ? "Forma de avaliar" : "Rating method"}
      >
        <Select.Value />
        <Select.Icon>
          <ChevronDown size={14} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="editor-select-menu review-mode-menu"
          position="popper"
          sideOffset={6}
          collisionPadding={12}
        >
          <Select.Viewport>
            {ratingModes.map((mode) => (
              <Select.Item
                className="editor-select-option"
                value={mode.value}
                key={mode.value}
              >
                <CircleGauge size={14} />
                <Select.ItemText>{pt ? mode.pt : mode.en}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check size={13} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function RatingInput({
  mode,
  value,
  recommended,
  onChange,
  onRecommend,
  lang,
}: {
  mode: RatingMode;
  value: number | null;
  recommended: boolean | null;
  onChange: (value: number | null) => void;
  onRecommend: (value: boolean) => void;
  lang: "pt-BR" | "en";
}) {
  const pt = lang === "pt-BR";
  if (mode === "stars_5")
    return <StarRating value={value} onChange={onChange} lang={lang} />;
  if (mode === "recommend") {
    return (
      <div className="review-recommend-control">
        <button
          type="button"
          aria-pressed={recommended === true}
          onClick={() => {
            onRecommend(true);
            onChange(100);
          }}
        >
          <Heart size={17} /> {pt ? "Recomendo" : "Recommend"}
        </button>
        <button
          type="button"
          aria-pressed={recommended === false}
          onClick={() => {
            onRecommend(false);
            onChange(0);
          }}
        >
          <X size={17} /> {pt ? "Não recomendo" : "Don't recommend"}
        </button>
      </div>
    );
  }
  const step = mode === "score_100" ? 1 : mode === "score_10" ? 10 : 20;
  const max = mode === "score_100" ? 100 : mode === "score_10" ? 10 : 5;
  const display =
    value === null
      ? "—"
      : mode === "score_100"
        ? value
        : mode === "score_10"
          ? value / 10
          : Math.round(value / 20);
  return (
    <div className="review-range-control">
      <output>
        {display}
        <small>/{max}</small>
      </output>
      <input
        type="range"
        min={mode === "level_5" ? 20 : 0}
        max={100}
        step={step}
        value={value ?? (mode === "level_5" ? 20 : 0)}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={pt ? "Nota" : "Rating"}
      />
      <div>
        <span>{mode === "level_5" ? "1" : "0"}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

const aspectPresets = {
  "pt-BR": [
    "Gameplay",
    "Narrativa",
    "Visual",
    "Áudio",
    "Performance",
    "Conteúdo",
  ],
  en: ["Gameplay", "Narrative", "Visuals", "Audio", "Performance", "Content"],
};

function AspectEditor({
  aspects,
  onChange,
  lang,
}: {
  aspects: Aspect[];
  onChange: (aspects: Aspect[]) => void;
  lang: "pt-BR" | "en";
}) {
  const pt = lang === "pt-BR";
  const available = aspectPresets[lang].filter(
    (label) => !aspects.some((aspect) => aspect.label === label),
  );
  function add(label: string) {
    if (aspects.length >= 8) return;
    onChange([
      ...aspects,
      { id: crypto.randomUUID(), label, rating: 50, note: "" },
    ]);
  }
  function update(id: string, patch: Partial<Aspect>) {
    onChange(
      aspects.map((aspect) =>
        aspect.id === id ? { ...aspect, ...patch } : aspect,
      ),
    );
  }
  return (
    <div
      className="review-editor-section review-aspects-section"
      data-section="aspects"
    >
      <header>
        <div>
          <small>{pt ? "LEITURA EM CAMADAS" : "LAYERED VERDICT"}</small>
          <h3>
            {pt
              ? "O que definiu sua experiência?"
              : "What defined your experience?"}
          </h3>
          <p>
            {pt
              ? "Avalie só o que importa. Os aspectos não alteram sua nota geral."
              : "Rate only what matters. Aspects do not change your overall score."}
          </p>
        </div>
        <span>{aspects.length}/8</span>
      </header>
      {available.length > 0 && aspects.length < 8 && (
        <div className="review-aspect-presets">
          {available.map((label) => (
            <button type="button" key={label} onClick={() => add(label)}>
              <Plus size={13} /> {label}
            </button>
          ))}
        </div>
      )}
      {aspects.length === 0 ? (
        <div className="review-aspects-empty">
          <CircleGauge size={21} />
          <strong>
            {pt ? "Nenhum aspecto adicionado" : "No aspects added"}
          </strong>
          <p>
            {pt
              ? "Escolha uma categoria acima para detalhar seu julgamento."
              : "Choose a category above to detail your verdict."}
          </p>
        </div>
      ) : (
        <div className="review-aspect-list">
          {aspects.map((aspect) => (
            <article key={aspect.id}>
              <header>
                <input
                  value={aspect.label}
                  onChange={(event) =>
                    update(aspect.id, {
                      label: event.target.value.slice(0, 32),
                    })
                  }
                  aria-label={pt ? "Nome do aspecto" : "Aspect name"}
                />
                <output>{aspect.rating}</output>
                <button
                  type="button"
                  onClick={() =>
                    onChange(aspects.filter((item) => item.id !== aspect.id))
                  }
                  aria-label={
                    pt ? `Remover ${aspect.label}` : `Remove ${aspect.label}`
                  }
                >
                  <X size={15} />
                </button>
              </header>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={aspect.rating}
                onChange={(event) =>
                  update(aspect.id, { rating: Number(event.target.value) })
                }
                aria-label={
                  pt ? `Nota de ${aspect.label}` : `${aspect.label} rating`
                }
              />
              <textarea
                value={aspect.note}
                maxLength={240}
                rows={2}
                onChange={(event) =>
                  update(aspect.id, { note: event.target.value })
                }
                placeholder={
                  pt
                    ? "Uma observação curta sobre este aspecto (opcional)"
                    : "A short note about this aspect (optional)"
                }
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function EditorVisibilitySelect({
  value,
  onChange,
  pt,
}: {
  value: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
  onChange?: (value: "PUBLIC" | "FOLLOWERS" | "PRIVATE") => void;
  pt: boolean;
}) {
  const options = [
    { value: "PUBLIC" as const, label: pt ? "Público" : "Public", icon: Eye },
    {
      value: "FOLLOWERS" as const,
      label: pt ? "Seguidores" : "Followers",
      icon: Users,
    },
    {
      value: "PRIVATE" as const,
      label: pt ? "Privado" : "Private",
      icon: Lock,
    },
  ];
  return (
    <Select.Root
      name="visibility"
      value={value}
      onValueChange={(next) => onChange?.(next as typeof value)}
    >
      <Select.Trigger className="editor-select-trigger">
        <Select.Value />
        <Select.Icon>
          <ChevronDown size={14} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="editor-select-menu"
          position="popper"
          sideOffset={6}
          collisionPadding={12}
        >
          <Select.Viewport>
            {options.map(({ value: option, label, icon: Icon }) => (
              <Select.Item
                className="editor-select-option"
                key={option}
                value={option}
              >
                <Icon size={14} />
                <Select.ItemText>{label}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check size={13} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

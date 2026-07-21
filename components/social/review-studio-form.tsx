"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@/components/ui/select";
import {
  BookOpen,
  Check,
  ChevronDown,
  CircleGauge,
  Eye,
  Gamepad2,
  Heart,
  LoaderCircle,
  Lock,
  Map,
  Plus,
  RotateCcw,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { StarRating } from "@/components/library/star-rating";
import type { JourneyOption } from "@/components/social/journey-calendar";
import { uiText, type UiLang } from "@/lib/ui-text";

export type ReviewRatingMode =
  "stars_5" | "level_5" | "score_10" | "score_100" | "recommend";
export type ReviewVisibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";
export type ReviewAspect = {
  id: string;
  label: string;
  rating: number;
  note: string;
  custom?: boolean;
};
type ReviewSection = "review" | "aspects" | "details";

export type ReviewFormInitial = {
  rating: number | null;
  ratingMode: ReviewRatingMode;
  recommended: boolean | null;
  content: string;
  spoilers: boolean;
  visibility: ReviewVisibility;
  title: string;
  mastered: boolean;
  replay: boolean;
  startedOn: string;
  finishedOn: string;
  platform: string;
  aspects: ReviewAspect[];
  journeyId?: string | null;
};

export type ReviewRpcFields = {
  review_rating: number | null;
  review_content: string;
  spoilers: boolean;
  review_visibility: ReviewVisibility;
  review_title: string;
  review_rating_mode: ReviewRatingMode;
  review_recommended: boolean | null;
  review_mastered: boolean;
  review_replay: boolean;
  review_started_on: string | null;
  review_finished_on: string | null;
  review_platform: string;
  review_journey: string | null;
  review_aspects: Array<{
    label: string;
    rating: number;
    note: string | null;
    custom: boolean;
  }>;
};

export function ReviewStudioForm({
  lang,
  platforms,
  journeyOptions = [],
  initial,
  draftKey,
  submitLabel,
  busyLabel,
  successLabel,
  onPerform,
}: {
  lang: UiLang;
  platforms: string[];
  journeyOptions?: JourneyOption[];
  initial?: ReviewFormInitial;
  draftKey?: string;
  submitLabel: string;
  busyLabel: string;
  successLabel: string;
  onPerform: (fields: ReviewRpcFields) => Promise<boolean>;
}) {
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  const [reviewSection, setReviewSection] = useState<ReviewSection>("review");
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null);
  const [ratingMode, setRatingMode] = useState<ReviewRatingMode>(
    initial?.ratingMode ?? "stars_5",
  );
  const [recommended, setRecommended] = useState<boolean | null>(
    initial?.recommended ?? null,
  );
  const [pending, setPending] = useState(false);
  const [content, setContent] = useState(
    () =>
      initial?.content ??
      (draftKey ? (localStorage.getItem(draftKey) ?? "") : ""),
  );
  const [spoilers, setSpoilers] = useState(initial?.spoilers ?? false);
  const [visibility, setVisibility] = useState<ReviewVisibility>(
    initial?.visibility ?? "PUBLIC",
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [mastered, setMastered] = useState(initial?.mastered ?? false);
  const [replay, setReplay] = useState(initial?.replay ?? false);
  const [startedOn, setStartedOn] = useState(initial?.startedOn ?? "");
  const [finishedOn, setFinishedOn] = useState(initial?.finishedOn ?? "");
  const [platform, setPlatform] = useState(initial?.platform ?? "");
  const [journeyId, setJourneyId] = useState<string | null>(
    initial?.journeyId ?? null,
  );
  const [aspects, setAspects] = useState<ReviewAspect[]>(
    initial?.aspects ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reviewHasSubstance =
    content.trim().length > 0 ||
    aspects.some(({ label }) => label.trim()) ||
    (ratingMode === "recommend" ? recommended !== null : rating !== null);

  async function submit() {
    if (pending) return;
    if (startedOn && finishedOn && finishedOn < startedOn) {
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
    const saved = await onPerform({
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
      review_journey: journeyId,
      review_aspects: aspects
        .filter(({ label }) => label.trim())
        .map(({ label, rating, note, custom }) => ({
          label: label.trim(),
          rating,
          note: note.trim() || null,
          custom: Boolean(custom),
        })),
    });
    if (saved) {
      setSuccess(successLabel);
      if (draftKey) localStorage.removeItem(draftKey);
    } else {
      setError(
        pt
          ? "Não foi possível salvar. Confira os campos e tente novamente."
          : "Could not save. Check the fields and try again.",
      );
    }
    setPending(false);
  }

  return (
    <form
      className="social-editor-form"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <nav
        className="review-section-tabs"
        role="tablist"
        aria-label={pt ? "Partes da avaliação" : "Review sections"}
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
            role="tab"
            id={`review-tab-${section}`}
            aria-controls={`review-panel-${section}`}
            aria-selected={reviewSection === section}
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
          id="review-panel-review"
          role="tabpanel"
          aria-labelledby="review-tab-review"
          data-section="review"
        >
          <section className="review-score-stage">
            <header>
              <div>
                <small>{pt ? "SEU JULGAMENTO" : "YOUR VERDICT"}</small>
                <h3>
                  {pt
                    ? "Como você quer avaliar?"
                    : "How do you want to rate it?"}
                </h3>
              </div>
              {rating !== null && ratingMode !== "recommend" && (
                <button type="button" onClick={() => setRating(null)}>
                  <RotateCcw size={13} /> {t.clear}
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
                (rating === null && recommended === null) || undefined
              }
            >
              <strong>
                {ratingMode === "recommend"
                  ? recommended === null
                    ? pt
                      ? "Escolha uma opção"
                      : "Choose an option"
                    : recommended
                      ? t.recommended
                      : t.notRecommended
                  : rating === null
                    ? pt
                      ? "Sem nota"
                      : "Not rated"
                    : formatRatingForMode(rating, ratingMode, lang)}
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
              {pt ? "Título" : "Title"} <small>{title.length}/80</small>
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
              <small>{content.length.toLocaleString(lang)} / 5.000</small>
            </span>
            <textarea
              name="content"
              maxLength={5000}
              rows={8}
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                if (draftKey)
                  localStorage.setItem(draftKey, event.target.value);
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
        <AspectEditor aspects={aspects} onChange={setAspects} lang={lang} />
      )}

      {reviewSection === "details" && (
        <div
          className="review-editor-section review-details-section"
          id="review-panel-details"
          role="tabpanel"
          aria-labelledby="review-tab-details"
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
                <strong>{t.replay}</strong>
                <small>
                  {pt
                    ? "Esta não foi minha primeira jornada"
                    : "This was not my first journey"}
                </small>
              </span>
            </button>
          </div>
          <label>
            <span>{pt ? "Plataforma jogada" : "Platform played"}</span>
            <PlatformSelect
              value={platform}
              onChange={setPlatform}
              platforms={platforms}
              pt={pt}
            />
          </label>
          {journeyOptions.length > 0 && (
            <label>
              <span>{pt ? "Jornada ligada" : "Linked journey"}</span>
              <JourneySelect
                value={journeyId}
                onChange={setJourneyId}
                options={journeyOptions}
                pt={pt}
              />
            </label>
          )}
          <div className="social-form-row review-date-fields">
            <label>
              <span>{pt ? "Comecei em" : "Started on"}</span>
              <input
                type="date"
                value={startedOn}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setStartedOn(event.target.value)}
              />
            </label>
            <label>
              <span>{pt ? "Terminei em" : "Finished on"}</span>
              <input
                type="date"
                value={finishedOn}
                min={startedOn || undefined}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setFinishedOn(event.target.value)}
              />
            </label>
          </div>
          <div className="review-publishing-options">
            <label>
              <span>{t.visibility}</span>
              <EditorVisibilitySelect
                value={visibility}
                onChange={setVisibility}
                lang={lang}
              />
            </label>
            <label className="review-spoiler-toggle">
              <input
                type="checkbox"
                checked={spoilers}
                onChange={(event) => setSpoilers(event.target.checked)}
              />
              <span aria-hidden="true" />
              <p>
                <strong>{t.containsSpoilers}</strong>
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
      <footer className="review-action-bar">
        <span className="review-action-status" aria-live="polite">
          {success || ""}
        </span>
        <Dialog.Close type="button" disabled={pending}>
          {t.cancel}
        </Dialog.Close>
        <button
          type="submit"
          aria-busy={pending}
          data-loading={pending || undefined}
          disabled={pending || !reviewHasSubstance}
        >
          {pending && <LoaderCircle className="spin" size={15} aria-hidden />}
          {pending ? busyLabel : submitLabel}
        </button>
      </footer>
    </form>
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

const ratingModes: Array<{ value: ReviewRatingMode; pt: string; en: string }> =
  [
    { value: "stars_5", pt: "Estrelas · 0,5 a 5", en: "Stars · 0.5 to 5" },
    { value: "level_5", pt: "Níveis · 1 a 5", en: "Levels · 1 to 5" },
    { value: "score_10", pt: "Pontos · 0 a 10", en: "Score · 0 to 10" },
    {
      value: "score_100",
      pt: "Precisão · 0 a 100",
      en: "Precision · 0 to 100",
    },
    {
      value: "recommend",
      pt: "Recomendo / não recomendo",
      en: "Recommend / don't recommend",
    },
  ];

function formatRatingForMode(
  rating: number,
  mode: ReviewRatingMode,
  lang: UiLang,
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
  value: ReviewRatingMode;
  onChange: (value: ReviewRatingMode) => void;
  pt: boolean;
}) {
  return (
    <Select.Root
      value={value}
      onValueChange={(next) => onChange(next as ReviewRatingMode)}
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

function PlatformSelect({
  value,
  onChange,
  platforms,
  pt,
}: {
  value: string;
  onChange: (value: string) => void;
  platforms: string[];
  pt: boolean;
}) {
  const options = Array.from(new Set(platforms.filter(Boolean)));
  return (
    <Select.Root value={value || undefined} onValueChange={onChange}>
      <Select.Trigger className="editor-select-trigger review-platform-trigger">
        <Select.Value
          placeholder={pt ? "Selecione uma plataforma" : "Select a platform"}
        />
        <Select.Icon>
          <ChevronDown size={14} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="editor-select-menu review-platform-menu"
          position="popper"
          sideOffset={6}
          collisionPadding={12}
        >
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item
                className="editor-select-option"
                value={option}
                key={option}
              >
                <Gamepad2 size={14} />
                <Select.ItemText>{option}</Select.ItemText>
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

function JourneySelect({
  value,
  onChange,
  options,
  pt,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  options: JourneyOption[];
  pt: boolean;
}) {
  return (
    <Select.Root
      value={value ?? "none"}
      onValueChange={(next) => onChange(next === "none" ? null : next)}
    >
      <Select.Trigger className="editor-select-trigger review-journey-trigger">
        <Select.Value />
        <Select.Icon>
          <ChevronDown size={14} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="editor-select-menu review-journey-menu"
          position="popper"
          sideOffset={6}
          collisionPadding={12}
        >
          <Select.Viewport>
            <Select.Item className="editor-select-option" value="none">
              <X size={14} />
              <Select.ItemText>{pt ? "Nenhuma" : "None"}</Select.ItemText>
              <Select.ItemIndicator>
                <Check size={13} />
              </Select.ItemIndicator>
            </Select.Item>
            {options.map((option) => (
              <Select.Item
                className="editor-select-option"
                value={option.id}
                key={option.id}
              >
                <Map size={14} />
                <Select.ItemText>{option.title}</Select.ItemText>
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
  mode: ReviewRatingMode;
  value: number | null;
  recommended: boolean | null;
  onChange: (value: number | null) => void;
  onRecommend: (value: boolean) => void;
  lang: UiLang;
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

const aspectPresets: Record<UiLang, string[]> = {
  "pt-BR": [
    "Gameplay",
    "Narrativa",
    "Visual",
    "Áudio",
    "Performance",
    "Conteúdo",
  ],
  en: ["Gameplay", "Narrative", "Visuals", "Audio", "Performance", "Content"],
  es: [
    "Jugabilidad",
    "Narrativa",
    "Visuales",
    "Audio",
    "Rendimiento",
    "Contenido",
  ],
};

function AspectEditor({
  aspects,
  onChange,
  lang,
}: {
  aspects: ReviewAspect[];
  onChange: (aspects: ReviewAspect[]) => void;
  lang: UiLang;
}) {
  const pt = lang === "pt-BR";
  const available = aspectPresets[lang].filter(
    (label) => !aspects.some((aspect) => aspect.label === label),
  );
  const customCount = aspects.filter((aspect) => aspect.custom).length;
  function add(label: string, custom = false) {
    if (aspects.length >= 8) return;
    onChange([
      ...aspects,
      { id: crypto.randomUUID(), label, rating: 50, note: "", custom },
    ]);
  }
  function update(id: string, patch: Partial<ReviewAspect>) {
    onChange(
      aspects.map((aspect) =>
        aspect.id === id ? { ...aspect, ...patch } : aspect,
      ),
    );
  }
  return (
    <div
      className="review-editor-section review-aspects-section"
      id="review-panel-aspects"
      role="tabpanel"
      aria-labelledby="review-tab-aspects"
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
      {aspects.length < 8 && (
        <div className="review-aspect-presets">
          {available.map((label) => (
            <button type="button" key={label} onClick={() => add(label)}>
              <Plus size={13} /> {label}
            </button>
          ))}
          {customCount < 5 && (
            <button
              type="button"
              data-custom
              onClick={() => add(pt ? "Novo aspecto" : "Custom aspect", true)}
            >
              <Plus size={13} />{" "}
              {pt ? "Aspecto personalizado" : "Custom aspect"}
              <small>{customCount}/5</small>
            </button>
          )}
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

export function EditorVisibilitySelect({
  value,
  onChange,
  lang,
}: {
  value: ReviewVisibility;
  onChange?: (value: ReviewVisibility) => void;
  lang: UiLang;
}) {
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  const options = [
    { value: "PUBLIC" as const, label: pt ? "Público" : "Public", icon: Eye },
    {
      value: "FOLLOWERS" as const,
      label: t.followers,
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

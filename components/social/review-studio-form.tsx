"use client";

import { Switch } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";

import * as Dialog from "@/components/ui/dialog";
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
import { useEffect, useState } from "react";
import { StarRating } from "@/components/library/star-rating";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";
import type { JourneyOption } from "@/components/social/journey-calendar";
import {
  CommunityScopeSelect,
  type CommunityScope,
} from "./community-scope-select";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { useLocalToday } from "@/components/use-local-today";

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
  commentsScope?: CommunityScope;
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
  onPerform: (
    fields: ReviewRpcFields,
    commentsScope: CommunityScope,
  ) => Promise<boolean>;
}) {
  const t = uiText(lang);
  const today = useLocalToday();
  const [reviewSection, setReviewSection] = useState<ReviewSection>("review");
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null);
  const [ratingMode, setRatingMode] = useState<ReviewRatingMode>(
    initial?.ratingMode ?? "stars_5",
  );
  const [recommended, setRecommended] = useState<boolean | null>(
    initial?.recommended ?? null,
  );
  const [pending, setPending] = useState(false);
  const [content, setContent] = useState(initial?.content ?? "");
  const [spoilers, setSpoilers] = useState(initial?.spoilers ?? false);
  const [commentsScope, setCommentsScope] = useState<CommunityScope>(
    initial?.commentsScope ?? "EVERYONE",
  );
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

  useEffect(() => {
    if (!draftKey || initial?.content) return;
    const frame = requestAnimationFrame(() => {
      setContent(localStorage.getItem(draftKey) ?? "");
    });
    return () => cancelAnimationFrame(frame);
  }, [draftKey, initial?.content]);

  const reviewHasSubstance =
    content.trim().length > 0 ||
    aspects.some(({ label }) => label.trim()) ||
    (ratingMode === "recommend" ? recommended !== null : rating !== null);

  async function submit() {
    if (pending) return;
    if (startedOn && finishedOn && finishedOn < startedOn) {
      setError(
        tri(
          lang,
          "A data de término não pode vir antes do início.",
          "The finish date cannot be before the start date.",
          "La fecha de fin no puede ser anterior a la de inicio.",
        ),
      );
      setReviewSection("details");
      return;
    }
    setPending(true);
    setError(null);
    setSuccess(null);
    const saved = await onPerform(
      {
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
      },
      commentsScope,
    );
    if (saved) {
      setSuccess(successLabel);
      if (draftKey) localStorage.removeItem(draftKey);
    } else {
      setError(
        tri(
          lang,
          "Não foi possível salvar. Confira os campos e tente novamente.",
          "Could not save. Check the fields and try again.",
          "No se pudo guardar. Revisa los campos e inténtalo de nuevo.",
        ),
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
        aria-label={tri(
          lang,
          "Partes da avaliação",
          "Review sections",
          "Partes de la reseña",
        )}
      >
        {(
          [
            ["review", BookOpen, tri(lang, "Avaliação", "Review", "Reseña")],
            [
              "aspects",
              CircleGauge,
              tri(lang, "Aspectos", "Aspects", "Aspectos"),
            ],
            ["details", Gamepad2, tri(lang, "Detalhes", "Details", "Detalles")],
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
                <h3>
                  {tri(
                    lang,
                    "Como você quer avaliar?",
                    "How do you want to rate it?",
                    "¿Cómo quieres valorarlo?",
                  )}
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
              lang={lang}
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
                    ? tri(
                        lang,
                        "Escolha uma opção",
                        "Choose an option",
                        "Elige una opción",
                      )
                    : recommended
                      ? t.recommended
                      : t.notRecommended
                  : rating === null
                    ? tri(lang, "Sem nota", "Not rated", "Sin nota")
                    : formatRatingForMode(rating, ratingMode, lang)}
              </strong>
              <span>
                {ratingMode === "recommend"
                  ? tri(
                      lang,
                      "Uma recomendação direta para outros jogadores.",
                      "A direct recommendation for other players.",
                      "Una recomendación directa para otros jugadores.",
                    )
                  : rating === null
                    ? tri(
                        lang,
                        "Sua avaliação começa vazia e a nota é opcional.",
                        "Your review starts empty and rating is optional.",
                        "Tu reseña empieza vacía y la nota es opcional.",
                      )
                    : ratingLabel(rating, lang)}
              </span>
            </div>
          </section>

          <label className="review-title-field">
            <span>
              {tri(lang, "Título", "Title", "Encabezado")}{" "}
              <small>{title.length}/80</small>
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={80}
              placeholder={tri(
                lang,
                "Dê um título à sua experiência (opcional)",
                "Give your experience a title (optional)",
                "Ponle un título a tu experiencia (opcional)",
              )}
            />
          </label>
          <div className="review-writing-field">
            <header>
              <b>
                {tri(lang, "Sua avaliação", "Your review", "Tu valoración")}
              </b>
              <small>
                {tri(
                  lang,
                  "Markdown básico · menções e spoilers",
                  "Basic Markdown · mentions and spoilers",
                  "Markdown básico · menciones y spoilers",
                )}
              </small>
            </header>
            <MarkdownEditor
              name="content"
              maxLength={5000}
              value={content}
              onChange={(nextContent) => {
                setContent(nextContent);
                if (draftKey) localStorage.setItem(draftKey, nextContent);
              }}
              variant="review"
              lang={lang}
              placeholder={tri(
                lang,
                "O que funcionou? O que não funcionou? O que ficou com você?",
                "What worked? What didn't? What stayed with you?",
                "¿Qué funcionó? ¿Qué no? ¿Qué se te quedó?",
              )}
            />
          </div>
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
            <Toggle pressed={mastered} onPressedChange={setMastered}>
              <Trophy size={18} />
              <span>
                <strong>{tri(lang, "Dominei", "Mastered", "Dominé")}</strong>
                <small>
                  {tri(
                    lang,
                    "Completei tudo que importava para mim",
                    "Completed everything that mattered to me",
                    "Completé todo lo que me importaba",
                  )}
                </small>
              </span>
            </Toggle>
            <Toggle pressed={replay} onPressedChange={setReplay}>
              <RotateCcw size={18} />
              <span>
                <strong>{t.replay}</strong>
                <small>
                  {tri(
                    lang,
                    "Esta não foi minha primeira jornada",
                    "This was not my first journey",
                    "Este no fue mi primer recorrido",
                  )}
                </small>
              </span>
            </Toggle>
          </div>
          <label>
            <span>
              {tri(
                lang,
                "Plataforma jogada",
                "Platform played",
                "Plataforma jugada",
              )}
            </span>
            <PlatformSelect
              value={platform}
              onChange={setPlatform}
              platforms={platforms}
              lang={lang}
            />
          </label>
          {journeyOptions.length > 0 && (
            <label>
              <span>
                {tri(
                  lang,
                  "Jornada ligada",
                  "Linked journey",
                  "Recorrido vinculado",
                )}
              </span>
              <JourneySelect
                value={journeyId}
                onChange={setJourneyId}
                options={journeyOptions}
                lang={lang}
              />
            </label>
          )}
          <div className="social-form-row review-date-fields">
            <label>
              <span>{tri(lang, "Comecei em", "Started on", "Empecé el")}</span>
              <input
                type="date"
                value={startedOn}
                max={today || undefined}
                onChange={(event) => setStartedOn(event.target.value)}
              />
            </label>
            <label>
              <span>
                {tri(lang, "Terminei em", "Finished on", "Terminé el")}
              </span>
              <input
                type="date"
                value={finishedOn}
                min={startedOn || undefined}
                max={today || undefined}
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
            <label>
              <span>{tri(lang, "Comentários", "Comments", "Comentarios")}</span>
              <CommunityScopeSelect
                value={commentsScope}
                onChange={setCommentsScope}
                lang={lang}
              />
            </label>
            <label className="review-spoiler-toggle">
              <Switch
                checked={spoilers}
                onCheckedChange={setSpoilers}
                aria-label={t.containsSpoilers}
              />
              <p>
                <strong>{t.containsSpoilers}</strong>
                <small>
                  {tri(
                    lang,
                    "O texto ficará protegido até o leitor revelar.",
                    "The text stays hidden until the reader reveals it.",
                    "El texto queda oculto hasta que el lector lo revele.",
                  )}
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

function ratingLabel(rating: number, lang: UiLang) {
  if (rating >= 90)
    return tri(lang, "Excepcional", "Exceptional", "Excepcional");
  if (rating >= 80) return tri(lang, "Ótimo", "Great", "Genial");
  if (rating >= 70) return tri(lang, "Muito bom", "Very good", "Muy bueno");
  if (rating >= 60) return tri(lang, "Bom", "Good", "Bueno");
  if (rating >= 40) return tri(lang, "Regular", "Mixed", "Regular");
  return tri(
    lang,
    "Não funcionou para mim",
    "Not for me",
    "No funcionó para mí",
  );
}

const ratingModes: Array<{
  value: ReviewRatingMode;
  label: (lang: UiLang) => string;
}> = [
  {
    value: "stars_5",
    label: (lang) =>
      tri(
        lang,
        "Estrelas · 0,5 a 5",
        "Stars · 0.5 to 5",
        "Estrellas · 0,5 a 5",
      ),
  },
  {
    value: "level_5",
    label: (lang) =>
      tri(lang, "Níveis · 1 a 5", "Levels · 1 to 5", "Niveles · 1 a 5"),
  },
  {
    value: "score_10",
    label: (lang) =>
      tri(lang, "Pontos · 0 a 10", "Score · 0 to 10", "Puntos · 0 a 10"),
  },
  {
    value: "score_100",
    label: (lang) =>
      tri(
        lang,
        "Precisão · 0 a 100",
        "Precision · 0 to 100",
        "Precisión · 0 a 100",
      ),
  },
  {
    value: "recommend",
    label: (lang) =>
      tri(
        lang,
        "Recomendo / não recomendo",
        "Recommend / don't recommend",
        "Lo recomiendo / no lo recomiendo",
      ),
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
  lang,
}: {
  value: ReviewRatingMode;
  onChange: (value: ReviewRatingMode) => void;
  lang: UiLang;
}) {
  return (
    <Select.Root
      value={value}
      onValueChange={(next) => onChange(next as ReviewRatingMode)}
    >
      <Select.Trigger
        className="review-mode-trigger"
        aria-label={tri(
          lang,
          "Forma de avaliar",
          "Rating method",
          "Forma de valorar",
        )}
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
                <Select.ItemText>{mode.label(lang)}</Select.ItemText>
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
  lang,
}: {
  value: string;
  onChange: (value: string) => void;
  platforms: string[];
  lang: UiLang;
}) {
  const options = Array.from(new Set(platforms.filter(Boolean)));
  return (
    <Select.Root value={value || undefined} onValueChange={onChange}>
      <Select.Trigger className="editor-select-trigger review-platform-trigger">
        <Select.Value
          placeholder={tri(
            lang,
            "Selecione uma plataforma",
            "Select a platform",
            "Selecciona una plataforma",
          )}
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
  lang,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  options: JourneyOption[];
  lang: UiLang;
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
              <Select.ItemText>
                {tri(lang, "Nenhuma", "None", "Ninguna")}
              </Select.ItemText>
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
          <Heart size={17} />{" "}
          {tri(lang, "Recomendo", "Recommend", "Lo recomiendo")}
        </button>
        <button
          type="button"
          aria-pressed={recommended === false}
          onClick={() => {
            onRecommend(false);
            onChange(0);
          }}
        >
          <X size={17} />{" "}
          {tri(lang, "Não recomendo", "Don't recommend", "No lo recomiendo")}
        </button>
      </div>
    );
  }
  const step = mode === "score_100" ? 1 : mode === "score_10" ? 10 : 20;
  const max = mode === "score_100" ? 100 : mode === "score_10" ? 10 : 5;
  const display =
    value === null
      ? "-"
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
        aria-label={tri(lang, "Nota", "Rating", "Nota")}
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
          <small>
            {tri(
              lang,
              "LEITURA EM CAMADAS",
              "LAYERED VERDICT",
              "LECTURA POR CAPAS",
            )}
          </small>
          <h3>
            {tri(
              lang,
              "O que definiu sua experiência?",
              "What defined your experience?",
              "¿Qué definió tu experiencia?",
            )}
          </h3>
          <p>
            {tri(
              lang,
              "Avalie só o que importa. Os aspectos não alteram sua nota geral.",
              "Rate only what matters. Aspects do not change your overall score.",
              "Valora solo lo que importa. Los aspectos no cambian tu nota general.",
            )}
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
              onClick={() =>
                add(
                  tri(
                    lang,
                    "Novo aspecto",
                    "Custom aspect",
                    "Aspecto personalizado",
                  ),
                  true,
                )
              }
            >
              <Plus size={13} />{" "}
              {tri(
                lang,
                "Aspecto personalizado",
                "Custom aspect",
                "Aspecto personalizado",
              )}
              <small>{customCount}/5</small>
            </button>
          )}
        </div>
      )}
      {aspects.length === 0 ? (
        <div className="review-aspects-empty">
          <CircleGauge size={21} />
          <strong>
            {tri(
              lang,
              "Nenhum aspecto adicionado",
              "No aspects added",
              "Ningún aspecto añadido",
            )}
          </strong>
          <p>
            {tri(
              lang,
              "Escolha uma categoria acima para detalhar seu julgamento.",
              "Choose a category above to detail your verdict.",
              "Elige una categoría arriba para detallar tu valoración.",
            )}
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
                  aria-label={tri(
                    lang,
                    "Nome do aspecto",
                    "Aspect name",
                    "Nombre del aspecto",
                  )}
                />
                <output>{aspect.rating}</output>
                <button
                  type="button"
                  onClick={() =>
                    onChange(aspects.filter((item) => item.id !== aspect.id))
                  }
                  aria-label={tri(
                    lang,
                    `Remover ${aspect.label}`,
                    `Remove ${aspect.label}`,
                    `Quitar ${aspect.label}`,
                  )}
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
                aria-label={tri(
                  lang,
                  `Nota de ${aspect.label}`,
                  `${aspect.label} rating`,
                  `Nota de ${aspect.label}`,
                )}
              />
              <textarea
                value={aspect.note}
                maxLength={240}
                rows={2}
                onChange={(event) =>
                  update(aspect.id, { note: event.target.value })
                }
                placeholder={tri(
                  lang,
                  "Uma observação curta sobre este aspecto (opcional)",
                  "A short note about this aspect (optional)",
                  "Una nota corta sobre este aspecto (opcional)",
                )}
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
  const t = uiText(lang);
  const options = [
    {
      value: "PUBLIC" as const,
      label: tri(lang, "Público", "Public", "Público"),
      icon: Eye,
    },
    {
      value: "FOLLOWERS" as const,
      label: t.followers,
      icon: Users,
    },
    {
      value: "PRIVATE" as const,
      label: tri(lang, "Privado", "Private", "Privado"),
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

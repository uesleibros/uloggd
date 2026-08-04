"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  CircleGauge,
  Sparkles,
  Trophy,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import {
  getProfileLevel,
  levelProgress,
  points,
  profileXpChange,
  profileXpTenths,
  type ProfileLevel,
  type XpActivity,
} from "@/lib/profile-level";
import { MINERAL_ART, mineralName, type MineralKind } from "@/lib/minerals";
import { EASE_OUT, MOTION_MS } from "@/lib/motion";
import { tri, type UiLang } from "@/lib/ui-text";
import { XP_REFRESH_EVENT, type XpRefreshDetail } from "@/lib/xp-feedback";
import { useInterfacePreferences } from "@/lib/use-interface-preferences";

type Grant = { level: number; mineral: MineralKind };
type Notice = {
  id: number;
  previous: ProfileLevel;
  next: ProfileLevel;
  deltaTenths: number;
  activities: XpActivity[];
  levelsGained: number;
  grants: Grant[];
};

const XpStandingContext = createContext<ProfileLevel | null>(null);

export function useXpStanding() {
  return useContext(XpStandingContext);
}

const ACTIVITY_COPY: Record<
  XpActivity,
  { Icon: LucideIcon; message: (lang: UiLang) => string }
> = {
  REVIEW: {
    Icon: Sparkles,
    message: (lang) =>
      tri(lang, "Avaliação registrada", "Review logged", "Reseña registrada"),
  },
  JOURNEY: {
    Icon: CircleGauge,
    message: (lang) =>
      tri(lang, "Jornada criada", "Journey created", "Recorrido creado"),
  },
  LIST: {
    Icon: CircleGauge,
    message: (lang) =>
      tri(lang, "Lista criada", "List created", "Lista creada"),
  },
  SESSION: {
    Icon: CircleGauge,
    message: (lang) =>
      tri(lang, "Sessão registrada", "Session logged", "Sesión registrada"),
  },
  SCREENSHOT: {
    Icon: Sparkles,
    message: (lang) =>
      tri(
        lang,
        "Captura publicada",
        "Screenshot published",
        "Captura publicada",
      ),
  },
  COMMENT: {
    Icon: CircleGauge,
    message: (lang) =>
      tri(
        lang,
        "Comentário publicado",
        "Comment published",
        "Comentario publicado",
      ),
  },
  GAME: {
    Icon: CircleGauge,
    message: (lang) =>
      tri(
        lang,
        "Jogo adicionado à biblioteca",
        "Game added to your library",
        "Juego añadido a tu biblioteca",
      ),
  },
};

function activityMessage(activities: XpActivity[], lang: UiLang) {
  if (activities.length !== 1)
    return tri(
      lang,
      "Seu diário ganhou novos registros",
      "Your journal has new entries",
      "Tu diario tiene nuevos registros",
    );
  return ACTIVITY_COPY[activities[0]].message(lang);
}

function XpNotice({
  notice,
  lang,
  onClose,
}: {
  notice: Notice;
  lang: UiLang;
  onClose: () => void;
}) {
  const still = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const leveledUp = notice.levelsGained > 0;
  const exactXp = points(profileXpTenths(notice.next));
  const progress = levelProgress({ ...notice.next, xp: exactXp });
  const previousProgress = leveledUp
    ? 0
    : levelProgress({
        ...notice.previous,
        xp: points(profileXpTenths(notice.previous)),
      });
  const number = useMemo(
    () => new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }),
    [lang],
  );
  const ActivityIcon =
    notice.activities.length === 1
      ? ACTIVITY_COPY[notice.activities[0]].Icon
      : CircleGauge;

  useEffect(() => {
    if (paused) return;
    const timeout = window.setTimeout(onClose, leveledUp ? 7600 : 4800);
    return () => window.clearTimeout(timeout);
  }, [leveledUp, onClose, paused]);

  return (
    <motion.aside
      className="xp-feedback"
      data-level-up={leveledUp || undefined}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      initial={
        still ? { opacity: 0 } : { opacity: 0, x: 18, y: 8, scale: 0.98 }
      }
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={still ? { opacity: 0 } : { opacity: 0, x: 12, scale: 0.98 }}
      transition={{ duration: MOTION_MS.normal / 1000, ease: EASE_OUT }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <span className="xp-feedback-edge" aria-hidden />
      <span className="xp-feedback-icon" aria-hidden>
        {leveledUp ? <Trophy size={20} /> : <ActivityIcon size={19} />}
      </span>
      <div className="xp-feedback-content">
        <span className="xp-feedback-eyebrow">
          {leveledUp
            ? tri(lang, "Subiu de nível", "Level up", "Subiste de nivel")
            : activityMessage(notice.activities, lang)}
        </span>
        <div className="xp-feedback-title">
          <strong>
            {leveledUp
              ? tri(
                  lang,
                  `Nível ${notice.next.level} alcançado`,
                  `Level ${notice.next.level} reached`,
                  `Nivel ${notice.next.level} alcanzado`,
                )
              : `+${number.format(points(notice.deltaTenths))} XP`}
          </strong>
          {leveledUp && (
            <span>+{number.format(points(notice.deltaTenths))} XP</span>
          )}
        </div>
        {leveledUp && (
          <p>
            {notice.levelsGained > 1
              ? tri(
                  lang,
                  `Você avançou ${notice.levelsGained} níveis.`,
                  `You advanced ${notice.levelsGained} levels.`,
                  `Avanzaste ${notice.levelsGained} niveles.`,
                )
              : activityMessage(notice.activities, lang)}
          </p>
        )}
        <div
          className="xp-feedback-progress"
          role="progressbar"
          aria-label={tri(
            lang,
            `Progresso no nível ${notice.next.level}`,
            `Progress through level ${notice.next.level}`,
            `Progreso en el nivel ${notice.next.level}`,
          )}
          aria-valuemin={notice.next.level_floor}
          aria-valuemax={notice.next.next_level_at}
          aria-valuenow={exactXp}
        >
          <motion.span
            initial={{ scaleX: previousProgress }}
            animate={{ scaleX: progress }}
            transition={{
              duration: still ? 0 : MOTION_MS.slow / 1000,
              ease: EASE_OUT,
            }}
          />
        </div>
        <div className="xp-feedback-scale">
          <span>
            {tri(
              lang,
              `Nível ${notice.next.level}`,
              `Level ${notice.next.level}`,
              `Nivel ${notice.next.level}`,
            )}
          </span>
          <span>
            {number.format(exactXp)}/{number.format(notice.next.next_level_at)}{" "}
            XP
          </span>
        </div>
        {notice.grants.length > 0 && (
          <div className="xp-feedback-rewards">
            <span>
              {notice.grants.length === 1
                ? tri(lang, "Recompensa", "Reward", "Recompensa")
                : tri(lang, "Recompensas", "Rewards", "Recompensas")}
            </span>
            <ul>
              {notice.grants.slice(-3).map((grant) => (
                <li key={grant.level}>
                  <Image
                    src={MINERAL_ART[grant.mineral]}
                    alt=""
                    width={22}
                    height={22}
                    aria-hidden
                  />
                  {mineralName(grant.mineral, lang)}
                </li>
              ))}
              {notice.grants.length > 3 && <li>+{notice.grants.length - 3}</li>}
            </ul>
          </div>
        )}
      </div>
      <button
        className="xp-feedback-close"
        type="button"
        onClick={onClose}
        aria-label={tri(lang, "Fechar", "Close", "Cerrar")}
      >
        <X size={16} />
      </button>
    </motion.aside>
  );
}

export function XpFeedbackProvider({
  viewerId,
  lang,
  children,
}: {
  viewerId: string | null;
  lang: UiLang;
  children: ReactNode;
}) {
  const client = useMemo(() => createClient(), []);
  /**
   * Whether the card is wanted. Read through a ref so turning it off does not
   * tear down the subscription and lose an in-flight refresh, and so the
   * effect below keeps the dependencies it had.
   */
  const noticesWanted = useInterfacePreferences().xpNotices;
  const noticesWantedRef = useRef(noticesWanted);
  const [standing, setStanding] = useState<ProfileLevel | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const baseline = useRef<ProfileLevel | null>(null);
  const nextNoticeId = useRef(0);

  const closeNotice = useCallback(() => setNotice(null), []);

  // Mirrored into the ref rather than assigned during render, which React
  // refuses: a ref written while rendering can be read from a stale render.
  useEffect(() => {
    noticesWantedRef.current = noticesWanted;
  }, [noticesWanted]);

  useEffect(() => {
    if (!viewerId) return;
    let active = true;
    let timer: number | null = null;
    let refreshing = false;
    let rerun = false;
    let pendingAnnouncement = false;

    async function readStanding() {
      return getProfileLevel(client, viewerId!);
    }

    const initial = readStanding().then((value) => {
      if (!active || !value) return;
      baseline.current = value;
      setStanding(value);
    });

    async function refresh() {
      if (refreshing) {
        rerun = true;
        return;
      }
      refreshing = true;
      do {
        rerun = false;
        const announce = pendingAnnouncement;
        pendingAnnouncement = false;
        const previous = baseline.current;
        const next = await readStanding();
        if (!active || !next) continue;
        baseline.current = next;
        setStanding(next);
        if (!previous || !announce) continue;
        const change = profileXpChange(previous, next);
        if (change.deltaTenths <= 0) continue;

        // Claimed whether or not the card is wanted. The preference is about
        // being told, not about earning: somebody who silenced the card must
        // still get the minerals their level bought them.
        let grants: Grant[] = [];
        if (change.levelsGained > 0) {
          const { data } = await client.rpc("claim_level_minerals");
          if (active && data?.length) grants = data as Grant[];
        }
        if (!active || !noticesWantedRef.current) continue;
        nextNoticeId.current += 1;
        setNotice({
          id: nextNoticeId.current,
          previous,
          next,
          ...change,
          grants,
        });
      } while (rerun);
      refreshing = false;
    }

    function schedule(event: Event) {
      const detail = (event as CustomEvent<XpRefreshDetail>).detail;
      pendingAnnouncement ||= detail?.announce ?? true;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => void initial.then(refresh), 180);
    }

    window.addEventListener(XP_REFRESH_EVENT, schedule);
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
      window.removeEventListener(XP_REFRESH_EVENT, schedule);
    };
  }, [client, viewerId]);

  return (
    <XpStandingContext.Provider value={standing}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence mode="wait">
            {/* Also gated here, not only where notices are raised, so turning
                the setting off takes the card that is on screen with it. */}
            {notice && noticesWanted && (
              <XpNotice
                key={notice.id}
                notice={notice}
                lang={lang}
                onClose={closeNotice}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}
    </XpStandingContext.Provider>
  );
}

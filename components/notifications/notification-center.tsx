"use client";

import { Switch } from "@/components/ui/switch";

/* eslint-disable @next/next/no-img-element */

import * as Dialog from "@/components/ui/dialog";
import {
  ArrowLeft,
  Bell,
  BellOff,
  CheckCheck,
  Heart,
  LoaderCircle,
  MessageCircle,
  Settings2,
  ShieldAlert,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, settle } from "@/lib/api-client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";
import { COMMENT_REVEAL_EVENT } from "@/components/comment-anchor";
import { tri } from "@/lib/ui-text";
import { RelativeTime } from "@/components/relative-time";

type Labels = Dictionary["notifications"];
type NotificationKind =
  | "follow"
  | "review_like"
  | "list_like"
  | "profile_comment"
  | "profile_comment_like"
  | "screenshot_like"
  | "screenshot_comment"
  | "screenshot_comment_like"
  | "moderation_comment_removed"
  | "journal_like"
  | "post_comment"
  | "post_comment_like";
type Actor = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};
/**
 * A notification, already resolved.
 *
 * `path` is where it points, without the language prefix, and null when there
 * is nowhere left to go: the post was deleted, or the reader may no longer
 * see it. Working this out used to take eleven reads from the browser; it is
 * a join, and it happens where the joins are.
 */
type NotificationRow = {
  id: string;
  kind: NotificationKind;
  target_title: string | null;
  created_at: string;
  read_at: string | null;
  actor: Actor | null;
  path: string | null;
  is_reply: boolean;
};
type Preferences = {
  follows_enabled: boolean;
  review_likes_enabled: boolean;
  list_likes_enabled: boolean;
  comments_enabled: boolean;
  screenshots_enabled: boolean;
  journal_likes_enabled: boolean;
};
const defaultPreferences: Preferences = {
  follows_enabled: true,
  review_likes_enabled: true,
  list_likes_enabled: true,
  comments_enabled: true,
  screenshots_enabled: true,
  journal_likes_enabled: true,
};

export function NotificationCenter({
  lang,
  labels,
}: {
  lang: Locale;
  labels: Labels;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"inbox" | "preferences">("inbox");
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [preferences, setPreferences] =
    useState<Preferences>(defaultPreferences);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<NotificationRow | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const answer = await api.get<{
        data: NotificationRow[];
        preferences: Preferences | null;
      }>("/notifications");
      setItems(answer.data);
      if (answer.preferences) setPreferences(answer.preferences);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.read_at).length,
    [items],
  );

  async function markRead(item: NotificationRow) {
    if (item.read_at) return;
    const readAt = new Date().toISOString();
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, read_at: readAt } : entry,
      ),
    );
    const { error } = await settle(
      api.patch<{ data: unknown }>(`/notifications/${item.id}`),
    );
    if (error) void load();
  }

  async function markAllRead() {
    const readAt = new Date().toISOString();
    setItems((current) =>
      current.map((item) => ({ ...item, read_at: item.read_at ?? readAt })),
    );
    const { error } = await settle(
      api.patch<{ data: unknown }>("/notifications"),
    );
    if (error) void load();
  }

  async function updatePreference(key: keyof Preferences) {
    if (saving) return;
    const previous = preferences;
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    setSaving(true);
    const { error } = await settle(
      api.patch<{ data: unknown }>("/notifications/preferences", {
        [key]: next[key],
      }),
    );
    if (error) setPreferences(previous);
    setSaving(false);
  }

  function openComment(href: string) {
    setOpen(false);
    // Navigating is the whole job now: CommentAnchor watches the hash and waits
    // for the comment to arrive, which the old poll here could not do, the
    // thread is fetched after mount and the two-second budget ran out first.
    router.push(href, { scroll: false });
    // Same page, same hash: neither the router nor hashchange fires, so the
    // reveal has to be asked for explicitly.
    window.setTimeout(
      () => window.dispatchEvent(new Event(COMMENT_REVEAL_EVENT)),
      0,
    );
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setView("inbox");
        if (nextOpen) void load();
      }}
    >
      <Dialog.Trigger asChild>
        <button className="notification-trigger" aria-label={labels.trigger}>
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="notification-badge" aria-hidden>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="notification-backdrop" />
        <Dialog.Content
          className="notification-dialog"
          aria-describedby="notification-dialog-description"
        >
          <header className="notification-header">
            <div>
              <Dialog.Title>
                {view === "inbox" ? labels.title : labels.preferencesTitle}
              </Dialog.Title>
              <Dialog.Description id="notification-dialog-description">
                {view === "inbox"
                  ? labels.subtitle
                  : labels.preferencesDescription}
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label={labels.back}>
              <X size={18} />
            </Dialog.Close>
          </header>

          {view === "preferences" ? (
            <div className="notification-preferences">
              <button
                className="notification-back"
                type="button"
                onClick={() => setView("inbox")}
              >
                <ArrowLeft size={16} />
                {labels.back}
              </button>
              {(
                [
                  ["follows_enabled", labels.follows],
                  ["review_likes_enabled", labels.reviewLikes],
                  ["list_likes_enabled", labels.listLikes],
                  ["comments_enabled", labels.comments],
                  ["screenshots_enabled", labels.screenshots],
                  ["journal_likes_enabled", labels.journalLikes],
                ] as const
              ).map(([key, label]) => (
                <label className="notification-preference" key={key}>
                  <span>{label}</span>
                  <Switch
                    checked={preferences[key]}
                    disabled={saving}
                    aria-label={label}
                    onCheckedChange={() => void updatePreference(key)}
                  />
                </label>
              ))}
              {saving && (
                <span className="notification-saving">
                  <LoaderCircle className="spin" size={13} aria-hidden />{" "}
                  {labels.saving}
                </span>
              )}
            </div>
          ) : (
            <>
              <div className="notification-toolbar">
                <button
                  type="button"
                  disabled={unreadCount === 0}
                  onClick={() => void markAllRead()}
                >
                  <CheckCheck size={15} />
                  {labels.markAll}
                </button>
                <button type="button" onClick={() => setView("preferences")}>
                  <Settings2 size={15} />
                  {labels.settings}
                </button>
              </div>
              <div className="notification-scroll">
                {status === "loading" && <NotificationSkeleton />}
                {status === "error" && (
                  <div className="notification-state" role="alert">
                    <BellOff size={24} />
                    <strong>{labels.error}</strong>
                    <button type="button" onClick={() => void load()}>
                      {labels.retry}
                    </button>
                  </div>
                )}
                {status === "ready" && items.length === 0 && (
                  <div className="notification-state">
                    <Bell size={24} />
                    <strong>{labels.empty}</strong>
                    <span>{labels.emptyDescription}</span>
                  </div>
                )}
                {status === "ready" &&
                  items.map((item) => {
                    const actor = item.actor;
                    const name =
                      actor?.display_name ||
                      actor?.username ||
                      labels.unknownUser;
                    const actorProfile = actor?.username
                      ? `/${lang}/u/${actor.username}`
                      : `/${lang}`;
                    // Nowhere to go means the post is gone or out of reach.
                    // The words still stand; only the link falls back.
                    const href = item.path
                      ? `/${lang}/${item.path}`
                      : actorProfile;
                    const Icon =
                      item.kind === "moderation_comment_removed"
                        ? ShieldAlert
                        : item.kind === "follow"
                          ? UserPlus
                          : item.kind === "profile_comment" ||
                              item.kind === "screenshot_comment" ||
                              item.kind === "post_comment"
                            ? MessageCircle
                            : Heart;
                    const content = (
                      <>
                        <span className="notification-avatar">
                          {actor?.avatar_url ? (
                            <img src={actor.avatar_url} alt="" />
                          ) : (
                            name.slice(0, 1).toUpperCase()
                          )}
                          <span>
                            <Icon size={12} />
                          </span>
                        </span>
                        <span className="notification-copy">
                          <span>
                            {item.kind === "moderation_comment_removed" ? (
                              <>
                                <strong>
                                  {tri(
                                    lang,
                                    "Moderação",
                                    "Moderation",
                                    "Moderación",
                                  )}
                                </strong>{" "}
                                {tri(
                                  lang,
                                  "removeu um comentário seu",
                                  "removed one of your comments",
                                  "eliminó un comentario tuyo",
                                )}
                              </>
                            ) : (
                              <>
                                <strong>{name}</strong>{" "}
                                {item.kind === "follow"
                                  ? labels.newFollower
                                  : item.kind === "review_like"
                                    ? labels.reviewLike
                                    : item.kind === "profile_comment"
                                      ? item.is_reply
                                        ? labels.profileReply
                                        : labels.profileComment
                                      : item.kind === "profile_comment_like"
                                        ? labels.profileCommentLike
                                        : item.kind === "screenshot_like"
                                          ? labels.screenshotLike
                                          : item.kind === "screenshot_comment"
                                            ? item.is_reply
                                              ? labels.screenshotReply
                                              : labels.screenshotComment
                                            : item.kind ===
                                                "screenshot_comment_like"
                                              ? labels.screenshotCommentLike
                                              : item.kind === "journal_like"
                                                ? labels.journalLike
                                                : item.kind === "post_comment"
                                                  ? item.is_reply
                                                    ? labels.postReply
                                                    : labels.postComment
                                                  : item.kind ===
                                                      "post_comment_like"
                                                    ? labels.postCommentLike
                                                    : labels.listLike}
                                {item.target_title && (
                                  <>
                                    {" "}
                                    <b>{item.target_title}</b>
                                  </>
                                )}
                              </>
                            )}
                          </span>
                          <RelativeTime value={item.created_at} lang={lang} />
                        </span>
                        {!item.read_at && (
                          <span
                            className="notification-unread"
                            aria-label={labels.unread}
                          />
                        )}
                      </>
                    );
                    return item.kind === "moderation_comment_removed" ? (
                      <button
                        type="button"
                        key={item.id}
                        className="notification-item"
                        data-unread={!item.read_at || undefined}
                        onClick={() => {
                          void markRead(item);
                          setDetail(item);
                        }}
                      >
                        {content}
                      </button>
                    ) : item.path?.includes("#comment-") ? (
                      <button
                        type="button"
                        key={item.id}
                        className="notification-item"
                        data-unread={!item.read_at || undefined}
                        onClick={() => {
                          void markRead(item);
                          openComment(href);
                        }}
                      >
                        {content}
                      </button>
                    ) : (
                      <Dialog.Close asChild key={item.id}>
                        <Link
                          href={href}
                          className="notification-item"
                          data-unread={!item.read_at || undefined}
                          onClick={() => void markRead(item)}
                        >
                          {content}
                        </Link>
                      </Dialog.Close>
                    );
                  })}
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
      <Dialog.Root
        open={Boolean(detail)}
        onOpenChange={(open) => !open && setDetail(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="notification-detail-backdrop" />
          <Dialog.Content className="notification-detail-dialog">
            <Dialog.Close aria-label={labels.back}>
              <X size={18} />
            </Dialog.Close>
            <span aria-hidden>
              <ShieldAlert size={22} />
            </span>
            <Dialog.Title>
              {tri(
                lang,
                "Comentário removido pela moderação",
                "Comment removed by moderation",
                "Comentario eliminado por moderación",
              )}
            </Dialog.Title>
            <Dialog.Description>
              {tri(
                lang,
                "O conteúdo deixou de aparecer publicamente e não pode mais receber respostas.",
                "The content is no longer public and cannot receive new replies.",
                "El contenido ha dejado de aparecer públicamente y ya no puede recibir respuestas.",
              )}
            </Dialog.Description>
            <div>
              <small>{tri(lang, "JUSTIFICATIVA", "REASON", "MOTIVO")}</small>
              <p>
                {detail?.target_title ||
                  tri(
                    lang,
                    "Removido por violar as regras da comunidade.",
                    "Removed for violating the community rules.",
                    "Eliminado por infringir las reglas de la comunidad.",
                  )}
              </p>
            </div>
            <Dialog.Close className="notification-detail-confirm">
              {tri(lang, "Entendi", "Got it", "Entendido")}
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Dialog.Root>
  );
}

function NotificationSkeleton() {
  return (
    <div className="notification-skeleton" aria-hidden>
      {[0, 1, 2, 3].map((item) => (
        <div key={item}>
          <span />
          <p>
            <i />
            <i />
          </p>
        </div>
      ))}
    </div>
  );
}

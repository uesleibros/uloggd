"use client";

/* eslint-disable @next/next/no-img-element */

import * as Dialog from "@radix-ui/react-dialog";
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
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";
import { createClient } from "@/lib/supabase/client";
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
  | "moderation_comment_removed";
type NotificationRow = {
  id: string;
  actor_id: string;
  kind: NotificationKind;
  target_id: string | null;
  target_title: string | null;
  created_at: string;
  read_at: string | null;
};
type Actor = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};
type Preferences = {
  follows_enabled: boolean;
  review_likes_enabled: boolean;
  list_likes_enabled: boolean;
  comments_enabled: boolean;
  screenshots_enabled: boolean;
};
type CommentTarget = {
  ownerUsername: string;
  isReply: boolean;
  publicId: string;
};
type ScreenshotCommentTarget = {
  shotPublicId: string;
  commentPublicId: string;
  isReply: boolean;
};

const defaultPreferences: Preferences = {
  follows_enabled: true,
  review_likes_enabled: true,
  list_likes_enabled: true,
  comments_enabled: true,
  screenshots_enabled: true,
};

export function NotificationCenter({
  viewerId,
  lang,
  labels,
}: {
  viewerId: string;
  lang: Locale;
  labels: Labels;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"inbox" | "preferences">("inbox");
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [actors, setActors] = useState<Record<string, Actor>>({});
  const [commentTargets, setCommentTargets] = useState<
    Record<string, CommentTarget>
  >({});
  const [contentTargets, setContentTargets] = useState<Record<string, string>>(
    {},
  );
  const [screenshotCommentTargets, setScreenshotCommentTargets] = useState<
    Record<string, ScreenshotCommentTarget>
  >({});
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
    const supabase = createClient();
    const [{ data, error }, { data: preferenceData }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id,actor_id,kind,target_id,target_title,created_at,read_at")
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("notification_preferences")
        .select(
          "follows_enabled,review_likes_enabled,list_likes_enabled,comments_enabled,screenshots_enabled",
        )
        .eq("profile_id", viewerId)
        .maybeSingle(),
    ]);
    if (error) {
      setStatus("error");
      return;
    }
    const rows = (data ?? []) as NotificationRow[];
    const actorIds = [...new Set(rows.map((item) => item.actor_id))];
    const commentIds = rows
      .filter(
        (item) =>
          (item.kind === "profile_comment" ||
            item.kind === "profile_comment_like") &&
          item.target_id,
      )
      .map((item) => item.target_id as string);
    const reviewIds = rows
      .filter((item) => item.kind === "review_like" && item.target_id)
      .map((item) => item.target_id as string);
    const listIds = rows
      .filter((item) => item.kind === "list_like" && item.target_id)
      .map((item) => item.target_id as string);
    const screenshotIds = rows
      .filter((item) => item.kind === "screenshot_like" && item.target_id)
      .map((item) => item.target_id as string);
    const screenshotCommentIds = rows
      .filter(
        (item) =>
          (item.kind === "screenshot_comment" ||
            item.kind === "screenshot_comment_like") &&
          item.target_id,
      )
      .map((item) => item.target_id as string);
    const [
      { data: comments },
      { data: reviews },
      { data: lists },
      { data: screenshots },
      { data: screenshotComments },
    ] = await Promise.all([
      commentIds.length
        ? supabase
            .from("profile_comments")
            .select("id,public_id,profile_id,parent_id")
            .in("id", commentIds)
        : Promise.resolve({ data: [] }),
      reviewIds.length
        ? supabase.from("reviews").select("id,public_id").in("id", reviewIds)
        : Promise.resolve({ data: [] }),
      listIds.length
        ? supabase.from("game_lists").select("id,public_id").in("id", listIds)
        : Promise.resolve({ data: [] }),
      screenshotIds.length
        ? supabase
            .from("screenshots")
            .select("id,public_id")
            .in("id", screenshotIds)
        : Promise.resolve({ data: [] }),
      screenshotCommentIds.length
        ? supabase
            .from("content_comments")
            .select("id,public_id,parent_id,content_id")
            .in("id", screenshotCommentIds)
            .eq("content_type", "screenshot")
        : Promise.resolve({ data: [] }),
    ]);
    const commentShotIds = [
      ...new Set(
        (screenshotComments ?? []).map((comment) => comment.content_id),
      ),
    ];
    const { data: commentShots } = commentShotIds.length
      ? await supabase
          .from("screenshots")
          .select("id,public_id")
          .in("id", commentShotIds)
      : { data: [] };
    const ownerIds = (comments ?? []).map((comment) => comment.profile_id);
    const profileIds = [...new Set([...actorIds, ...ownerIds])];
    let nextActors: Record<string, Actor> = {};
    let nextCommentTargets: Record<string, CommentTarget> = {};
    if (profileIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url")
        .in("id", profileIds);
      nextActors = Object.fromEntries(
        (profiles ?? [])
          .filter((profile) => actorIds.includes(profile.id))
          .map((profile) => [
            profile.id,
            {
              username: profile.username,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
            },
          ]),
      );
      const usernames = new Map(
        (profiles ?? []).map((profile) => [profile.id, profile.username]),
      );
      nextCommentTargets = Object.fromEntries(
        (comments ?? []).flatMap((comment) => {
          const username = usernames.get(comment.profile_id);
          return username
            ? [
                [
                  comment.id,
                  {
                    ownerUsername: username,
                    isReply: Boolean(comment.parent_id),
                    publicId: comment.public_id,
                  },
                ],
              ]
            : [];
        }),
      );
    }
    setItems(rows);
    setActors(nextActors);
    setCommentTargets(nextCommentTargets);
    setContentTargets(
      Object.fromEntries(
        [...(reviews ?? []), ...(lists ?? []), ...(screenshots ?? [])].map(
          (item) => [item.id, item.public_id],
        ),
      ),
    );
    const shotPublicIds = new Map(
      (commentShots ?? []).map((shot) => [shot.id, shot.public_id]),
    );
    setScreenshotCommentTargets(
      Object.fromEntries(
        (screenshotComments ?? []).flatMap((comment) => {
          const shotPublicId = shotPublicIds.get(comment.content_id);
          return shotPublicId
            ? [
                [
                  comment.id,
                  {
                    shotPublicId,
                    commentPublicId: comment.public_id,
                    isReply: Boolean(comment.parent_id),
                  },
                ],
              ]
            : [];
        }),
      ),
    );
    if (preferenceData) setPreferences(preferenceData as Preferences);
    setStatus("ready");
  }, [viewerId]);

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
    const { error } = await createClient()
      .from("notifications")
      .update({ read_at: readAt })
      .eq("id", item.id);
    if (error) void load();
  }

  async function markAllRead() {
    const readAt = new Date().toISOString();
    setItems((current) =>
      current.map((item) => ({ ...item, read_at: item.read_at ?? readAt })),
    );
    const { error } = await createClient().rpc("mark_all_notifications_read");
    if (error) void load();
  }

  async function updatePreference(key: keyof Preferences) {
    if (saving) return;
    const previous = preferences;
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    setSaving(true);
    const { error } = await createClient()
      .from("notification_preferences")
      .upsert({ profile_id: viewerId, ...next });
    if (error) setPreferences(previous);
    setSaving(false);
  }

  function openComment(targetId: string, href: string) {
    setOpen(false);
    const destination = new URL(href, window.location.origin);
    const alreadyOnProfile = destination.pathname === window.location.pathname;
    router.push(href, { scroll: false });
    if (alreadyOnProfile) router.refresh();
    let attempts = 0;
    const reveal = () => {
      const target = document.getElementById(`comment-${targetId}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.focus({ preventScroll: true });
        return;
      }
      attempts += 1;
      if (attempts < 40) window.setTimeout(reveal, 50);
    };
    window.setTimeout(reveal, 0);
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
                ] as const
              ).map(([key, label]) => (
                <label className="notification-preference" key={key}>
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={preferences[key]}
                    disabled={saving}
                    onChange={() => void updatePreference(key)}
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
                    const actor = actors[item.actor_id];
                    const name =
                      actor?.display_name ||
                      actor?.username ||
                      labels.unknownUser;
                    const isCommentNotification =
                      item.kind === "profile_comment" ||
                      item.kind === "profile_comment_like";
                    const commentTarget = item.target_id
                      ? commentTargets[item.target_id]
                      : null;
                    const screenshotCommentTarget = item.target_id
                      ? screenshotCommentTargets[item.target_id]
                      : null;
                    const isScreenshotComment =
                      item.kind === "screenshot_comment" ||
                      item.kind === "screenshot_comment_like";
                    const href =
                      item.kind === "follow"
                        ? actor?.username
                          ? `/${lang}/u/${actor.username}`
                          : `/${lang}`
                        : isCommentNotification && commentTarget
                          ? `/${lang}/u/${commentTarget.ownerUsername}#comment-${commentTarget.publicId}`
                          : isCommentNotification
                            ? `/${lang}`
                            : isScreenshotComment
                              ? screenshotCommentTarget
                                ? `/${lang}/shot/${screenshotCommentTarget.shotPublicId}#comment-${screenshotCommentTarget.commentPublicId}`
                                : `/${lang}`
                              : item.kind === "review_like"
                                ? `/${lang}/review/${item.target_id ? (contentTargets[item.target_id] ?? item.target_id) : ""}`
                                : item.kind === "screenshot_like"
                                  ? `/${lang}/shot/${item.target_id ? (contentTargets[item.target_id] ?? item.target_id) : ""}`
                                  : `/${lang}/lists/${item.target_id ? (contentTargets[item.target_id] ?? item.target_id) : ""}`;
                    const Icon =
                      item.kind === "moderation_comment_removed"
                        ? ShieldAlert
                        : item.kind === "follow"
                          ? UserPlus
                          : item.kind === "profile_comment" ||
                              item.kind === "screenshot_comment"
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
                                      ? commentTarget?.isReply
                                        ? labels.profileReply
                                        : labels.profileComment
                                      : item.kind === "profile_comment_like"
                                        ? labels.profileCommentLike
                                        : item.kind === "screenshot_like"
                                          ? labels.screenshotLike
                                          : item.kind === "screenshot_comment"
                                            ? screenshotCommentTarget?.isReply
                                              ? labels.screenshotReply
                                              : labels.screenshotComment
                                            : item.kind ===
                                                "screenshot_comment_like"
                                              ? labels.screenshotCommentLike
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
                    ) : (isCommentNotification || isScreenshotComment) &&
                      item.target_id ? (
                      <button
                        type="button"
                        key={item.id}
                        className="notification-item"
                        data-unread={!item.read_at || undefined}
                        onClick={() => {
                          void markRead(item);
                          openComment(
                            commentTarget?.publicId ??
                              screenshotCommentTarget?.commentPublicId ??
                              item.target_id!,
                            href,
                          );
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

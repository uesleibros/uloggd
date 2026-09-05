"use client";

import { api, settle } from "@/lib/api-client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

type ContentType =
  "review" | "diary" | "list" | "screenshot" | "content_comment";

export function LikeButton({
  contentType,
  contentId,
  count,
  liked,
  canLike,
  lang,
}: {
  contentType: ContentType;
  contentId: string;
  count: number;
  liked: boolean;
  canLike: boolean;
  lang: UiLang;
}) {
  const t = uiText(lang);
  const [currentCount, setCurrentCount] = useState(count);
  const [currentLiked, setCurrentLiked] = useState(liked);
  const [pending, setPending] = useState(false);

  if (!canLike) {
    return (
      <span
        className="content-like"
        data-static
        aria-label={tri(lang, "Curtidas", "Likes", "Me gusta")}
      >
        <Heart size={14} fill={currentLiked ? "currentColor" : "none"} />
        <span>{currentCount.toLocaleString(lang)}</span>
      </span>
    );
  }

  async function toggle() {
    if (pending) return;
    setPending(true);
    const previous = { liked: currentLiked, count: currentCount };
    const nextLiked = !currentLiked;
    setCurrentLiked(nextLiked);
    setCurrentCount((value) => Math.max(0, value + (nextLiked ? 1 : -1)));
    const { data, error } = await settle(
      api.post<{ data: { liked: boolean; like_count: number } }>("/likes", {
        on: contentType,
        id: contentId,
      }),
    );
    if (error) {
      setCurrentLiked(previous.liked);
      setCurrentCount(previous.count);
    } else if (data) {
      setCurrentLiked(data.liked);
      setCurrentCount(data.like_count);
    }
    setPending(false);
  }

  return (
    <button
      type="button"
      className="content-like"
      aria-pressed={currentLiked}
      data-liked={currentLiked || undefined}
      disabled={pending}
      onClick={toggle}
      aria-label={
        currentLiked
          ? tri(lang, "Remover curtida", "Remove like", "Quitar me gusta")
          : t.like
      }
    >
      <Heart size={14} fill={currentLiked ? "currentColor" : "none"} />
      <span>{currentCount.toLocaleString(lang)}</span>
    </button>
  );
}

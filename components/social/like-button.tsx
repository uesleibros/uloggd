"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ContentType = "review" | "diary" | "list";

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
  lang: "pt-BR" | "en";
}) {
  const pt = lang === "pt-BR";
  const [currentCount, setCurrentCount] = useState(count);
  const [currentLiked, setCurrentLiked] = useState(liked);
  const [pending, setPending] = useState(false);

  if (!canLike) {
    if (currentCount === 0) return null;
    return (
      <span className="content-like" data-static>
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
    const { data, error } = await createClient().rpc("toggle_content_like", {
      target_type: contentType,
      target_id: contentId,
    });
    if (error) {
      setCurrentLiked(previous.liked);
      setCurrentCount(previous.count);
    } else {
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setCurrentLiked(Boolean(row.liked));
        setCurrentCount(Number(row.like_count));
      }
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
          ? pt
            ? "Remover curtida"
            : "Remove like"
          : pt
            ? "Curtir"
            : "Like"
      }
    >
      <Heart size={14} fill={currentLiked ? "currentColor" : "none"} />
      <span>{currentCount.toLocaleString(lang)}</span>
    </button>
  );
}

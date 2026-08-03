"use client";

import { motion } from "motion/react";
import { Eye, Radio } from "lucide-react";
import { SiTwitch } from "react-icons/si";
import { RelativeTime } from "@/components/relative-time";
import type { TwitchStream } from "@/lib/twitch";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * The stream card on a profile, shown only while the channel is actually live.
 *
 * A link out rather than an embedded player. Twitch's player autoplays with
 * sound and loads a third-party frame that watches whoever opens the page, and
 * a profile is not a place anyone expects either. Someone who wants to watch is
 * one click away and arrives on Twitch, where their account and their chat are.
 */
export function TwitchLiveCard({
  stream,
  name,
  lang,
}: {
  stream: TwitchStream;
  /** Whose profile this is, so the heading reads as a person, not a channel. */
  name: string;
  lang: UiLang;
}) {
  return (
    <motion.a
      className="twitch-live-card"
      href={`https://twitch.tv/${stream.login}`}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="twitch-live-thumb">
        {stream.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={stream.thumbnailUrl}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ) : (
          <SiTwitch size={28} aria-hidden />
        )}
        <span className="twitch-live-badge">
          {/* The dot is the only thing on the card that moves, and it stops for
              anyone who asked for less motion. */}
          <motion.i
            aria-hidden
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          {tri(lang, "AO VIVO", "LIVE", "EN VIVO")}
        </span>
      </span>
      <span className="twitch-live-body">
        <strong className="twitch-live-heading">
          <Radio size={14} aria-hidden />
          {tri(
            lang,
            `${name} está ao vivo na Twitch`,
            `${name} is live on Twitch`,
            `${name} está en vivo en Twitch`,
          )}
        </strong>
        <span className="twitch-live-title">
          {stream.title ||
            tri(
              lang,
              "Transmissão ao vivo",
              "Live stream",
              "Transmisión en vivo",
            )}
        </span>
        <span className="twitch-live-meta">
          {stream.gameName && <b>{stream.gameName}</b>}
          <span>
            <Eye size={13} aria-hidden />
            {new Intl.NumberFormat(lang).format(stream.viewers)}
          </span>
          {/* The same clock the rest of the site tells time with, and it keeps
              ticking while the page stays open. */}
          <RelativeTime value={stream.startedAt} lang={lang} />
        </span>
      </span>
    </motion.a>
  );
}

"use client";

import { motion } from "motion/react";
import { SiSteam } from "react-icons/si";
import { Tooltip } from "@/components/ui/tooltip";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * "Playing X right now", in the identity block beside the handle.
 *
 * A chip rather than a card, and much quieter than the Twitch one above it. A
 * live stream is an invitation to come and watch; a game session is a fact
 * about somebody's afternoon, and a whole card for it read as an announcement.
 * It sits with the handle and the join date because that row is what tells you
 * who you are looking at, and this is the part of it that is only true for the
 * next few hours.
 */
export function SteamPlayingCard({
  game,
  appId,
  steamId,
  lang,
}: {
  game: string;
  appId: string | null;
  steamId: string;
  lang: UiLang;
}) {
  const playing = tri(lang, "Jogando", "Playing", "Jugando");
  return (
    // The chip truncates a long title, so the whole one lives in a tooltip.
    // The site's own, never the browser's: a native `title` cannot be reached
    // by touch or by keyboard, and it is styled by the operating system.
    <Tooltip label={`${playing} ${game}`}>
      <motion.a
        className="steam-playing-card"
        // The store page when Steam named the app, the person's profile
        // otherwise: a game with no id is a non-Steam shortcut, and the store
        // has no page for it.
        href={
          appId
            ? `https://store.steampowered.com/app/${appId}`
            : `https://steamcommunity.com/profiles/${steamId}`
        }
        target="_blank"
        rel="noreferrer"
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="steam-playing-mark" aria-hidden>
          <SiSteam size={12} />
        </span>
        <span className="steam-playing-body">
          <span className="steam-playing-label">{playing}</span>
          <strong>{game}</strong>
        </span>
      </motion.a>
    </Tooltip>
  );
}

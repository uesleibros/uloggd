"use client";

import { motion } from "motion/react";
import { Gamepad2 } from "lucide-react";
import { SiSteam } from "react-icons/si";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * "Playing X right now", shown only while Steam says so.
 *
 * Deliberately smaller than the Twitch card. A live stream is an invitation to
 * come and watch; a game session is just a fact about somebody's afternoon,
 * and giving it the same weight would turn a profile into a status feed.
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
  return (
    <motion.a
      className="steam-playing-card"
      // The store page when Steam named the app, the person's profile
      // otherwise: a game with no id is usually a non-Steam shortcut, and a
      // store search for it would land on the wrong thing.
      href={
        appId
          ? `https://store.steampowered.com/app/${appId}`
          : `https://steamcommunity.com/profiles/${steamId}`
      }
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="steam-playing-mark">
        <SiSteam size={17} aria-hidden />
      </span>
      <span className="steam-playing-body">
        <small>
          <Gamepad2 size={12} aria-hidden />
          {tri(lang, "Jogando agora", "Playing now", "Jugando ahora")}
        </small>
        <strong>{game}</strong>
      </span>
    </motion.a>
  );
}

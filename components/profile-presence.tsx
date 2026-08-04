import { getLiveStream } from "@/lib/twitch";
import { getSteamPlayer } from "@/lib/steam";
import { TwitchLiveCard } from "@/components/twitch-live-card";
import { SteamPlayingCard } from "@/components/steam-playing-card";
import type { UiLang } from "@/lib/ui-text";

/**
 * What somebody is doing on Twitch and Steam right this minute.
 *
 * Two components rather than one because they render in different places on
 * the profile, and each is its own async boundary on purpose: both call an
 * outside service, and a profile used to wait on Twitch and Steam before it
 * would render at all. That is a page holding its breath for a decoration,
 * and on a slow answer from either it cost the whole page half a second.
 *
 * Suspended with a null fallback at the call site, so nothing reserves space
 * for something that usually is not there.
 */

export async function TwitchLivePresence({
  username,
  visible,
  name,
  lang,
}: {
  username: string | null;
  visible: boolean;
  name: string;
  lang: UiLang;
}) {
  if (!username || !visible) return null;
  const stream = await getLiveStream(username);
  if (!stream) return null;
  return <TwitchLiveCard stream={stream} name={name} lang={lang} />;
}

export async function SteamPlayingPresence({
  steamId,
  visible,
  lang,
}: {
  steamId: string | null;
  visible: boolean;
  lang: UiLang;
}) {
  if (!steamId || !visible) return null;
  const player = await getSteamPlayer(steamId);
  if (!player?.playing) return null;
  return (
    <SteamPlayingCard
      game={player.playing.name}
      appId={player.playing.appId}
      steamId={player.steamId}
      lang={lang}
    />
  );
}

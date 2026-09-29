/**
 * The letter shown where somebody has no picture.
 *
 * Seventeen places drew this fallback and they did not agree on whose letter
 * it is: twelve took the username, four took the display name, one took the
 * e-mail. So one account showed `U` under its own comment, `u` in a followers
 * list, and a third letter in the notification about that comment — three
 * marks for one person, on one page.
 *
 * The username is the letter, because the username is the identity: it is the
 * one thing an account always has, it does not change when somebody renames
 * themselves, and it is what the avatar links to. The display name is the
 * fallback rather than the rule, for the handful of rows that arrive without
 * a username at all.
 */
export function avatarInitial(
  person:
    | string
    | null
    | undefined
    | {
        username?: string | null;
        display_name?: string | null;
        email?: string | null;
      },
) {
  const source =
    typeof person === "string"
      ? person
      : (person?.username ?? person?.display_name ?? person?.email ?? "");
  // Not `[0]`: a name starting with an emoji or an accented letter outside the
  // basic plane would be cut in half by an index into the code units.
  return [...source.trim()][0]?.toUpperCase() ?? "?";
}

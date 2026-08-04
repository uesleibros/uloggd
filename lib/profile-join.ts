/**
 * The profile row PostgREST embeds alongside something else.
 *
 * Its own module, free of `server-only`, because the rules that read it are
 * worth testing and a test cannot import a module the bundler reserves for the
 * server.
 */
export type ProfileJoin = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  verified: boolean;
  account_type?: "PERSON" | "ORGANIZATION";
};

/**
 * An embedded row arrives as an object or as an array of one, depending on how
 * PostgREST reads the relationship. Everything downstream wants the object.
 */
export function profileOf(
  value: ProfileJoin | ProfileJoin[] | null | undefined,
): ProfileJoin | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

import "server-only";

/**
 * One line in the server log when something outside this app lets it down.
 *
 * Every integration here already fails softly, and that is right: Twitch being
 * slow must not break a profile, and imgchest refusing an upload must not
 * throw a page away. What was missing is the trace. A `catch` that returns null
 * and says nothing leaves a person looking at "could not connect" and leaves
 * whoever has to fix it with nothing at all, which is the worst of both: the
 * failure is invisible until somebody complains, and then unreproducible.
 *
 * Deliberately just `console.error`. That is what the client error reporter
 * already funnels into, and on the host it is what gets collected; adding a
 * service here would be a second place to look for the same information.
 *
 * The shape is fixed so the log can be searched by scope: every line starts
 * `[integration] <scope>`.
 */
export function logIntegrationFailure(scope: string, error: unknown) {
  const detail =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === "string"
        ? error
        : "unknown error";
  // The stack only for real errors, and only in production, where it is the
  // one chance to see what happened. Locally the throw is already visible.
  const stack =
    process.env.NODE_ENV === "production" && error instanceof Error
      ? `\n${error.stack}`
      : "";
  console.error(`[integration] ${scope} ${detail}${stack}`);
}

/**
 * The same, for a request that came back with a status rather than throwing.
 *
 * Separate because a 401 from Twitch and a socket timeout are different
 * problems with the same symptom, and telling them apart in the log is the
 * whole point of writing one.
 */
export function logIntegrationStatus(
  scope: string,
  status: number,
  body?: string,
) {
  const extract = body?.slice(0, 200).replace(/\s+/g, " ").trim();
  console.error(
    `[integration] ${scope} responded ${status}${extract ? ` ${extract}` : ""}`,
  );
}

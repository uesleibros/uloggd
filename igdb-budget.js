/**
 * IGDB's request budget: four per second for the whole set of credentials.
 *
 * Kept as a schedule rather than a counter. `take` answers how long the caller
 * must wait before sending, and books that moment, so callers that ask at the
 * same time are spread out instead of all being told "now". The rule is the
 * one IGDB enforces: no more than `limit` sends inside any `windowMs`. On an
 * idle site that lets a page's lookups go together, which is what a page needs:
 * a game page asks four things of IGDB, and with a fixed gap between every
 * request the last of them waited two seconds.
 *
 * One budget serves the whole cluster. The primary owns it and the workers ask
 * it for a slot (see server.js); a worker that each kept a burst of its own
 * would let three workers send three bursts in the same second, which is the
 * 429 this exists to prevent.
 */
function createBudget({ limit = 4, windowMs = 1000, now = Date.now } = {}) {
  const size = Math.max(1, Math.floor(limit));
  // The moments already booked, oldest first; only the last `size` matter.
  const booked = [];
  let heldUntil = 0;

  return {
    /** Milliseconds to wait before sending one request. */
    take() {
      const at = now();
      let slot = Math.max(at, heldUntil);
      // The send `size` places back must have left the window first.
      if (booked.length >= size)
        slot = Math.max(slot, booked[booked.length - size] + windowMs);
      booked.push(slot);
      if (booked.length > size) booked.splice(0, booked.length - size);
      return Math.ceil(slot - at);
    },
    /**
     * Sends nothing for `ms`. IGDB answered 429, so the budget is already spent
     * somewhere this schedule cannot see, and whoever asks next would walk into
     * the same wall.
     */
    hold(ms) {
      heldUntil = Math.max(heldUntil, now() + ms);
    },
  };
}

module.exports = { createBudget };

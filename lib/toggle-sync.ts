/**
 * A toggle that answers the pointer and settles with the server afterwards.
 *
 * The problem this exists for: a control whose state comes back from the
 * server cannot be pressed twice quickly. The first press waits for the
 * request, then for the page to be rendered again, and only then does the
 * prop that the button reads change, so the second press is either ignored or
 * lands on the old state. Meanwhile two requests race, and whichever answers
 * last decides what is in the database, which may be the opposite of what was
 * asked for last.
 *
 * So intent and truth are kept apart. What somebody pressed is the visible
 * state immediately. What the server is known to hold is tracked separately,
 * and one queue walks the difference away: while they disagree, send the
 * operation that makes the server match the intent. Because only one request
 * is ever in flight per key, and the target is read fresh each time round,
 * the last press always wins however many happened while the network was
 * busy.
 *
 * Pure and free of React, because this is the part that is easy to get wrong
 * and hard to see: every case it has to survive is a unit test rather than a
 * rapid double-click somebody has to reproduce by hand.
 */

export type ToggleWrite = (
  key: number,
  desired: boolean,
) => Promise<void> | void;

export type ToggleSyncOptions = {
  /** Sends one state to the server. Must be safe to repeat. */
  write: ToggleWrite;
  /** Called whenever what the viewer should see changes. */
  onVisible?: (key: number, visible: boolean) => void;
  /**
   * Called when a write fails, after the visible state has been put back to
   * what the server is known to hold. The interface says so in its own words.
   */
  onError?: (key: number, error: unknown) => void;
  /** Called when nothing is left in flight, for an eventual resync. */
  onSettled?: () => void;
};

type Entry = {
  /** What the server is known to hold. */
  server: boolean;
  /** What the person last asked for. */
  desired: boolean;
  /** Whether a request for this key is in flight. */
  running: boolean;
};

export class ToggleSync {
  private readonly entries = new Map<number, Entry>();
  private readonly options: ToggleSyncOptions;

  constructor(options: ToggleSyncOptions) {
    this.options = options;
  }

  /** What the viewer should see for one key, pressed or not. */
  visible(key: number, fallback: boolean): boolean {
    return this.entries.get(key)?.desired ?? fallback;
  }

  /** Whether a request for this key is in flight, for a quiet pending mark. */
  pending(key: number): boolean {
    return this.entries.get(key)?.running ?? false;
  }

  /** Whether anything at all is in flight. */
  get busy(): boolean {
    return [...this.entries.values()].some((entry) => entry.running);
  }

  /**
   * Presses the toggle.
   *
   * Returns what the viewer should see now, which is the opposite of what
   * they saw, whatever the network is doing.
   */
  press(key: number, current: boolean): boolean {
    const entry = this.entries.get(key) ?? {
      server: current,
      desired: current,
      running: false,
    };
    entry.desired = !entry.desired;
    this.entries.set(key, entry);
    this.options.onVisible?.(key, entry.desired);
    void this.drain(key);
    return entry.desired;
  }

  /**
   * Adopts a state a fresh render says the server holds, for one key.
   *
   * Two ways to refuse it. While a press is unsettled, a snapshot taken
   * before that press is stale by definition, and letting it win is the
   * flicker where a button bounces back for a moment and then forward again.
   * And once settled, the override is only dropped when the snapshot agrees
   * with what the write returned: a page rendered before the request landed
   * still carries the old answer, and adopting it would undo the press on
   * screen until the next render.
   */
  adopt(key: number, server: boolean): boolean {
    const entry = this.entries.get(key);
    if (!entry) return true;
    if (entry.running || entry.server !== entry.desired) return false;
    if (entry.server !== server) return false;
    this.entries.delete(key);
    return true;
  }

  /** Whether any press is still unsettled, for deciding to adopt a snapshot. */
  get settled(): boolean {
    return [...this.entries.values()].every(
      (entry) => !entry.running && entry.server === entry.desired,
    );
  }

  private async drain(key: number): Promise<void> {
    const entry = this.entries.get(key);
    if (!entry || entry.running) return;
    entry.running = true;
    try {
      // Read the target fresh each time round: a press that happened while
      // the last request was in flight changes what the server should end up
      // holding, and that is the press that must win.
      while (entry.server !== entry.desired) {
        const target = entry.desired;
        await this.options.write(key, target);
        entry.server = target;
      }
    } catch (error) {
      // The server is where it was, so that is what the viewer is shown. An
      // interface that keeps insisting on a state the database refused is
      // worse than one that admits the press did not take.
      entry.desired = entry.server;
      this.options.onVisible?.(key, entry.server);
      this.options.onError?.(key, error);
    } finally {
      entry.running = false;
      // The entry stays after it settles, holding what the press asked for
      // until a render arrives that agrees with it. Dropping it here would
      // hand the button back to a prop that has not caught up yet, which is
      // the same flicker by another route.
      if (this.settled) this.options.onSettled?.();
    }
  }
}

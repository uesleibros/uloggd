const fs = require("node:fs");
const os = require("node:os");

/**
 * How much memory the whole deployment may use, and how to split it.
 *
 * The cluster runs three Next workers, and nothing told any of them how much
 * room there was. Each one sized its own heap from the machine: 4288MB per
 * worker on the machine this was measured on, three of them, inside a
 * container that Square Cloud stops at 3072MB. V8 collects lazily when it is
 * far below its limit, so a worker holding 70MB of live data was measured
 * carrying 210MB of heap it did not need, and nothing ever made it give that
 * back. The three drift upward together until the platform, not Node, decides
 * the process is too big, and it ends the whole container.
 *
 * So the budget is read once, from the most specific source available, and
 * divided before any worker starts.
 */

/** The container's own limit, when the kernel says what it is. */
function readCgroupLimitBytes() {
  const sources = [
    // cgroup v2, which says "max" when there is no limit.
    "/sys/fs/cgroup/memory.max",
    // cgroup v1, which says a number near 2^63 when there is no limit.
    "/sys/fs/cgroup/memory/memory.limit_in_bytes",
  ];
  for (const file of sources) {
    try {
      const raw = fs.readFileSync(file, "utf8").trim();
      if (raw === "max") continue;
      const bytes = Number(raw);
      if (Number.isFinite(bytes) && bytes > 0 && bytes < 2 ** 50) return bytes;
    } catch {
      // Not Linux, or not in a container: the next source decides.
    }
  }
  return null;
}

function positive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

/**
 * The plan for a cluster of `workers`.
 *
 *   budgetMb    what the deployment may use in total
 *   heapMb      each worker's V8 old-space ceiling
 *   rssLimitMb  the resident size at which a worker is replaced
 *
 * Half the budget goes to heaps, because a Next worker carries a great deal
 * outside its heap: compiled code, the card renderer's WebAssembly memory,
 * sharp, and buffers. Three quarters is the point at which a worker is
 * recycled, which leaves room for one replacement to boot beside it and for
 * the cluster primary, with the container's own limit still above all of it.
 *
 * Each figure can be pinned by an environment variable, because the one thing
 * this cannot know for certain is how the platform counts.
 */
function memoryPlan({ workers, env = process.env }) {
  const count = Math.max(1, workers);
  const cgroupBytes = readCgroupLimitBytes();
  // Most specific first: an explicit pin, then what the kernel enforces, then
  // the platform's own MEMORY setting, and the machine only as a last resort,
  // because inside a container the machine is usually somebody else's.
  const budgetMb = Math.floor(
    positive(env.MEMORY_LIMIT_MB) ??
      (cgroupBytes ? cgroupBytes / 1048576 : null) ??
      positive(env.MEMORY) ??
      os.totalmem() / 1048576,
  );

  const heapMb =
    positive(env.WORKER_HEAP_MB) ??
    Math.max(256, Math.floor((budgetMb * 0.5) / count));

  const rssLimitMb =
    positive(env.WORKER_RSS_LIMIT_MB) ??
    Math.max(heapMb + 192, Math.floor((budgetMb * 0.75) / count));

  return { budgetMb, heapMb, rssLimitMb };
}

module.exports = { memoryPlan, readCgroupLimitBytes };

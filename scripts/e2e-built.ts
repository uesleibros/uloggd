import { spawn } from "node:child_process";

/**
 * Runs the browser suite against a built server instead of `next dev`.
 *
 * The suite has two honest modes and one dishonest one. Against a built
 * server every route answers from a compiled bundle, so a slow test is a slow
 * page and the timings mean something. Against `next dev` the first request
 * for a route pays for compiling it, fifteen to twenty seconds on a cold
 * cache, so the first test to touch each route fails on its budget rather
 * than on its subject, and passes on a second run once the cache is warm.
 * That second run is the dishonest one: it is the same suite reporting a
 * different answer because of what happened before it.
 *
 * Dev is still the right mode while writing a test, because it picks up an
 * edit without a rebuild. This is the mode for believing the result.
 *
 * The environment variable is all this does. It exists as a script because
 * setting one before a command is shell-specific, and this repository is
 * worked on from PowerShell and from bash on the same machine.
 */
// `shell: true` because on Windows `npx` is a batch file, and Node refuses to
// spawn one directly.
const child = spawn("npx playwright test " + process.argv.slice(2).join(" "), {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, ULOGGD_E2E_BUILT: "1" },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});

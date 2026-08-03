import { readFile } from "node:fs/promises";
import { execSync } from "node:child_process";

/** Rules that target a button/summary but never declare a cursor. */
const files = execSync("ls app/globals.css app/\\[lang\\]/*.css app/\\[lang\\]/**/*.css 2>/dev/null", { encoding: "utf8", shell: "/bin/bash" }).trim().split("\n").filter(Boolean);
const seen = new Set<string>();
for (const file of files) {
  const css = await readFile(file, "utf8");
  // Split into rules crudely: selector { ...decls }
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1].trim().replace(/\s+/g, " ");
    const body = match[2];
    if (!/\bbutton\b|\bsummary\b|\[role="button"\]/.test(selector)) continue;
    // Skip states: they inherit the cursor from the base rule.
    if (/:hover|:focus|:active|:disabled|\[data-|@|:not\(/.test(selector)) continue;
    if (/cursor\s*:/.test(body)) continue;
    // Only rules that actually paint a control, not one-off tweaks.
    if (!/(background|border|padding|min-height|display)\s*:/.test(body)) continue;
    if (seen.has(selector)) continue;
    seen.add(selector);
    console.log(`${file}\t${selector}`);
  }
}
console.log(`\n${seen.size} rules paint a control without a cursor`);

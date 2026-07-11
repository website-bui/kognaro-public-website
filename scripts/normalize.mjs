// Normalizes v5.md (the pandoc-exported source-of-record) into v5-normalized.md,
// which is the input for the HTML conversion. v5.md itself is never modified.
//
// Usage: node scripts/normalize.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(root, "v5.md"), "utf8");

const affected = [];

// INTENT: convert CRLF (and stray CR) line endings to LF so every downstream
// tool sees one canonical line ending regardless of the Windows export.
let out = src.replace(/\r\n?/g, "\n");

// INTENT: the pandoc export backslash-escaped every apostrophe and double
// quote (\' \") — plain markdown needs none of that, and leaving them in
// renders literal backslashes. Unescape both.
out = out.replace(/\\(['"])/g, "$1");

// INTENT: the export uses ASCII '---' where the author wrote an em-dash.
// Replace with a true em-dash (—). Restricted to '---' that is NOT alone on
// its own line, so a markdown thematic break / frontmatter fence would
// survive (v5.md has none, but the guard costs nothing).
out = out.replace(/^(?!---$)(.*?)---/gm, (m, pre) => pre + "—");
// A line may contain several '---'; run to fixpoint.
while (/^(?!---$).*---/m.test(out)) {
  out = out.replace(/^(?!---$)(.*?)---/gm, (m, pre) => pre + "—");
}

// Collect a before/after sample of lines the transforms touched.
const beforeLines = src.replace(/\r\n?/g, "\n").split("\n");
const afterLines = out.split("\n");
for (let i = 0; i < beforeLines.length && affected.length < 5; i++) {
  if (beforeLines[i] !== afterLines[i]) {
    affected.push({ line: i + 1, before: beforeLines[i], after: afterLines[i] });
  }
}

// INTENT: write UTF-8 with no BOM (Node's default for writeFileSync) and make
// sure the file ends with exactly one trailing newline.
out = out.replace(/\n*$/, "\n");
writeFileSync(join(root, "v5-normalized.md"), out, "utf8");

console.log("Wrote v5-normalized.md");
console.log("\n=== BEFORE/AFTER SAMPLE (first 5 affected lines) ===");
for (const a of affected) {
  console.log(`\n--- line ${a.line} ---`);
  console.log("BEFORE: " + a.before.slice(0, 200));
  console.log("AFTER : " + a.after.slice(0, 200));
}

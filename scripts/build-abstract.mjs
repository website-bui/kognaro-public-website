// Generates whitepaper/abstract-print.html (git-ignored) from abstract.md —
// the one-page executive abstract rendered to whitepaper/kognaro-abstract.pdf
// via scripts/render-pdf.mjs --no-footer. The abstract text is final and
// approved: this script does layout and typographic conversion ONLY, no
// wording changes.
//
// Usage: node scripts/build-abstract.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const md = readFileSync(join(root, "abstract.md"), "utf8").replace(/\r\n?/g, "\n");

const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// INTENT: same inline conversion as the paper builders — emphasis + dash
// cleanup only (the abstract already carries real em-dashes and curly
// apostrophes).
const inline = (s) => {
  let t = escapeHtml(s);
  t = t.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  t = t.replace(/ -- /g, " – ");
  t = t.replace(/(\d)--(\d)/g, "$1–$2");
  return t;
};

// Paragraph-split the document. Structure (validated below):
//   [0] "# Trust Is Structural — Executive Abstract"   → title + doc label
//   [1] "**Semantic AI … · July 2026**"                → meta line
//   [..] body paragraphs
//   [n-2] "**Full paper: kognaro.com/whitepaper**"     → footer link
//   [n-1] "*Kognaro — Your AI. Your Data. Your Terms.*"→ footer tagline
const paras = md.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

const h1 = paras[0].match(/^#\s+(.*?)\s+—\s+(.*)$/);
if (!h1) throw new Error("unexpected H1 shape in abstract.md");
const [, title, docLabel] = h1;

const meta = paras[1].replace(/^\*\*|\*\*$/g, "");

const fullPaperIdx = paras.findIndex((p) => p.startsWith("**Full paper:"));
const taglineIdx = paras.length - 1;
if (fullPaperIdx !== paras.length - 2) throw new Error("'Full paper' line not where expected in abstract.md");
const fullPaper = paras[fullPaperIdx].replace(/^\*\*|\*\*$/g, "");
const tagline = paras[taglineIdx].replace(/^\*|\*$/g, "");

const body = paras.slice(2, fullPaperIdx).map((p) => {
  const one = p.replace(/\n/g, " ");
  // INTENT: the standalone bold operating-rule line gets its display class.
  const cls = /^\*\*[^*]+\*\*$/.test(one) && one.includes("→") ? ' class="rule-line"' : "";
  return `<p${cls}>${inline(one)}</p>`;
});

const mark = `<svg class="kg-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M22 12a1 1 0 0 1-10 0 1 1 0 0 0-10 0"/>
        <path d="M7 20.7a1 1 0 1 1 5-8.7 1 1 0 1 0 5-8.6"/>
        <path d="M7 3.3a1 1 0 1 1 5 8.6 1 1 0 1 0 5 8.6"/>
        <circle cx="12" cy="12" r="10"/>
      </svg>`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Trust Is Structural — Executive Abstract (print)</title>
  <link rel="stylesheet" href="../assets/css/print.css">
  <link rel="stylesheet" href="../assets/css/abstract.css">
</head>
<body>
  <div class="abs">
    <div class="topline">
      <span class="lockup">
        ${mark}
        <span class="kg-wordmark">Kognaro</span>
      </span>
      <span class="doc-label">${escapeHtml(docLabel)}</span>
    </div>

    <h1>${escapeHtml(title)}</h1>
    <p class="meta">${escapeHtml(meta)}</p>
    <hr class="title-rule">

${body.map((l) => "    " + l).join("\n")}

    <div class="foot">
      <p class="full-paper"><a href="https://kognaro.com/whitepaper/">${inline(fullPaper)}</a></p>
      <p class="tagline">${escapeHtml(tagline)}</p>
    </div>
  </div>
</body>
</html>
`;

writeFileSync(join(root, "whitepaper", "abstract-print.html"), html, "utf8");
console.log(`Wrote whitepaper/abstract-print.html — ${body.length} body paragraphs`);

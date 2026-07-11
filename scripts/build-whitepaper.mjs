// Converts v5-normalized.md into whitepaper/index.html: a reading layout with
// a sticky sidebar TOC built from H1/H2, heading id anchors, and the paper
// header block. Self-contained — no npm dependencies (the paper uses only
// headings, paragraphs, emphasis, simple lists, and one pandoc underline span).
//
// Usage: node scripts/build-whitepaper.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const md = readFileSync(join(root, "v5-normalized.md"), "utf8");
const lines = md.split("\n");

// INTENT: the exported front matter (title/subtitle/date, lines up to the
// first heading) is rebuilt as the styled header block, and the "# Contents"
// section is dropped because the sidebar TOC replaces it. Body starts at the
// first numbered section heading.
const bodyStart = lines.findIndex((l) => l.startsWith("# 1."));
if (bodyStart < 0) throw new Error("could not find '# 1.' section start");
const body = lines.slice(bodyStart);

const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// INTENT: inline markdown → HTML. Order matters: escape first, then the
// pandoc [text]{.underline} span, then *** ** * emphasis, then ' -- ' → en
// dash (the one construct normalize.mjs deliberately leaves alone).
const inline = (s) => {
  let t = escapeHtml(s);
  t = t.replace(/\[([^\]]+)\]\{\.underline\}/g, "<u>$1</u>");
  t = t.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  t = t.replace(/ -- /g, " – ");
  // INTENT: numeric ranges the normalizer leaves alone ("§7--8") — en dash.
  t = t.replace(/(\d)--(\d)/g, "$1–$2");
  return t;
};

// INTENT: stable, readable id slugs for heading anchors: lowercase, strip
// markdown emphasis and punctuation, spaces → hyphens.
const slugCounts = new Map();
const slugify = (s) => {
  let slug = s
    .toLowerCase()
    .replace(/\*|_/g, "")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const n = slugCounts.get(slug) ?? 0;
  slugCounts.set(slug, n + 1);
  return n === 0 ? slug : `${slug}-${n}`;
};

const toc = []; // { level, text, id }
const out = [];
let para = [];
let list = null; // { tag, items }

const flushPara = () => {
  if (para.length) {
    out.push(`<p>${inline(para.join(" "))}</p>`);
    para = [];
  }
};
const flushList = () => {
  if (list) {
    out.push(`<${list.tag}>`);
    for (const it of list.items) out.push(`  <li>${inline(it)}</li>`);
    out.push(`</${list.tag}>`);
    list = null;
  }
};

for (const raw of body) {
  const line = raw.trimEnd();
  const h = line.match(/^(#{1,3})\s+(.*)$/);
  if (h) {
    flushPara(); flushList();
    const level = h[1].length;
    const text = h[2].trim();
    const id = slugify(text);
    if (level <= 2) toc.push({ level, text: text.replace(/\*|_/g, ""), id });
    // INTENT: headings are self-links so readers can copy an anchor URL.
    out.push(`<h${level} id="${id}"><a class="headlink" href="#${id}">${inline(text)}</a></h${level}>`);
    continue;
  }
  const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
  if (bullet) {
    flushPara();
    if (!list || list.tag !== "ul") { flushList(); list = { tag: "ul", items: [] }; }
    list.items.push(bullet[1]);
    continue;
  }
  const quoted = line.match(/^>\s?(.*)$/);
  if (quoted) {
    flushPara(); flushList();
    out.push(`<blockquote><p>${inline(quoted[1])}</p></blockquote>`);
    continue;
  }
  if (line === "") { flushPara(); flushList(); continue; }
  para.push(line.trim());
}
flushPara(); flushList();

// INTENT: reading time from the body word count at 225 wpm (mid-range of the
// common 200–250 convention), rounded to the nearest 5 for honesty.
const words = body.join(" ").split(/\s+/).filter(Boolean).length;
const minutes = Math.round(words / 225 / 5) * 5;

// TOC markup: nested <ol> of H1 entries with H2 children.
const tocParts = [];
let openSub = false;
for (const e of toc) {
  if (e.level === 1) {
    if (openSub) { tocParts.push("</ol></li>"); openSub = false; }
    else if (tocParts.length) tocParts.push("</li>");
    tocParts.push(`<li><a href="#${e.id}">${escapeHtml(e.text)}</a>`);
  } else {
    if (!openSub) { tocParts.push("<ol>"); openSub = true; }
    tocParts.push(`<li><a href="#${e.id}">${escapeHtml(e.text)}</a></li>`);
  }
}
if (openSub) tocParts.push("</ol></li>");
else if (tocParts.length) tocParts.push("</li>");
const tocHtml = tocParts.join("\n        ");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Trust Is Structural — Kognaro Whitepaper</title>
  <meta name="description" content="Semantic AI as the Fabric of the Business: an architectural framework for governed enterprise AI. Why trust in operational AI is produced by structure — explicit meaning, owned data, and auditable execution — not by model capability.">
  <link rel="canonical" href="https://kognaro.com/whitepaper/">
  <link rel="icon" type="image/png" sizes="256x256" href="/assets/favicon.png">

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Kognaro">
  <meta property="og:title" content="Trust Is Structural — Semantic AI as the Fabric of the Business">
  <meta property="og:description" content="An architectural framework for governed enterprise AI: explicit meaning, customer-owned data, and execution only under recorded authority.">
  <meta property="og:url" content="https://kognaro.com/whitepaper/">
  <meta property="og:image" content="https://kognaro.com/assets/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <!-- Twitter card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Trust Is Structural — Semantic AI as the Fabric of the Business">
  <meta name="twitter:description" content="An architectural framework for governed enterprise AI: explicit meaning, customer-owned data, and execution only under recorded authority.">
  <meta name="twitter:image" content="https://kognaro.com/assets/og-image.png">

  <link rel="stylesheet" href="/assets/css/site.css">
  <!-- analytics: snippet goes here (none yet) -->
</head>
<body class="paper">
  <div class="topbar">
    <a class="lockup" href="/">
      <svg class="kg-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M22 12a1 1 0 0 1-10 0 1 1 0 0 0-10 0"/>
        <path d="M7 20.7a1 1 0 1 1 5-8.7 1 1 0 1 0 5-8.6"/>
        <path d="M7 3.3a1 1 0 1 1 5 8.6 1 1 0 1 0 5 8.6"/>
        <circle cx="12" cy="12" r="10"/>
      </svg>
      <span class="kg-wordmark">Kognaro</span>
    </a>
    <a class="back" href="/">kognaro.com</a>
  </div>

  <div class="paper-layout">
    <details class="toc" id="toc" open>
      <summary>Contents</summary>
      <nav class="toc-body" aria-label="Table of contents">
        <span class="kg-label">Contents</span>
        <ol>
        ${tocHtml}
        </ol>
      </nav>
    </details>

    <article class="article">
      <header class="paper-head">
        <span class="kg-label">A Framework White Paper</span>
        <h1>Trust Is Structural</h1>
        <p class="subtitle">Semantic AI as the Fabric of the Business</p>
        <p class="subsubtitle">An Architectural Framework for Governed Enterprise AI</p>
        <p class="meta"><span>July 2026</span><span>~${minutes} min read</span><span>${words.toLocaleString("en-US")} words</span></p>
        <a class="btn btn-clay" href="/whitepaper/kognaro-trust-is-structural.pdf" download>Download PDF</a>
        <hr>
      </header>

${out.map((l) => "      " + l).join("\n")}
    </article>
  </div>

  <footer>© 2026 Kognaro — <a href="mailto:hello@kognaro.com">hello@kognaro.com</a></footer>

  <script src="/assets/js/toc.js"></script>
</body>
</html>
`;

mkdirSync(join(root, "whitepaper"), { recursive: true });
writeFileSync(join(root, "whitepaper", "index.html"), html, "utf8");
console.log(`Wrote whitepaper/index.html — ${words} words, ~${minutes} min, ${toc.length} TOC entries`);

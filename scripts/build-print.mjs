// Generates whitepaper/print.html (git-ignored) from v5-normalized.md — the
// print-layout document that headless Edge renders to
// whitepaper/kognaro-trust-is-structural.pdf. Layout/styling lives in
// assets/css/print.css. Conversion rules match build-whitepaper.mjs.
//
// Usage: node scripts/build-print.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const md = readFileSync(join(root, "v5-normalized.md"), "utf8");
const lines = md.split("\n");

// INTENT: same body slicing as the web build — front matter becomes the
// cover, the markdown "# Contents" section is replaced by the styled TOC
// page, body starts at the first numbered section.
const bodyStart = lines.findIndex((l) => l.startsWith("# 1."));
if (bodyStart < 0) throw new Error("could not find '# 1.' section start");
const body = lines.slice(bodyStart);

const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// INTENT: identical inline-markdown handling to the web build so the PDF and
// the HTML page never disagree: underline span, *** ** * emphasis, ' -- ' →
// en dash.
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

// INTENT: heading id slugs (same scheme as build-whitepaper.mjs) so TOC
// anchors survive into the PDF as clickable internal links — Chromium's
// print engine converts same-document <a href="#id"> into PDF GoTo links.
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

const toc = [];
const out = [];
let para = [];
let list = null;

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
    // INTENT: headings link BACK to the Contents page (invisible styling) so
    // navigation works both ways in the PDF: TOC → section, heading → TOC.
    out.push(`<h${level} id="${id}"><a class="toclink" href="#toc">${inline(text)}</a></h${level}>`);
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

// TOC markup — H1 entries with nested H2 children. Chromium's print engine
// cannot generate page numbers in CSS, so they come from
// whitepaper/toc-pages.json: an array parallel to the TOC entries, measured
// off a first (numberless) rendering pass by extracting each heading's page.
// Absent that file, entries render without numbers (first pass).
let pages = null;
try {
  pages = JSON.parse(readFileSync(join(root, "whitepaper", "toc-pages.json"), "utf8"));
  if (!Array.isArray(pages) || pages.length !== toc.length) {
    throw new Error(`toc-pages.json has ${pages?.length} entries, TOC has ${toc.length}`);
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const entryRow = (text, i) =>
  pages
    ? `<a class="row" href="#${toc[i].id}">${escapeHtml(text)}<span class="leader"></span><span class="pg">${pages[i]}</span></a>`
    : `<a class="row" href="#${toc[i].id}">${escapeHtml(text)}</a>`;
const tocParts = [];
let openSub = false;
for (let i = 0; i < toc.length; i++) {
  const e = toc[i];
  if (e.level === 1) {
    if (openSub) { tocParts.push("</ol></li>"); openSub = false; }
    else if (tocParts.length) tocParts.push("</li>");
    tocParts.push(`<li>${entryRow(e.text, i)}`);
  } else {
    if (!openSub) { tocParts.push("<ol>"); openSub = true; }
    tocParts.push(`<li>${entryRow(e.text, i)}</li>`);
  }
}
if (openSub) tocParts.push("</ol></li>");
else if (tocParts.length) tocParts.push("</li>");

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
  <title>Trust Is Structural — Kognaro Whitepaper (print)</title>
  <link rel="stylesheet" href="../assets/css/print.css">
</head>
<body>
  <section class="cover">
    ${mark}
    <div class="kg-wordmark">Kognaro</div>
    <hr class="rule">
    <h1>Trust Is Structural</h1>
    <p class="subtitle">Semantic AI as the Fabric of the Business</p>
    <p class="subsubtitle">An Architectural Framework for Governed Enterprise AI</p>
    <div class="meta">A Framework White Paper · July 2026</div>
    <a class="site" href="https://kognaro.com">kognaro.com</a>
  </section>

  <section class="toc-page" id="toc">
    <div class="toc-title">Contents</div>
    <ol>
    ${tocParts.join("\n    ")}
    </ol>
  </section>

  <article class="body-copy">
${out.map((l) => "    " + l).join("\n")}
  </article>
</body>
</html>
`;

writeFileSync(join(root, "whitepaper", "print.html"), html, "utf8");
console.log(`Wrote whitepaper/print.html — ${toc.length} TOC entries` + (pages ? " (with page numbers)" : " (no page numbers yet)"));

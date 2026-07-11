// Renders whitepaper/print.html to PDF with headless Edge, driven over the
// DevTools protocol (Page.printToPDF) instead of the --print-to-pdf CLI flag.
// The CLI flag cannot draw per-page footers: Chromium's print engine supports
// neither @page margin-boxes nor page-anchored position:fixed, so the footer
// must be the engine's native footerTemplate — only reachable via CDP. This
// also provides page numbers. No npm dependencies (Node >= 22: global fetch
// + WebSocket).
//
// Usage: node scripts/render-pdf.mjs <input.html> <output.pdf> [--no-footer]
//   --no-footer: omit the native footer band (used by the one-page abstract,
//   whose closing lines are the footer).
import { spawn } from "node:child_process";
import { writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const [inputHtml, outputPdf, footerFlag] = process.argv.slice(2);
if (!inputHtml || !outputPdf) {
  console.error("usage: node scripts/render-pdf.mjs <input.html> <output.pdf> [--no-footer]");
  process.exit(1);
}
const showFooter = footerFlag !== "--no-footer";

const EDGE_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];
const browser = EDGE_PATHS.find(existsSync);
if (!browser) throw new Error("no headless Edge/Chrome found");

// INTENT: footer identical on every page — brand line centered, page/total
// right. Header/footer templates render outside the document so only system
// fonts are available; Consolas stands in for IBM Plex Mono. Colors are the
// Travertine bronze.
const FOOTER = `
<div style="width:100%; font-size:8px; font-family:Consolas,'Courier New',monospace;
            letter-spacing:1.5px; color:#8A7355; text-transform:uppercase;
            text-align:center; padding:0 0.75in; position:relative;">
  Kognaro &#8212; Trust Is Structural &#8212; kognaro.com
  <span style="position:absolute; right:0.75in;"><span class="pageNumber"></span>/<span class="totalPages"></span></span>
</div>`;

const PORT = 9377;
const profile = mkdtempSync(join(tmpdir(), "kognaro-pdf-"));
const proc = spawn(browser, [
  "--headless",
  "--disable-gpu",
  "--allow-file-access-from-files",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// INTENT: minimal flat-session CDP client over the built-in WebSocket.
let ws, nextId = 1;
const pending = new Map();
const send = (method, params = {}, sessionId) =>
  new Promise((res, rej) => {
    const id = nextId++;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

try {
  // wait for the debugger endpoint
  let version = null;
  for (let i = 0; i < 60 && !version; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); }
    catch { await sleep(250); }
  }
  if (!version) throw new Error("Edge debugger endpoint never came up");

  ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    }
  };

  const fileUrl = pathToFileURL(resolve(inputHtml)).href;
  const { targetId } = await send("Target.createTarget", { url: fileUrl });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });

  // INTENT: don't print until the document AND its webfonts are ready —
  // otherwise text measures with fallback metrics and reflows.
  for (let i = 0; i < 40; i++) {
    const { result } = await send("Runtime.evaluate", {
      expression: "document.fonts.ready.then(() => document.readyState)",
      awaitPromise: true,
    }, sessionId);
    if (result.value === "complete") break;
    await sleep(250);
  }

  // INTENT: margins live HERE, not in @page CSS (the native footer draws
  // inside the engine-owned margin band): 2cm sides/top; the bottom is
  // 2.8cm only when the footer band needs the room, symmetric 2cm otherwise.
  const CM = 1 / 2.54; // inches
  const { data } = await send("Page.printToPDF", {
    printBackground: true,
    preferCSSPageSize: false,
    paperWidth: 8.5,
    paperHeight: 11,
    marginTop: 2 * CM,
    marginLeft: 2 * CM,
    marginRight: 2 * CM,
    marginBottom: (showFooter ? 2.8 : 2) * CM,
    displayHeaderFooter: showFooter,
    headerTemplate: "<span></span>",
    footerTemplate: showFooter ? FOOTER : "<span></span>",
  }, sessionId);

  writeFileSync(resolve(outputPdf), Buffer.from(data, "base64"));
  console.log(`Wrote ${outputPdf}`);
  await send("Browser.close").catch(() => {});
} finally {
  proc.kill();
  await sleep(500);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}

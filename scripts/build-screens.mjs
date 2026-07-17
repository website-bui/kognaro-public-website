// INTENT: authoring-time image pipeline for the /build page. Reads the
// original screenshots from assets/build/src/, crops the top browser
// chrome (per-image cropTop from the manifest), resizes, and writes
// optimized WebP plus a PNG fallback to assets/build/. Run it after
// dropping or swapping any source image:
//
//   npm run build-screens
//
// The originals in assets/build/src/ are gitignored on purpose: they may
// show the hosted URL bar, so only the cropped outputs are ever committed
// or deployed. This script is an authoring tool, like the whitepaper
// builders; it is not part of the deploy.

import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { builtScreens, appScreens } from "../assets/js/build-screens.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = path.join(ROOT, "assets", "build", "src");
const OUT_DIR = path.join(ROOT, "assets", "build");

// INTENT: built screens are full browser captures shown large (cap 1600px
// wide, sharp on 2x displays); app screens are phone renders shown small
// (cap 900px wide).
const JOBS = [
  ...builtScreens.map((entry) => ({ ...entry, kind: "built", maxWidth: 1600 })),
  ...appScreens.map((entry) => ({ ...entry, kind: "app", maxWidth: 900 })),
  // INTENT: the founder photo rides the same pipeline for optimization
  // only (no crop); it renders at 168px wide, so 480px covers 2x displays.
  { image: "founder", kind: "photo", maxWidth: 480, cropTop: 0 },
];

function kb(filePath) {
  return `${(statSync(filePath).size / 1024).toFixed(1)} KB`;
}

async function processJob(job) {
  const srcPath = path.join(SRC_DIR, `${job.image}.png`);
  if (!existsSync(srcPath)) {
    console.warn(`SKIP  ${job.image}: no source at assets/build/src/${job.image}.png`);
    return null;
  }

  const cropTop = job.cropTop ?? 0;
  if (job.kind === "built" && cropTop === 0) {
    console.warn(`WARN  ${job.image}: cropTop is 0; the browser URL bar may still be visible. Set cropTop in assets/js/build-screens.js.`);
  }

  // INTENT: crop the top strip out of the pixels entirely (not CSS
  // masking), so the URL bar never ships in the deployed asset.
  const meta = await sharp(srcPath).metadata();
  let image = sharp(srcPath).extract({
    left: 0,
    top: cropTop,
    width: meta.width,
    height: meta.height - cropTop,
  });
  if (meta.width > job.maxWidth) {
    image = image.resize({ width: job.maxWidth });
  }

  const webpPath = path.join(OUT_DIR, `${job.image}.webp`);
  const pngPath = path.join(OUT_DIR, `${job.image}.png`);
  await image.clone().webp({ quality: 82 }).toFile(webpPath);
  await image.clone().png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(pngPath);

  return {
    image: job.image,
    source: `${meta.width}x${meta.height}`,
    cropTop,
    webp: kb(webpPath),
    png: kb(pngPath),
  };
}

mkdirSync(SRC_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const results = [];
for (const job of JOBS) {
  const result = await processJob(job);
  if (result) results.push(result);
}

if (results.length > 0) {
  console.log("\nFinal file sizes (commit the files in assets/build/):");
  console.table(results);
} else {
  console.log("\nNo images processed. Drop source PNGs into assets/build/src/ first.");
}

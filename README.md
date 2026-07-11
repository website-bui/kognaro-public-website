# Kognaro — Public Website

The public site for [Kognaro](https://kognaro.com): a single-screen landing page and the full *Trust Is Structural* framework whitepaper as HTML. Plain HTML + one CSS file + minimal vanilla JS — **no framework and no build step; the repo root is the deployable site.** Brand (Travertine palette, Space Grotesk / IBM Plex Mono, typeset wordmark) is extracted from the Kognaro console design system; fonts are self-hosted in `assets/fonts/`. The pinwheel mark is the console brand lockup's glyph (Lucide `loader-pinwheel`, ISC license) in the clay accent — `assets/logo.svg`.

## Layout

- `index.html` — landing page
- `whitepaper/index.html` — the whitepaper (generated from `v5-normalized.md` by `scripts/build-whitepaper.mjs`)
- `v5.md` — whitepaper source-of-record (pandoc export, committed unmodified)
- `v5-normalized.md` — normalized copy (`scripts/normalize.mjs`: LF endings, unescaped quotes, real em-dashes, UTF-8 no BOM)
- `assets/` — CSS, fonts, favicon, og-image
- `scripts/` — one-time authoring tools (normalize → build → image templates); not needed to deploy

> **Note:** the whitepaper page links to `/whitepaper/kognaro-trust-is-structural.pdf`. The PDF is added by a later task, so that link 404s for now.

To regenerate the whitepaper HTML after editing the markdown:

```
node scripts/normalize.mjs && node scripts/build-whitepaper.mjs
```

## Deploy — Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Select the `kognaro-public-website` repo and the `main` branch.
3. Build settings: **Framework preset: None**, **Build command: (leave empty)**, **Build output directory: `/`**.
4. Deploy, then verify the `*.pages.dev` preview URL.
5. **Custom domain:** Pages project → Custom domains → add `kognaro.com` (and `www.kognaro.com` if desired). If the domain's DNS is on Cloudflare, the CNAME records are created automatically; otherwise follow the CNAME instructions shown.

### Redirects for the other domains

`kognaro.ai`, `kognaro.io`, and `kognaro.dev` should 301-redirect to `https://kognaro.com`. With those zones on Cloudflare, add a **Bulk Redirect** (or a Redirect Rule per zone): match `*<domain>/*` → `https://kognaro.com/${2}` (or simply `https://kognaro.com/$1`), status **301**, preserve path + query. Each zone needs a proxied DNS record (e.g. `A @ 192.0.2.1`, orange-cloud on) for the rule to trigger.

<!-- analytics: no analytics configured yet; when added, also insert the snippet placeholders in both HTML pages -->

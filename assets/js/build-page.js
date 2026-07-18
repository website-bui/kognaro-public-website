// INTENT: render the manifest-driven sections of /build (built screens,
// app strip, capability grid) and wire the interest form to a direct
// client-side Supabase insert. All copy that can change lives in the
// manifest or in the constants below, not in generated markup.
import { builtScreens, appScreens, capabilities } from "/assets/js/build-screens.js";

const IMG_BASE = "/assets/build/";

// INTENT: the dedicated design-partner Supabase project (NOT the main
// application database). Paste both values between the quotes; find them
// in Supabase under Project Settings > API. The anon key is a publishable
// key and safe to ship in this file: the table's RLS policy allows INSERT
// only, so this key can write submissions but can never read them back.
const SUPABASE_URL = "https://qmcpshysawnvchayivyu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_miLsaMUeEuBD1SgdalQCPg_A-doUTST";

// INTENT: the only user-facing strings authored in JS, kept here so a copy
// edit is a one-line change.
const MSG_INVALID = "Please fill in your name, a valid email address, and your technical comfort.";
const MSG_FAILED = "Something went wrong and your submission was not saved. Please try again in a moment; everything you typed is still here.";

// INTENT: shared <picture> builder: WebP with PNG fallback, lazy-loaded
// because every manifest image sits below the fold.
function buildPicture(entry) {
  const picture = document.createElement("picture");
  const source = document.createElement("source");
  source.type = "image/webp";
  source.srcset = `${IMG_BASE}${entry.image}.webp`;
  const img = document.createElement("img");
  img.src = `${IMG_BASE}${entry.image}.png`;
  img.alt = entry.alt;
  img.loading = "lazy";
  img.decoding = "async";
  picture.append(source, img);
  return picture;
}

// INTENT: "What I have built." bands, one per manifest entry, alternating
// caption side on desktop.
function renderBuiltScreens() {
  const host = document.getElementById("built-bands");
  builtScreens.forEach((entry, i) => {
    const band = document.createElement("article");
    band.className = i % 2 === 0 ? "bp-shot" : "bp-shot bp-shot-flip";

    const caption = document.createElement("div");
    caption.className = "bp-shot-caption";
    const title = document.createElement("h3");
    title.textContent = entry.title;
    const body = document.createElement("p");
    body.textContent = entry.body;
    caption.append(title, body);

    const figure = document.createElement("figure");
    figure.className = "bp-shot-figure";
    figure.append(buildPicture(entry));

    band.append(figure, caption);
    host.append(band);
  });
}

// INTENT: the app strip; each render sits in a uniform phone-frame tile.
function renderAppScreens() {
  const host = document.getElementById("app-strip");
  appScreens.forEach((entry) => {
    const frame = document.createElement("div");
    frame.className = "bp-app-frame";
    frame.setAttribute("role", "listitem");
    frame.append(buildPicture(entry));
    host.append(frame);
  });
}

// INTENT: form wiring. Client-side validation, JSON POST to the Pages
// Function, success state swaps in place, failure keeps everything typed.
function wireForm() {
  const form = document.getElementById("interest-form");
  const success = document.getElementById("form-success");
  const errorBox = document.getElementById("form-error");
  const submit = form.querySelector(".bp-submit");
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.hidden = true;

    const fields = {
      name: form.elements.name.value.trim(),
      company: form.elements.company.value.trim(),
      email: form.elements.email.value.trim(),
      automate_first: form.elements.automate_first.value.trim(),
      technical_comfort: form.elements.technical_comfort.value,
      why_interested: form.elements.why_interested.value.trim(),
      website: form.elements.website.value,
    };

    // INTENT: client-side validation; mark offending fields and stop.
    let valid = true;
    for (const [name, ok] of [
      ["name", fields.name.length > 0],
      ["email", emailPattern.test(fields.email)],
      ["technical_comfort", fields.technical_comfort.length > 0],
    ]) {
      form.elements[name].closest(".bp-field").classList.toggle("bp-field-invalid", !ok);
      if (!ok) valid = false;
    }
    if (!valid) {
      showError(MSG_INVALID);
      return;
    }

    // INTENT: honeypot filled means a bot; show success, store nothing.
    if (fields.website.length > 0) {
      form.hidden = true;
      success.hidden = false;
      return;
    }

    submit.disabled = true;
    try {
      // INTENT: insert via Supabase's REST API as the anon role. Only real
      // table columns go in the payload, never the honeypot field; empty
      // optional fields are stored as null.
      const response = await fetch(`${SUPABASE_URL}/rest/v1/design_partner_interest`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          name: fields.name,
          company: fields.company || null,
          email: fields.email,
          automate_first: fields.automate_first || null,
          technical_comfort: fields.technical_comfort,
          why_interested: fields.why_interested || null,
        }),
      });
      if (!response.ok) throw new Error(`status ${response.status}`);
      // INTENT: success replaces the form in place; nothing to preserve.
      form.hidden = true;
      success.hidden = false;
    } catch {
      // INTENT: failure never clears the form; the typed values stay put.
      showError(MSG_FAILED);
      submit.disabled = false;
    }
  });
}

// INTENT: capability grid; name emphasized, description as body text.
function renderCapabilities() {
  const host = document.getElementById("capability-grid");
  capabilities.forEach((entry) => {
    const cell = document.createElement("div");
    cell.className = "bp-cap-cell";
    const name = document.createElement("h3");
    name.textContent = entry.name;
    const description = document.createElement("p");
    description.textContent = entry.description;
    cell.append(name, description);
    host.append(cell);
  });
}

renderBuiltScreens();
renderAppScreens();
renderCapabilities();
wireForm();

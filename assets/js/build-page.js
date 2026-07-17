// INTENT: render the two manifest-driven sections of /build (built screens,
// app strip) and wire the interest form to the Pages Function at
// /api/interest. All copy that can change lives in the manifest or in the
// constants below, not in generated markup.
import { builtScreens, appScreens, capabilities } from "/assets/js/build-screens.js";

const IMG_BASE = "/assets/build/";

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

    submit.disabled = true;
    try {
      const response = await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
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

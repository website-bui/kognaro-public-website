// INTENT: Cloudflare Pages Function for the /build interest form. Relays a
// validated JSON submission into the dedicated Supabase project (NOT the
// main application database) via PostgREST. The Supabase URL and anon key
// come from Pages dashboard environment variables and are never shipped to
// the browser:
//   SUPABASE_URL       e.g. https://xxxx.supabase.co
//   SUPABASE_ANON_KEY  the project's anon (publishable) key
// Set both under: Pages project > Settings > Environment variables, for
// Production and Preview.

const COMFORT_OPTIONS = [
  "I write code",
  "I'm technical but don't code daily",
  "I'm hands-on but not technical",
];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// INTENT: normalize a value to a trimmed, length-capped string; anything
// that is not a string becomes empty.
function asText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function onRequestPost({ request, env }) {
  // INTENT: fail closed if the function is not configured.
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    console.error("interest: SUPABASE_URL / SUPABASE_ANON_KEY not configured");
    return json(500, { ok: false });
  }

  // INTENT: only well-formed JSON bodies proceed.
  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false });
  }
  if (typeof body !== "object" || body === null) {
    return json(400, { ok: false });
  }

  // INTENT: honeypot; bots that filled the hidden field get a quiet 200
  // and nothing is stored.
  if (typeof body.website === "string" && body.website.length > 0) {
    return json(200, { ok: true });
  }

  // INTENT: server-side validation mirrors the client and is authoritative.
  const row = {
    name: asText(body.name, 200),
    company: asText(body.company, 200) || null,
    email: asText(body.email, 320),
    automate_first: asText(body.automate_first, 5000) || null,
    technical_comfort: asText(body.technical_comfort, 100),
    why_interested: asText(body.why_interested, 5000) || null,
  };
  if (
    row.name.length === 0 ||
    !EMAIL_PATTERN.test(row.email) ||
    !COMFORT_OPTIONS.includes(row.technical_comfort)
  ) {
    return json(400, { ok: false });
  }

  // INTENT: insert via PostgREST as the anon role; RLS on the table allows
  // insert only, so this credential can never read submissions back.
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/design_partner_interest`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!response.ok) {
    console.error("interest: supabase insert failed", response.status, await response.text());
    return json(502, { ok: false });
  }
  return json(200, { ok: true });
}

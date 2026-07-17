/* ============================================================
   /build page screenshot manifest (single source of truth)

   HOW TO SWAP A SCREENSHOT
   1. Drop the new source PNG at assets/build/src/<image>.png
      (same logical name means no edits in this file at all).
   2. Run: npm run build-screens
      This crops the top browser chrome, writes optimized
      <image>.webp and <image>.png to assets/build/, and prints
      the final file sizes.
   3. Commit the regenerated files in assets/build/.

   HOW TO ADD A NEW SCREEN
   1. Drop the source PNG at assets/build/src/<new-name>.png
   2. Append one object to the relevant array below.
      Built screens need: image, cropTop, title, body, alt
      App screens need:   image, alt
   3. Run: npm run build-screens, then commit.

   HOW TO ADD A CAPABILITY CELL
   Append one { name, description } object to the capabilities
   array. No other change is needed.

   FIELDS
   image    logical name; maps to assets/build/<image>.webp
            with assets/build/<image>.png as fallback
   cropTop  pixels removed from the TOP of the source image by
            the pipeline (the browser chrome / URL bar). Measure
            it in the source PNG. The pipeline warns while a
            built screen still has cropTop 0.
   title    caption heading, rendered as real HTML text
   body     caption body, rendered as real HTML text
   alt      image alt text for accessibility
   ============================================================ */

// INTENT: the four shipped-product screenshots, rendered in order as
// full-width bands in the "What I have built." section.
export const builtScreens = [
  {
    image: "team_live",
    cropTop: 0,
    title: "Team Live",
    body: "A governed agent team working in real time. Every packet is a real message between agents; the diamonds are gates that hold traffic until governance clears it. Each agent shows its state, so nothing is hidden. Nothing here is simulated.",
    alt: "Kognaro Team Live screen",
  },
  {
    image: "agents",
    cropTop: 0,
    title: "Agents",
    body: "Every agent is a row I control: its model, its lifecycle, its memory, and above all its tools. Tool authority is scoped and never inherited, so each agent does exactly what its work requires and nothing more. Trust is structural because the structure is right here, editable.",
    alt: "Kognaro Agents screen",
  },
  {
    image: "communications",
    cropTop: 0,
    title: "Communications",
    body: "Every message an agent sends is visible here, including agent-to-agent traffic, not just operator-to-agent. Watching agents coordinate with each other, in the open, is how I know the governance is real and not a black box.",
    alt: "Kognaro Communications screen",
  },
  {
    image: "work_queue",
    cropTop: 0,
    title: "Work Queue",
    body: "Every unit of work, from initiative to plan to action, claimed by a named agent and stamped with when it happened. This is the audit trail: what was done, by which agent, in what order.",
    alt: "Kognaro Work Queue screen",
  },
  {
    image: "playbooks",
    cropTop: 0,
    title: "Playbooks",
    body: "A playbook is a reusable, ordered sequence of governed steps, composed once from micro-skills and granted to the agents that should hold them. This is what makes Kognaro a platform and not a pile of one-off scripts.",
    alt: "Kognaro Playbooks screen",
  },
];

// INTENT: the four iPhone app screens, rendered as the uniform
// phone-frame strip inside the "Building next." section. These are
// device renders, so no cropTop is needed.
export const appScreens = [
  { image: "app_team_live", alt: "Kognaro iPhone app, Team Live screen" },
  { image: "app_communications", alt: "Kognaro iPhone app, Communications screen" },
  { image: "app_needs_you", alt: "Kognaro iPhone app, Needs You screen" },
  { image: "app_settings", alt: "Kognaro iPhone app, Settings screen" },
];

// INTENT: the capability grid at the end of "What I have built."; a
// selection of what is built and running in the console beyond the
// screenshots, one cell per entry.
export const capabilities = [
  {
    name: "Governed memory",
    description: "A memory system agents read and write, segmented by domain and project, so context stays scoped to the work.",
  },
  {
    name: "Recursive learning",
    description: "Observations and lessons captured and fed back by domain and project, with agent-written long-term and short-term memory for continuity and continuous improvement.",
  },
  {
    name: "Manifests",
    description: "Before an agent takes consequential action, its intended tool calls are written to a manifest and held for human approval. The agent proposes; nothing consequential runs until it is authorized.",
  },
  {
    name: "Scheduling",
    description: "Agent activation runs on a schedule, so work initiates when it should without a human in the loop.",
  },
  {
    name: "Reports",
    description: "Agents write reports from defined templates, so output is structured and repeatable, not freeform.",
  },
  {
    name: "Treasury",
    description: "Token usage tracked and split by OAuth session and API, so cost is governed, not guessed.",
  },
];

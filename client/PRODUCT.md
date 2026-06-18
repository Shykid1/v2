# SaniChain — Product Context

**Register:** product (authenticated dashboards are the bulk of the work). The marketing landing page is the one **brand** surface; treat it differently from the app.

## What it is

SaniChain is a **desludging service coordination network** for Northern Ghana. When a household's pit latrine is full, SaniChain detects it (IoT sensor, flood forecast, or a USSD call) and dispatches a vetted desludging provider before an overflow happens. Dispatch, payment, and notifications run end to end on the platform.

The **household / pit owner is the primary customer**. The unit of value is: *a full pit gets emptied by the right provider, fast, and everyone is notified and paid.* Providers, admin, and UNICEF all exist to serve that outcome.

## Users

- **Sensored household ("Amina")** — bought a sensor for peace of mind. Wants set-and-forget: a dashboard, WhatsApp/SMS alerts, automatic dispatch and charge on completion. On a mid-range Android.
- **Unsensored household ("Musah")** — no sensor, pit is full now. Feature phone. Uses USSD or the guest request on the landing page. Needs a short flow, a clear fixed price, an SMS/WhatsApp confirmation.
- **Provider ("Kwame")** — runs 1–2 desludging trucks. Wants a steady stream of *verified* full-pit jobs (no wasted trips), good routing, reliable T+1 payment. Works from his phone, often in his truck, in bright daylight. Provider UI is mobile-first.
- **Admin ("Operations")** — verifies providers, runs the job chain, monitors sensors, handles exceptions. Desktop, dense, fast. The dispatch board is their cockpit.
- **UNICEF / WASH official ("Partner")** — funds sensor subsidies, consumes SDG/JMP coverage reporting. No operational role; a lightweight read-only reporting view.

## Brand

**Field-grade infrastructure.** SaniChain is dependable public-works equipment, not a SaaS dashboard. It should feel like a tool you trust at 2am during a flood window: confident, legible, calm under load, honest about state. Rooted in place — the warm laterite earth and harmattan light of Northern Ghana, the safety-orange heritage of field equipment.

- Confidence over decoration. Density that stays calm. Status you can read in a glance.
- Earth-warm, not clinical. Warm stone surfaces, a laterite-clay signal accent. Deliberately **not** sanitation-green or healthcare-teal.
- Honest mechanics: a job is a state machine; show the state, the next action, the price, the time. Never hide where a job is.

## Tone

Plain, direct, human. Short sentences. Name things by what they do ("Request desludging", "Mark done", "Commission owed"). No marketing fog, no cheerful filler, no jargon. Numbers and money are always explicit (GHS, %, time). Respect that some users are anxious (an overflowing pit) and some are busy (a provider mid-route).

## Anti-references

- Generic SaaS dashboards (the hero-metric template, identical icon-card grids, gradient accents).
- Sanitation/water clichés: green-and-blue, water droplets, eco-leaf motifs.
- Healthcare-teal + white "clean" minimalism.
- Fintech navy-and-gold.
- Anything that reads "AI made this": purple gradients, glassmorphism by default, emoji icons.

## Strategic principles

1. **The Job is the heart.** Every surface reads from and acts on the job state machine (CREATED → OFFERED/ASSIGNED → ACCEPTED → EN_ROUTE → COMPLETED → PAID/PAID_CASH → CLOSED, plus SLA_BREACHED / CANCELLED). Make state and the single next action obvious everywhere.
2. **Works on a cheap phone over 2G.** Lean bundles, lazy charts, reserved space, mobile-first for household + provider. Speed is a feature.
3. **Money is first-class and explicit.** Fixed zonal price shown before commit; cash vs Mobile Money clear; provider commission ledger and split % never buried.
4. **Trust through transparency.** Verification status, KYC, sensor health, SLA — surfaced plainly, never spun.
5. **One brand surface, many product surfaces.** The landing page persuades; the dashboards serve. Don't let app polish bleed into brochure-ware, or vice versa.

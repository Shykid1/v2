# SaniChain — Pitch Deck

> **UNICEF StartUp Lab × KOICA — Safely Managed Sanitation Hackathon**
> Pitch Day · 18th June 2026 · Tamale, Ghana
>
> *A desludging coordination network for Northern Ghana. Sensors, climate
> forecasts, and a simple phone call detect a full or at-risk pit — and the right
> vetted provider is dispatched and paid before it overflows or the floods cut the
> road.*

This document is the **content + speaker script** for the pitch deck. Each `##`
section is one slide. Bullets are what goes on the slide; the *Say* lines are the
spoken narrative. Built directly from the working v2 MVP (`client/`, `server/`,
`firmware/`).

---

## Slide 1 — Title

# SaniChain
### Empty the pit before it overflows.

A sanitation-service coordination network that connects households with full pit
latrines to vetted desludging providers — triggered automatically by a sensor, a
flood forecast, or one short USSD call.

`Pitch Day — 18 June 2026` · `UNICEF StartUp Lab × KOICA`

> **Say:** "One in five people in Ghana still has nowhere safe for their waste to
> go. We didn't build another toilet. We built the network that empties the ones
> that already exist — before they become a health emergency."

---

## Slide 2 — Team

**Team name:** SaniChain

**Mission:** *No child in Northern Ghana should get sick because a pit latrine
overflowed and nobody came to empty it.*

| Role | Focus |
|------|-------|
| Engineering — full-stack | Next.js client, NestJS + Prisma job engine, payments & integrations |
| Engineering — firmware/IoT | ESP32 MicroPython pit-level sensor, 2G telemetry, HMAC security |
| WASH & impact | Public-health framing, district partnerships, SDG 6.2 reporting |

> *(At least one female team member.)*

> **Say:** "We're a build-first team. What you're about to see is not a mockup —
> the full job lifecycle runs end to end today against a live database."

---

## Slide 3 — The Problem

**Northern Ghana has toilets. It does not have a way to keep them working.**

- **~17.8% of Ghanaians still openly defecate** — above **50% in five northern
  regions** — and only about **1 in 5 households nationally** reaches *safely
  managed* sanitation (WHO/UNICEF JMP).
- A pit latrine is not "set and forget." It **fills up**. When it does, the family
  has no idea **who to call, what it costs, or whether the truck can even reach
  them.**
- So the pit **overflows into the compound** — or the family goes back to the
  bush. Either way, **children get sick** (diarrhoea, cholera, typhoid, worms) and
  **girls miss school.**
- **Climate makes it worse.** Floods overflow pits, contaminate boreholes, *and
  block the road to the desludging truck — all at the same time.*

**The broken link isn't the toilet. It's everything between "the pit is full" and
"a safe truck emptied it."**

> **Say:** "Every WASH program counts toilets built. Almost nobody owns what
> happens 8 months later when that toilet is full. That gap — the emptying and
> transport link — is where safely managed sanitation actually breaks."

---

## Slide 4 — Why This Gap Persists (the real barriers)

Straight from UNICEF's own diagnosis — these are the barriers we attack:

1. **No financing / no price clarity** — households can't predict or afford
   emptying, so they delay until it overflows.
2. **Disconnected supply chains** — vacuum-truck operators exist, but there is no
   system that connects them to the households who need them *right now*.
3. **Poor coordination & accountability** — no one is watching the chain, so no
   one is dispatched, and districts have no data to act on.
4. **No social trigger** — without a prompt, a full pit is ignored until it's a
   crisis.

> **Say:** "These aren't our opinions — they're the barriers in the brief. Every
> one of them is a coordination problem. Coordination problems are exactly what
> software solves."

---

## Slide 5 — The Solution

**SaniChain turns a full pit into a dispatched, paid, completed job — over
WhatsApp, SMS, and USSD.**

Three ways a job starts, one network that fulfils it:

| Trigger | Who it's for | What happens |
|---------|--------------|--------------|
| 🛰️ **IoT sensor** detects fill ≥ 80% | Premium households | Auto-creates a job, asks the household to approve |
| 🌧️ **Climate engine** sees a flood window | Sensored households in flood zones | Pre-emptively empties pits already ≥ 60% full *before* the road floods |
| ☎️ **USSD `*code#` / WhatsApp / web** | Everyone else (no account, no smartphone) | Self-report a full or broken latrine in one short call |

→ A **vetted provider** is offered the job, accepts, drives out, empties it, and is
**paid automatically (Mobile Money/card) or in cash** — with the household notified
at every step.

**The sensor isn't plumbing for a dashboard. It's a product a household buys so
they never have to think about their pit again.**

> **Say:** "Whether you have a $20 sensor or a $5 Nokia, SaniChain gets you the
> same thing: a verified truck shows up at a fixed price before your pit
> overflows."

---

## Slide 6 — How It Works (the system)

**One Job lifecycle. Every trigger converges on it; every screen reads from it.**

```
TRIGGERS                    THE JOB ENGINE                       FULFILMENT
────────                  (single state machine)                ──────────
Sensor fill ≥80% ─┐   PENDING_APPROVAL → CREATED →           ┌─ WhatsApp/SMS alerts
Flood pre-empt  ─┼─▶  OFFERED/ASSIGNED → ACCEPTED →    ─────▶ ├─ Vetted provider routed
USSD self-report ─┤   EN_ROUTE → COMPLETED →                  ├─ Paystack split / cash
Guest / web req. ─┘   PAID | PAID_CASH → CLOSED               └─ District SDG report
```

What's already engineered behind that diagram:

- **Smart dispatch, in two phases.** *Phase 0:* a human dispatcher confirms the
  nearest provider with one tap (builds trust + data). *Phase 1:* the system
  auto-assigns the nearest verified provider and, if they don't accept in *N*
  minutes, **broadcasts to all eligible providers — first to accept wins.** Same
  state machine, one flag — no re-architecture.
- **Safety rails.** A 48-hour **SLA timer** flags overdue jobs; an **approval
  window** nudges the household and alerts the district officer if a full pit is
  ignored.
- **Hardware built for the bush.** ESP32 + ultrasonic sensor, **2G/GPRS** (works
  where there's no smartphone), **solar + battery** (6+ months off-grid),
  **HMAC-SHA256 signed** readings, and an **offline flash queue** so nothing is
  lost when the network drops. ~220 bytes per reading, < 0.001 GH₵ in data.
- **Money that actually settles.** Paystack **split payments** route the
  provider's share straight to their subaccount and **pay out T+1**; cash jobs
  accrue commission to a **ledger** that's netted against future digital payouts.

> **Say:** "Everything you see — the sensor firmware, the dispatch logic, the
> payment split, the USSD menu — is in the repo and runs today."

---

## Slide 7 — Sanitation Value Chain: where we sit

```
Capture → CONTAINMENT → EMPTYING → TRANSPORT → Treatment → Reuse/Disposal
              ▲              ▲▲▲▲▲▲▲▲▲▲▲▲
          we monitor          WE OWN THIS
         (sensor fill)     (the broken link)
```

- **Primary target: Emptying + Transport** — the missing coordination layer that
  connects a full pit to a vetted truck, with payment and tracking.
- **We also watch Containment** (the sensor) so we know *when* to act, and we
  **hand off cleanly to Treatment** (completion + safe-disposal logging feeds SDG
  6.2 reporting).

> **Say:** "Most innovations crowd the two ends — building toilets or building
> treatment plants. The middle, emptying and transport, is where the chain
> actually breaks. That's where we play."

---

## Slide 8 — Product Demo

**Live demo flow (run the flood scenario in `firmware-simulator`):**

1. **Sensor reads 82%** → a job auto-appears on the **Admin dispatch board** and
   the household gets a WhatsApp asking them to approve.
2. **Household approves** in their dashboard → job enters dispatch.
3. **Climate engine fires a flood watch** → sensored pits already ≥ 60% are
   **pre-emptively** turned into jobs before the road floods.
4. **Provider** gets the WhatsApp offer, taps accept, marks *en route*, then
   *done*.
5. **Payment settles** — Mobile Money split (provider paid T+1) or cash logged to
   the ledger — and the **District officer's SDG report** ticks up by one
   chain-complete service.

**Four real surfaces, built:** Marketing/landing + guest pay · Household dashboard
· Provider dashboard · Admin & District-officer dashboards (live Leaflet sensor
map, dispatch board, reports).

> *Demo assets: `firmware-simulator/` multi-node generator · seeded Postgres with
> demo logins for household, provider, admin, and district officer.*

> **Say:** "Watch the map update, the alert fire, and the provider's phone buzz —
> in real time, no slides, the actual app."

---

## Slide 9 — Target Market

**A two-sided network plus the institutions that fund and regulate it.**

| Segment | Who | What they pay for |
|---------|-----|-------------------|
| **Sensored households** (premium) | Aspirational/peri-urban families, schools, clinics | Sensor (one-off) + fixed fee per emptying — *"never think about your pit again"* |
| **Unsensored households** (self-serve) | The mass market — feature-phone users | Free to use; fixed fee per job via USSD |
| **Desludging providers** | Vacuum-truck operators & manual emptiers | Free to join — a stream of **verified, pre-priced jobs** + routing + T+1 payouts |
| **District assemblies / WASH officers** | Regulators (SDG 6.2 mandate) | District-scoped monitoring + compliance & SDG reporting |
| **UNICEF / KOICA / dev agencies** | Funders | Sensor subsidies + verifiable, real-time safely-managed-sanitation data |

**Beachhead:** one northern district — sensored anchor sites (schools/clinics) +
USSD for surrounding households + 3–5 onboarded providers.

> **Say:** "Households are the demand, providers are the supply, and districts plus
> UNICEF are the institutions that already have a mandate and a budget to close
> this exact gap."

---

## Slide 10 — Unit Economics

**Two revenue lines. The recurring one is the commission.**

**1) The sensor (gets a household into the premium tier)**

| | |
|---|---|
| Hardware BOM (ESP32 + HC-SR04 + DHT22 + SIM800L + solar + IP67) | **~$21.50 / node (~GHS 300)** |
| Sells at | **GHS 350** (or UNICEF/KOICA-subsidized for anchor sites) |
| Margin role | At/near cost — the device's job is to *create recurring jobs*, not to be the profit |

**2) The service job (the real engine — every job, every channel)**

- **Fixed, transparent zonal price** = pit size × distance zone, + flood/remote
  access surcharge. No haggling.

  | | Near | Mid | Remote |
  |---|---|---|---|
  | Standard pit | GHS 250 | GHS 350 | GHS 500 |
  | Large / shared | GHS 400 | GHS 550 | GHS 750 |
  | *+ access surcharge (flood-cut / remote)* | — | — | +GHS 80 |

- **Platform keeps a flat 15% commission**; the provider keeps **85%**, paid out
  **T+1**. Providers pay **no subscription**.

**Worked example — one average job (GHS 300):**

| Household pays | Provider receives (85%) | SaniChain commission (15%) |
|---|---|---|
| **GHS 300** | **GHS 255** | **GHS 45** |

- A sensored pit generates a job roughly **every 6–12 months** → recurring GHS ~45
  with **near-zero marginal cost** (the trigger, dispatch, and notification are
  automated).
- **Platform run-cost is tiny:** core API on a ~$6/month VPS, all critical paths
  on 2G, < 0.001 GH₵ per sensor reading. **A small district pilot runs on < $300
  hardware + ~$10/month hosting.**

> **Say:** "We don't get rich selling sensors — we sell those near cost. We get
> sustainable on a flat 15% slice of jobs that the system creates automatically,
> on infrastructure that costs ten dollars a month to run."

---

## Slide 11 — Impact

**For the household**
- The pit is **emptied before it overflows** — and **before the September floods
  cut the road.** No raw sewage in the compound, no return to open defecation.
- One **clear fixed price** and a **vetted** operator — dignity and safety, not a
  haggle with a stranger.

**For the provider**
- A steady stream of **verified, pre-priced jobs**, smart routing, and
  **guaranteed T+1 payment** — turning informal, unpredictable work into a real
  business. No subscription to join.

**For the district & UNICEF**
- **Real-time, JMP-aligned SDG 6.2 data** — chain-complete services, flood
  pre-emptions, completion rates — scoped per district. Monitoring and compliance
  that today simply doesn't exist.

**For children (the point)**
- Fewer faecal-oral infections (diarrhoea, cholera, typhoid, worms) in under-5s →
  **less stunting, fewer school days lost, more girls staying in school.**

**Why it scores on UNICEF's six criteria:**
*Innovation* — climate-pre-emptive desludging, not just monitoring · *Scalability*
— 16 regions / 261 districts already seeded; USSD needs no smartphone ·
*Feasibility* — functional full-stack MVP today · *Differentiation* — owns the
emptying/transport link everyone else skips · *Impact* — reduces multiple barriers
(financing clarity, supply coordination, accountability) at once.

> **Say:** "The metric we care about most isn't sensors sold or jobs dispatched.
> It's a pit emptied safely instead of overflowing into a yard where a five-year-
> old plays. That's the whole point."

---

## Slide 12 — Contact

# SaniChain
### Empty the pit before it overflows.

- 🌐 **Web:** sanichain.app *(landing + guest request)*
- 📱 **USSD:** dial the SaniChain short code — no smartphone needed
- 💬 **WhatsApp / SMS:** via Arkesel
- ✉️ **Email:** hello@sanichain.app
- 💻 **Built on:** Next.js · NestJS + Prisma/PostgreSQL · ESP32 MicroPython ·
  Paystack · Arkesel

*Built for the UNICEF StartUp Lab × KOICA Safely Managed Sanitation Hackathon —
Northern Ghana, 2026.*

> **Say:** "Thank you. Come find us — and let's empty Northern Ghana's pits before
> the rains do it for us."

---

### Appendix — Honest status (for judges' Q&A)

- **Working today:** full job lifecycle, auth & 4 roles, two-phase dispatch,
  SLA/approval schedulers, Paystack split (mock mode without keys), cash
  commission ledger, Arkesel WhatsApp→SMS router, HMAC sensor ingestion, USSD
  intake, all 16 regions / 261 districts seeded, four web surfaces, ESP32 firmware
  + multi-node simulator.
- **Behind graceful fallbacks (need keys / live data):** GhanaPost GPS
  coordinates, live CHIRPS/GloFAS/SPEI climate feeds, live Paystack & Arkesel
  credentials.
- **Deliberately deferred:** provider-set pricing (until zones have real
  competition).

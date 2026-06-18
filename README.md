# SaniChain — Sanitation Service Coordination Network

> A desludging coordination network for Northern Ghana. IoT sensors and community
> reports detect full or at-risk pit latrines, and the right vetted provider is
> dispatched and paid — over WhatsApp, SMS, and USSD — before an overflow or flood
> happens.

---

## One-line definition

SaniChain connects **households** who need their pit latrine emptied to **vetted
desludging service providers** who can empty it — triggered automatically by an IoT
sensor, pre-emptively by a flood forecast, or manually by a community member dialling
a USSD code. Payment, dispatch, and notifications run end to end on the platform.

The sensor is not plumbing for a reporting tool — **it is a product a household buys
so they never have to think about their pit again.**

---

## Project status

> **Stage: functional full-stack MVP.** The end-to-end job lifecycle — intake →
> dispatch → completion → payment → close — runs against a seeded PostgreSQL database,
> with all four web surfaces built. External integrations are implemented behind
> graceful fallbacks: Paystack runs in **mock mode** without API keys, Arkesel sends
> only when configured, and GhanaPost GPS + live climate feeds are still placeholders.
> *(Last updated 2026-06-18.)*

### Working today

- **Auth & roles** — JWT auth for four roles: household, provider, admin, and
  **district officer**; forced password change on first login; role-based routing.
- **Job lifecycle** — full state machine (`CREATED → ASSIGNED/OFFERED → ACCEPTED →
  EN_ROUTE → COMPLETED → PAID / PAID_CASH → CLOSED`, plus pending-approval, SLA breach,
  and cancellation), Phase-0 human-assisted dispatch with auto-assign/broadcast, and an
  SLA/approval scheduler.
- **Payments** — Paystack split charge + subaccounts and a cash commission **ledger**
  with per-provider credit limit; deterministic mock mode when no key is set.
- **Notifications** — Arkesel WhatsApp→SMS router; every message persisted as a
  Notification row; outages are non-fatal.
- **Sensors** — HMAC-validated reading ingestion, fill-level status, and device
  online/offline tracking; ESP32 firmware + a multi-node simulator.
- **USSD** self-report intake and a **guest** request flow (no account).
- **Admin** — live Leaflet sensor map, dispatch board, facilities list + **facility
  detail page**, providers table + **provider detail page**, user management, reports,
  and settings.
- **District officers** — monitoring, regulatory queue, and SDG reports **strictly
  scoped to their own district** (admins see everything), plus job escalation.
- **Locations** — all **16 Ghana regions / 261 districts** seeded as reference data,
  served via `GET /locations/regions` and surfaced as region→district selects on
  registration, officer creation, and pit/desludging forms for data consistency.
- **Household** — pits, sensor registration, request emptying, a dedicated
  **desludging request** page, jobs, and settings.
- **Provider** — onboarding wizard (coverage + settlement KYC), jobs, earnings, account.

### Not yet wired (placeholders)

- **GhanaPost GPS** resolution returns the normalized address only — no coordinates
  until the real lookup is connected.
- **Climate feeds** (CHIRPS / GloFAS / SPEI) return neutral data; the flood-pre-emption
  engine is in place but reads placeholder values.
- **Paystack / Arkesel** need API keys for live mode; otherwise they run in mock/degraded mode.
- **Provider-set pricing** — deferred until zones have real competition.

### Run it locally

```bash
# server — NestJS + Prisma + PostgreSQL (expects a DATABASE_URL)
cd server && npm install
npm run db:reset       # apply migrations + seed (regions, districts, demo logins)
npm run start:dev      # http://localhost:4000/api

# client — Next.js
cd client && npm install
npm run dev            # http://localhost:3000
```

Demo logins (admin, sensored/unsensored households, verified/pending providers, and one
district officer per demo district) are printed at the end of the seed.

---

## Who it serves

| Actor | What they get | How they interact |
|-------|---------------|-------------------|
| **Household (sensored)** | Set-and-forget: pit auto-monitored, emptied before overflow or flood | Dashboard + WhatsApp/SMS alerts |
| **Household (unsensored)** | One short USSD call summons a vetted provider | USSD + SMS/WhatsApp confirmations |
| **Household (guest)** | Request a service with no account | Landing page / USSD → Paystack link |
| **Desludging provider** | A stream of verified, full-pit jobs + routing + auto T+1 payouts | Dashboard + WhatsApp/SMS job offers |
| **Platform admin** | Verify providers, manage the job chain, monitor sensors | Admin dashboard |
| **District officer (regulator)** | District-scoped monitoring, SDG/compliance reporting, escalation | District dashboard |

---

## The two household tiers

| | **Sensored (premium)** | **Unsensored (self-serve)** |
|---|---|---|
| Entry | Buys a SaniChain sensor (UNICEF may subsidize) | Free — dials USSD when needed |
| Detection | Automatic: fill level **+ climate pre-emption** | Manual: reports "pit full / broken" |
| Promise | *"We empty it before it overflows — and before the September floods cut your road."* | *"One short call, and a vetted provider comes."* |
| Pays | Sensor once + fixed service fee per job | Fixed service fee per job |

The **climate engine's job is now precise and sellable**: pre-emptively empty sensored
pits ahead of a forecast flood. That is the premium feature that justifies the device.

---

## Architecture overview

```
┌──────────────────────────────────────────────────────────────┐
│                        Triggers / intake                     │
│  IoT sensor (fill)  │  Climate engine (flood pre-empt)        │
│  USSD self-report   │  Guest / dashboard request              │
└───────────────────────────────┬──────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────┐
│                      Core: the Job lifecycle                  │
│  CREATED → ASSIGNED/OFFERED → ACCEPTED → EN ROUTE →           │
│  COMPLETED → PAID (Paystack) | PAID_CASH (ledger) → CLOSED     │
│  (Phase 0: human-assisted dispatch · Phase 1: auto + broadcast)│
└───────────────────────────────┬──────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────┐
│                  Payments, notifications, surfaces            │
│  Paystack split + subaccounts (T+1)  │  Arkesel WhatsApp + SMS │
│  Landing · Household · Provider · Admin dashboards (Next.js)   │
└──────────────────────────────────────────────────────────────┘
```

### Repository layout (this `v2/` workspace)

```
v2/
├── client/              ← Next.js — landing page + household/provider/admin dashboards
├── server/              ← NestJS — API, job engine, integrations
├── firmware/            ← ESP32 MicroPython pit-level sensor firmware
└── firmware-simulator/  ← multi-node sensor data generator for demo/testing
```

---

## How money flows

```
Household pays job (Paystack) ──split──▶ Platform commission (main account)
                                    └──▶ Provider subaccount ──T+1──▶ auto payout
Household buys sensor (Paystack one-off, UNICEF may subsidize) ──▶ Platform
```

- **Two revenue lines:** a **flat platform commission per job** and **sensor sales**.
  Providers are **not tiered and pay no subscription** — every job uses the same
  admin-set commission percentage (`commission.percent`); the provider keeps the rest.
- **Paystack subaccounts** route the provider's share directly and pay out **T+1**.
- **Both digital (Paystack) and cash are first-class.** Mobile Money is a Paystack
  channel in Ghana; cash is offered to USSD/guest users and anyone who prefers it.

### Payment methods & timing

The **price is identical** for cash or digital — the household always sees the same
fixed zonal price.

| Path | Default method | When / how charged |
|------|----------------|--------------------|
| Sensored / authenticated | Digital (saved Paystack) | Auto-charged on completion; can switch preference to cash |
| Guest / USSD self-report | Choose at request | Digital → charge-on-confirm (refund if no service); **Cash → pay provider on completion** |

### Commission on cash jobs (provider ledger)

Cash goes straight to the provider, so the platform collects its commission
separately. Because every job exists in the system *before* payment (sensor / USSD /
admin created it), commission is owed per completed job regardless of method — cash
only changes collection:

- Each cash job accrues commission to a **provider commission ledger**.
- The ledger is **netted against the provider's Paystack split payouts** on digital jobs.
- If a provider is cash-heavy and the ledger grows, their **saved card/MoMo is
  auto-charged on a cycle**.
- A **credit limit** blocks new cash jobs until the outstanding balance is settled.

### Pricing

Platform-set **fixed zonal price** — `pit size (standard / large-shared) × distance zone
(near / mid / remote)`, plus an optional **access surcharge** for flood-cut or
hard-to-reach routes. The household sees one clear number and confirms. Provider-set
pricing is a deferred v2 experiment, once zones have real competition.

---

## Dispatch model (sequenced, not chosen once)

1. **Phase 0 — human-assisted.** Admin dashboard surfaces the full pit + nearest
   available provider; dispatcher confirms with one tap → WhatsApp job offer. Builds
   trust and gathers the behavioural data needed to automate safely.
2. **Phase 1 — auto-assign + broadcast fallback.** System auto-assigns the best
   provider; if not accepted within *N* minutes, broadcasts to all eligible providers,
   first-to-accept wins. Degrades gracefully when coverage is thin.

A single Job state machine and an automation flag govern both — no re-architecture.

---

## Channels

- **Arkesel WhatsApp + SMS** — alerts and job offers to households and providers.
- **USSD** — community self-reporting for latrines without sensors.
- **Web (Next.js)** — marketing landing page, household dashboard, provider dashboard,
  admin dashboard.

---

## Onboarding & verification

- **Providers:** admin verification **+ Paystack subaccount KYC** (settlement
  MoMo/bank) before they can accept jobs. Providers are not tiered and pay no
  subscription — only the per-job commission applies. Onboarding also captures the
  provider's **region/district** from the canonical list.
- **Households:** light onboarding — phone/WhatsApp verification; sensor registration
  for sensored users.

---

## What changed from v1

| Kept | Recast | Added | Dropped |
|------|--------|-------|---------|
| Firmware / sensors | Center of gravity → **operations**, not reporting | **Provider** onboarding + Paystack subaccounts | **Field-agent Expo app** · provider subscriptions |
| Climate engine (now: **flood pre-emption**) | Alerts → **Job state machine** | **Paystack** split payments | **Africa's Talking** (→ Arkesel) |
| SDG reporting (for UNICEF) | Facilities → **sensored/unsensored pits + ownership** | **USSD self-reporting** as a primary intake | Climate-as-product center |
| Backend core / auth | Dashboard → **landing + household + provider + admin** | **Arkesel** WhatsApp + SMS | |

---

## Tech stack

- **client/** — Next.js 16 (App Router) + React 19, TypeScript, TanStack Query, Leaflet
- **server/** — NestJS 11 (TypeScript), Prisma 7 + PostgreSQL
- **firmware/** — ESP32 + HC-SR04 ultrasonic, MicroPython, 2G/GPRS, solar
- **Payments** — Paystack (split payments, subaccounts, Plans)
- **Messaging** — Arkesel (WhatsApp Business API + SMS), USSD
- **Climate** — CHIRPS + GloFAS + SPEI (flood pre-emption for sensored pits)

---

*This README reflects the project state as of 2026-06-18 — see the **Project status**
section above for what's working and what's still placeholder.*

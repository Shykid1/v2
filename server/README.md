# SaniChain v2 — API Server

NestJS + Prisma + PostgreSQL backend for the SaniChain sanitation service coordination
network. It is the operational core: all demand triggers (IoT sensor, flood forecast,
USSD, guest/dashboard request) converge on a single **Job** state machine, and dispatch,
payments, and notifications run end to end.

See [`../docs/prd.md`](../docs/prd.md) for the product spec and
[`../docs/server-audit.md`](../docs/server-audit.md) for the PRD-coverage matrix.

## Stack

- **NestJS 11** (TypeScript) · **Prisma 7** + **PostgreSQL**
- **Auth:** JWT + Passport, role-based (`household` / `provider` / `admin`)
- **Payments:** Paystack (split payments, subaccounts, commission ledger, webhooks)
- **Messaging:** Arkesel (WhatsApp primary, SMS fallback) + USSD webhook
- **Climate:** CHIRPS / GloFAS / SPEI poll (mock-mode by default) for flood pre-emption
- **Docs:** Swagger at `/api/docs`

## Quick start

```bash
npm install
cp .env.example .env            # then edit DATABASE_URL etc.
npm run prisma:generate
npm run prisma:migrate          # apply migrations
npm run prisma:seed             # admin + pricing matrix + demo data
npm run start:dev               # http://localhost:4000/api  (docs: /api/docs)
```

Requires a running PostgreSQL. The default `.env` points at `localhost:5433`.

### Seeded accounts

| Role | Login (email/phone) | Password |
|------|---------------------|----------|
| Admin | `admin@sanichain.io` | `admin1234` |
| Household (sensored) | `0241111111` | `amina1234` |
| Household (unsensored) | `0242222222` | `musah1234` |
| Provider (verified) | `0207777777` | `kwame1234` |
| Provider (pending) | `0208888888` | `adisa1234` |

Seed also creates pit `PIT-00001` with device `SANI-ESP32-001` (HMAC key
`dev-hmac-key-001`) — matches the `firmware-simulator` defaults.

## Configuration

All env vars are validated on boot (`src/config/env.validation.ts`). Key ones:

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | PostgreSQL connection |
| `JWT_SECRET` | min 32 chars |
| `PAYSTACK_SECRET_KEY` | **empty → MOCK mode** (full payment flow runs offline); set a real test key for live calls |
| `PAYSTACK_WEBHOOK_SECRET` | verifies `POST /api/webhooks/paystack` |
| `ARKESEL_API_KEY` | WhatsApp + SMS (empty → notifications are logged, non-fatal) |
| `USSD_WEBHOOK_SECRET` | gates the Arkesel USSD callback |
| `CLIMATE_MOCK_MODE` | `true` → synthetic climate data; `false` requires CHIRPS/GloFAS/SPEI URLs |
| `HMAC_REPLAY_WINDOW_MS` | sensor payload replay window (default 5 min) |
| `GHANAPOST_GPS_*` | placeholder until the real GhanaPost GPS integration is supplied |

## Architecture

```
Triggers ─┬─ sensor fill (HMAC) ─┐
          ├─ climate pre-empt    ├─▶  Job state machine  ─▶  Payments  ─▶  Notifications
          ├─ USSD self-report    │    CREATED → OFFERED/ASSIGNED →        (WhatsApp/SMS)
          └─ guest / dashboard ──┘    ACCEPTED → EN_ROUTE → COMPLETED →
                                       PAID | PAID_CASH → CLOSED
```

A single state machine (`src/jobs/job-state-machine.ts`) governs both **Phase 0**
human-assisted dispatch and **Phase 1** auto-assign + broadcast — only the actor/flag
differs (`dispatch.mode` setting).

### Modules (`src/`)

| Module | Responsibility |
|--------|----------------|
| `auth`, `users` | JWT login/register, RBAC, `/users/me` |
| `households`, `pits`, `providers` | actor profiles; sensor registration; provider KYC + verification |
| `pricing` | fixed zonal price matrix (`size × zone` + access surcharge) |
| `jobs` | Job lifecycle, dispatch (assisted/auto/broadcast), SLA |
| `payments` | Paystack split/subaccounts/subscription, commission ledger, webhook |
| `readings` | HMAC sensor intake → sensor-fill job |
| `ussd` | Arkesel USSD menu → guest job + payment choice |
| `climate` | scheduled poll + flood pre-emption |
| `notifications` | WhatsApp→SMS channel router (event templates) |
| `location` | GhanaPost GPS resolver (placeholder) |
| `ops` | scheduled offer-escalation + SLA-breach sweep |
| `reports` | SDG/JMP coverage + operations rollups |
| `settings` | admin-editable runtime config (dispatch mode, thresholds, limits) |

### Money flow

A **flat, admin-editable platform commission** (`commission.percent`) applies to every job —
providers are not tiered and pay no subscription. Each job charge splits into platform
commission + the provider's Paystack subaccount (T+1 payout). **Cash** jobs accrue
commission to a per-provider ledger that is netted against digital payouts; a credit limit
blocks new cash jobs when exceeded. The platform's other revenue line is **sensor sales**.
In **mock mode** digital charges settle immediately so the whole flow is exercisable offline.

## Key endpoints

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/api/auth/login` · `/api/auth/register/{household,provider}` | public |
| `GET` | `/api/users/me` | any authenticated role |
| `POST` | `/api/pits` · `/api/pits/:id/sensor` | household |
| `POST` | `/api/jobs` · `/api/jobs/guest` | household / public |
| `POST` | `/api/jobs/:id/{accept,decline,en-route,done}` | provider |
| `POST` | `/api/jobs/:id/{offer,auto-assign,broadcast,cancel,close}` | admin |
| `POST` | `/api/readings` | HMAC-guarded (sensor) |
| `POST` | `/api/ussd` | Arkesel USSD callback (shared-secret) |
| `POST` | `/api/webhooks/paystack` | signature-verified, idempotent |
| `GET` | `/api/reports/summary` · `/api/climate/latest` | admin |

Full interactive reference at **`/api/docs`** (Swagger).

## Database

```bash
npm run prisma:migrate     # create/apply a migration in dev
npm run prisma:seed        # seed
npm run db:reset           # drop, re-migrate, re-seed
```

Schema lives in `prisma/schema.prisma`; the **Job** is the central entity. Use versioned
migrations (`prisma migrate dev`), not `db push`.

## Testing

```bash
npm run build      # tsc / nest build
npm run lint       # eslint --fix
npm test           # unit: state machine, pricing matrix, payment split
```

## Local end-to-end (no hardware)

1. `npm run start:dev` (with a seeded DB and empty `PAYSTACK_SECRET_KEY` for mock mode).
2. In `../firmware-simulator`: `pip install -r requirements.txt && python run.py`.
   The seeded pit climbs past the fill threshold → the server auto-creates a `sensor_fill`
   job (the simulator prints `→ JOB CREATED <id>`).
3. As admin, dispatch the job to a verified provider; as that provider, accept → en-route →
   done. A cash job settles to `PAID_CASH`; a digital job settles to `PAID` (mock) and the
   household is notified.

import 'dotenv/config';
import {
  DistanceZone,
  JobStatus,
  LocationSource,
  NotificationChannel,
  NotificationStatus,
  PaymentMethod,
  PaymentStatus,
  PitSize,
  Prisma,
  PrismaClient,
  TriggerSource,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { GHANA_REGIONS, GHANA_DISTRICT_COUNT } from './data/ghana-locations';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ─── Deterministic PRNG so reseeds are reproducible ──────────────────────────
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(424242);
const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const randInt = (min: number, max: number) =>
  Math.floor(rnd() * (max - min + 1)) + min;
const chance = (p: number) => rnd() < p;
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);
const jitter = (v: number, by: number) => v + (rnd() - 0.5) * by;

// ─── Reference data ──────────────────────────────────────────────────────────
// Districts used to generate realistic demo operational data (pits, climate,
// officers). Names must match the canonical Ghana list (ghana-locations.ts) so the
// demo data references valid districts.
const DISTRICTS = [
  {
    name: 'East Mamprusi Municipal',
    region: 'North East',
    lat: 10.5167,
    lng: -0.3667,
    communities: ['Gambaga', 'Nalerigu', 'Sakogu', 'Langbinsi'],
  },
  {
    name: 'West Mamprusi Municipal',
    region: 'North East',
    lat: 10.4,
    lng: -0.9,
    communities: ['Walewale', 'Wungu', 'Kparigu', 'Yagaba'],
  },
  {
    name: 'Mamprugu Moagduri',
    region: 'North East',
    lat: 10.3,
    lng: -1.1,
    communities: ['Kubori', 'Loagri', 'Yikpabongo'],
  },
  {
    name: 'Bunkpurugu Nakpanduri',
    region: 'North East',
    lat: 10.45,
    lng: 0.1,
    communities: ['Bunkpurugu', 'Nakpanduri', 'Nasuan'],
  },
];

const PRICING: Array<{
  sizeClass: PitSize;
  zone: DistanceZone;
  basePrice: number;
  accessSurcharge: number;
}> = [
  { sizeClass: 'standard', zone: 'near', basePrice: 250, accessSurcharge: 0 },
  { sizeClass: 'standard', zone: 'mid', basePrice: 350, accessSurcharge: 0 },
  { sizeClass: 'standard', zone: 'remote', basePrice: 500, accessSurcharge: 80 },
  { sizeClass: 'large_shared', zone: 'near', basePrice: 400, accessSurcharge: 0 },
  { sizeClass: 'large_shared', zone: 'mid', basePrice: 550, accessSurcharge: 0 },
  { sizeClass: 'large_shared', zone: 'remote', basePrice: 750, accessSurcharge: 80 },
];

function priceFor(sizeClass: PitSize, zone: DistanceZone) {
  const row = PRICING.find((p) => p.sizeClass === sizeClass && p.zone === zone)!;
  const accessSurcharge = zone === 'remote' ? row.accessSurcharge : 0;
  return {
    sizeClass,
    zone,
    basePrice: row.basePrice,
    accessSurcharge,
    total: row.basePrice + accessSurcharge,
    currency: 'GHS',
  };
}

const FIRST_NAMES = [
  'Amina', 'Musah', 'Fatima', 'Yakubu', 'Adisa', 'Kwame', 'Abena', 'Ibrahim',
  'Hawa', 'Mohammed', 'Salamatu', 'Issah', 'Rukaya', 'Sulemana', 'Memuna',
  'Abdul', 'Zainab', 'Mahama', 'Ayisha', 'Iddrisu', 'Wahab', 'Lariba',
  'Damba', 'Sahada', 'Nuhu', 'Sanatu', 'Baba', 'Asana', 'Razak', 'Mariama',
];
const LAST_NAMES = [
  'Yakubu', 'Abdul', 'Mahama', 'Mensah', 'Haruna', 'Alhassan', 'Imoro',
  'Seidu', 'Fuseini', 'Adam', 'Osman', 'Tahiru', 'Iddrisu', 'Bukari',
];

let phoneCounter = 24_000_0000;
const nextPhone = () => `0${(phoneCounter++).toString().padStart(9, '0')}`.slice(0, 10);

async function main() {
  console.log('Resetting database…');
  // FK-safe delete order (children → parents).
  await prisma.commissionLedgerEntry.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.jobOffer.deleteMany();
  await prisma.job.deleteMany();
  await prisma.reading.deleteMany();
  await prisma.device.deleteMany();
  await prisma.pit.deleteMany();
  await prisma.districtOfficer.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.household.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.climateSnapshot.deleteMany();
  await prisma.user.deleteMany();
  await prisma.district.deleteMany();
  await prisma.region.deleteMany();

  console.log('Seeding SaniChain v2…');

  // ── Ghana regions + districts (canonical location reference) ─────────────────
  for (const r of GHANA_REGIONS) {
    await prisma.region.create({
      data: {
        name: r.name,
        districts: { create: r.districts.map((name) => ({ name })) },
      },
    });
  }
  console.log(
    `  ${GHANA_REGIONS.length} regions, ${GHANA_DISTRICT_COUNT} districts`,
  );

  // ── Pricing matrix ─────────────────────────────────────────────────────────
  for (const p of PRICING) {
    await prisma.pricingRule.upsert({
      where: { sizeClass_zone: { sizeClass: p.sizeClass, zone: p.zone } },
      update: { basePrice: p.basePrice, accessSurcharge: p.accessSurcharge },
      create: p,
    });
  }

  // Hash once and reuse for synthetic accounts (bcrypt is slow).
  const demoHash = await bcrypt.hash('demo1234', 12);

  // ── Admin ──────────────────────────────────────────────────────────────────
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin1234';
  await prisma.user.create({
    data: {
      name: 'Platform Admin',
      phone: '0200000000',
      email: 'admin@sanichain.io',
      whatsappNumber: '0200000000',
      role: 'admin',
      passwordHash: await bcrypt.hash(adminPassword, 12),
    },
  });

  // ── District officers (one per district) ─────────────────────────────────────
  const districtLogins: string[] = [];
  for (let i = 0; i < DISTRICTS.length; i++) {
    const d = DISTRICTS[i];
    const slug = d.name.split(/[\s-]/)[0].toLowerCase();
    const email = `district.${slug}@sanichain.io`;
    await prisma.user.create({
      data: {
        name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
        phone: `02100000${i}${i}`,
        email,
        whatsappNumber: `02100000${i}${i}`,
        role: 'district_officer',
        passwordHash: demoHash,
        districtOfficer: {
          create: {
            title: 'District Environmental Health Officer',
            district: d.name,
            region: d.region,
          },
        },
      },
    });
    districtLogins.push(`${email} / demo1234  (${d.name})`);
  }

  // ── Providers ────────────────────────────────────────────────────────────────
  // Providers are not tiered and pay no subscription — every job uses one flat
  // platform commission, so the provider keeps the same share on every job.
  const COMMISSION_PCT = 15;
  const PROVIDER_SPLIT = 100 - COMMISSION_PCT;
  const providerSeeds = [
    { name: 'Kwame Mensah', business: 'Kwame Desludging Services', phone: '0207777777', email: 'kwame@sanichain.io', verified: true },
    { name: 'Adisa Haruna', business: 'Adisa Sanitation', phone: '0208888888', email: 'adisa@sanichain.io', verified: false },
    { name: 'Yakubu Fuseini', business: 'Northern Vacuum Co.', phone: nextPhone(), verified: true },
    { name: 'Salamatu Osman', business: 'CleanFlow Logistics', phone: nextPhone(), verified: true },
    { name: 'Ibrahim Tahiru', business: 'Mamprusi WasteWorks', phone: nextPhone(), verified: true },
    { name: 'Hawa Bukari', business: 'GreenPit Services', phone: nextPhone(), verified: false },
  ];

  const providers: { id: string; split: number; subaccount: string }[] = [];
  for (let i = 0; i < providerSeeds.length; i++) {
    const ps = providerSeeds[i];
    const d = DISTRICTS[i % DISTRICTS.length];
    const subaccount = `ACCT_seed_${i}`;
    const created = await prisma.user.create({
      data: {
        name: ps.name,
        phone: ps.phone,
        email: (ps as { email?: string }).email,
        whatsappNumber: ps.phone,
        role: 'provider',
        passwordHash: demoHash,
        provider: {
          create: {
            businessName: ps.business,
            coverageZones: ['near', 'mid', ...(chance(0.5) ? ['remote'] : [])],
            region: d.region,
            district: d.name,
            vehicleCapacityLiters: pick([5000, 6000, 8000, 10000]),
            baseLat: jitter(d.lat, 0.1),
            baseLng: jitter(d.lng, 0.1),
            available: chance(0.85),
            verificationStatus: ps.verified ? 'verified' : 'pending',
            kycStatus: ps.verified ? 'verified' : 'not_started',
            paystackSubaccountCode: ps.verified ? subaccount : null,
            creditLimit: 1000,
          },
        },
      },
      include: { provider: true },
    });
    providers.push({ id: created.provider!.id, split: PROVIDER_SPLIT, subaccount });
  }
  const verifiedProviders = providers.filter((_, i) => providerSeeds[i].verified);

  // ── Households + pits + devices + readings ───────────────────────────────────
  type SeedPit = {
    id: string;
    householdId: string;
    sizeClass: PitSize;
    zone: DistanceZone;
    sensored: boolean;
    district: string;
  };
  const pits: SeedPit[] = [];
  let pitSeq = 0;
  let deviceSeq = 0;

  // Fixed demo households first (kept for docs/screens).
  const fixed = [
    { name: 'Amina Yakubu', phone: '0241111111', email: 'amina@sanichain.io', tier: 'sensored' as const, sensored: true, pay: 'paystack' as const, district: 0, community: 'Gambaga' },
    { name: 'Musah Abdul', phone: '0242222222', email: 'musah@sanichain.io', tier: 'unsensored' as const, sensored: false, pay: 'cash' as const, district: 0, community: 'Nalerigu' },
  ];

  async function createHouseholdWithPit(opts: {
    name: string;
    phone: string;
    email?: string;
    tier: 'sensored' | 'unsensored';
    sensored: boolean;
    pay: PaymentMethod;
    districtIdx: number;
    community: string;
    fixedCode?: string;
  }) {
    const d = DISTRICTS[opts.districtIdx];
    const user = await prisma.user.create({
      data: {
        name: opts.name,
        phone: opts.phone,
        email: opts.email,
        whatsappNumber: opts.phone,
        role: 'household',
        passwordHash: demoHash,
        household: {
          create: {
            tier: opts.tier,
            defaultPaymentMethod: opts.pay,
            district: d.name,
            community: opts.community,
          },
        },
      },
      include: { household: true },
    });

    pitSeq += 1;
    const code = opts.fixedCode ?? `PIT-${String(pitSeq).padStart(5, '0')}`;
    const sizeClass: PitSize = chance(0.25) ? 'large_shared' : 'standard';
    const zone: DistanceZone = pick(['near', 'near', 'mid', 'mid', 'remote']);
    const depth = pick([180, 200, 220, 250]);
    const pit = await prisma.pit.create({
      data: {
        code,
        householdId: user.household!.id,
        name: `${opts.name.split(' ')[0]} compound pit`,
        lat: jitter(d.lat, 0.12),
        lng: jitter(d.lng, 0.12),
        ghanaPostAddress: opts.sensored
          ? null
          : `NM-${randInt(1000, 9999)}-${randInt(1000, 9999)}`,
        locationSource: opts.sensored
          ? LocationSource.sensor_gprs
          : LocationSource.ghanapost_gps,
        sizeClass,
        zone,
        sensored: opts.sensored,
        pitDepthCm: depth,
        floodRisk: chance(0.2),
        district: d.name,
        community: opts.community,
      },
    });
    pits.push({
      id: pit.id,
      householdId: user.household!.id,
      sizeClass,
      zone,
      sensored: opts.sensored,
      district: d.name,
    });

    if (opts.sensored) {
      deviceSeq += 1;
      const deviceId = `SANI-ESP32-${String(deviceSeq).padStart(3, '0')}`;
      // A current fill target; a few pits sit critically full to drive alerts.
      const currentFill = chance(0.18) ? randInt(80, 96) : randInt(20, 78);
      const days = 45;
      // Build a rising series that ends near currentFill.
      const start = Math.max(5, currentFill - days * 1.7);
      const readings: Prisma.ReadingCreateManyInput[] = [];
      for (let day = days; day >= 0; day--) {
        const progress = (days - day) / days;
        let fill = start + progress * (currentFill - start) + (rnd() - 0.5) * 4;
        fill = Math.max(2, Math.min(99, fill));
        const ts = daysAgo(day);
        readings.push({
          pitId: pit.id,
          deviceId,
          fillPct: Number(fill.toFixed(2)),
          fillCm: Number(((fill / 100) * depth).toFixed(2)),
          temperatureC: Number(jitter(31, 6).toFixed(2)),
          humidityPct: Number(jitter(55, 20).toFixed(2)),
          batteryMv: randInt(3500, 4200),
          rssi: randInt(-110, -60),
          hmacValid: true,
          sensorTs: ts,
          lat: jitter(d.lat, 0.12),
          lng: jitter(d.lng, 0.12),
        });
      }
      await prisma.device.create({
        data: {
          deviceId,
          pitId: pit.id,
          hmacKey: `dev-hmac-${deviceId}`,
          installedAt: daysAgo(days + randInt(5, 60)),
          lastSeen: chance(0.85) ? daysAgo(0) : daysAgo(randInt(2, 6)),
          lastLat: jitter(d.lat, 0.12),
          lastLng: jitter(d.lng, 0.12),
          active: true,
        },
      });
      await prisma.reading.createMany({ data: readings });
    }
  }

  for (const f of fixed) {
    await createHouseholdWithPit({
      name: f.name,
      phone: f.phone,
      email: f.email,
      tier: f.tier,
      sensored: f.sensored,
      pay: f.pay,
      districtIdx: f.district,
      community: f.community,
      fixedCode: f.name.startsWith('Amina') ? 'PIT-00001' : 'PIT-00002',
    });
  }

  const TOTAL_HOUSEHOLDS = 42;
  for (let i = fixed.length; i < TOTAL_HOUSEHOLDS; i++) {
    const sensored = chance(0.4);
    const dIdx = randInt(0, DISTRICTS.length - 1);
    await createHouseholdWithPit({
      name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      phone: nextPhone(),
      tier: sensored ? 'sensored' : 'unsensored',
      sensored,
      pay: chance(0.45) ? 'paystack' : 'cash',
      districtIdx: dIdx,
      community: pick(DISTRICTS[dIdx].communities),
    });
  }
  console.log(`  ${pits.length} pits across ${DISTRICTS.length} districts`);

  // ── Jobs across every status ─────────────────────────────────────────────────
  const STATUS_PLAN: Array<{ status: JobStatus; count: number }> = [
    { status: 'PENDING_APPROVAL', count: 12 },
    { status: 'CREATED', count: 7 },
    { status: 'OFFERED', count: 8 },
    { status: 'ASSIGNED', count: 8 },
    { status: 'ACCEPTED', count: 8 },
    { status: 'EN_ROUTE', count: 6 },
    { status: 'COMPLETED', count: 6 },
    { status: 'PAID', count: 24 },
    { status: 'PAID_CASH', count: 18 },
    { status: 'CLOSED', count: 9 },
    { status: 'SLA_BREACHED', count: 5 },
    { status: 'CANCELLED', count: 8 },
  ];

  const ledgerBalances = new Map<string, number>();
  let jobsCreated = 0;
  let paymentsCreated = 0;

  for (const plan of STATUS_PLAN) {
    for (let i = 0; i < plan.count; i++) {
      const pit = pick(pits);
      const price = priceFor(pit.sizeClass, pit.zone);
      const created = daysAgo(randInt(0, 90));
      const paymentMethod: PaymentMethod = chance(0.5) ? 'paystack' : 'cash';

      const isSystemTrigger =
        plan.status === 'PENDING_APPROVAL' || chance(0.3);
      const triggerSource: TriggerSource =
        plan.status === 'PENDING_APPROVAL'
          ? chance(0.2)
            ? TriggerSource.climate_preempt
            : TriggerSource.sensor_fill
          : pick([
              TriggerSource.dashboard,
              TriggerSource.ussd_report,
              TriggerSource.guest_request,
              ...(isSystemTrigger ? [TriggerSource.sensor_fill] : []),
            ]);

      const needsProvider: JobStatus[] = [
        'ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'COMPLETED', 'PAID', 'PAID_CASH', 'CLOSED', 'SLA_BREACHED',
      ];
      const provider =
        needsProvider.includes(plan.status) && verifiedProviders.length
          ? pick(verifiedProviders)
          : null;

      // Approval timestamps for the pending state (some overdue).
      const overdue = plan.status === 'PENDING_APPROVAL' && chance(0.4);
      const approvalRequestedAt =
        plan.status === 'PENDING_APPROVAL' ? created : null;
      const approvalDeadline =
        plan.status === 'PENDING_APPROVAL'
          ? overdue
            ? daysAgo(randInt(0, 2)) // already passed
            : new Date(Date.now() + randInt(2, 11) * 3_600_000)
          : null;

      const settled = ['PAID', 'PAID_CASH', 'CLOSED'].includes(plan.status);
      const completedAt = ['COMPLETED', 'PAID', 'PAID_CASH', 'CLOSED'].includes(
        plan.status,
      )
        ? new Date(created.getTime() + randInt(2, 40) * 3_600_000)
        : null;

      const job = await prisma.job.create({
        data: {
          pitId: pit.id,
          householdId: pit.householdId,
          triggerSource,
          status: plan.status,
          dispatchMode: chance(0.3) ? 'auto' : 'assisted',
          assignedProviderId: provider?.id ?? null,
          priorityScore: Number((rnd() * 100).toFixed(1)),
          priceTotal: price.total,
          priceBreakdown: price,
          paymentMethod,
          notes: chance(0.15) ? 'Access road partially flooded.' : null,
          slaDeadline: new Date(created.getTime() + 48 * 3_600_000),
          approvalRequestedAt,
          approvalDeadline,
          approvedAt:
            plan.status !== 'PENDING_APPROVAL' && triggerSource === 'sensor_fill'
              ? new Date(created.getTime() + randInt(1, 6) * 3_600_000)
              : null,
          overdueFlaggedAt: overdue ? daysAgo(0) : null,
          createdAt: created,
          offeredAt: ['OFFERED', 'ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'COMPLETED', 'PAID', 'PAID_CASH', 'CLOSED', 'SLA_BREACHED'].includes(plan.status)
            ? new Date(created.getTime() + 1 * 3_600_000)
            : null,
          acceptedAt: ['ACCEPTED', 'EN_ROUTE', 'COMPLETED', 'PAID', 'PAID_CASH', 'CLOSED'].includes(plan.status)
            ? new Date(created.getTime() + 2 * 3_600_000)
            : null,
          enRouteAt: ['EN_ROUTE', 'COMPLETED', 'PAID', 'PAID_CASH', 'CLOSED'].includes(plan.status)
            ? new Date(created.getTime() + 3 * 3_600_000)
            : null,
          completedAt,
          paidAt: settled ? completedAt : null,
          closedAt:
            plan.status === 'CLOSED' || plan.status === 'CANCELLED'
              ? new Date(created.getTime() + randInt(40, 60) * 3_600_000)
              : null,
          cancelledReason:
            plan.status === 'CANCELLED'
              ? pick(['Household declined', 'Duplicate request', 'Pit already emptied'])
              : null,
        },
      });
      jobsCreated++;

      // Open offer for OFFERED jobs.
      if (plan.status === 'OFFERED' && verifiedProviders.length) {
        const offered = pick(verifiedProviders);
        await prisma.jobOffer.create({
          data: {
            jobId: job.id,
            providerId: offered.id,
            expiresAt: new Date(Date.now() + 10 * 60_000),
          },
        });
      }
      if (provider && ['ACCEPTED', 'EN_ROUTE', 'COMPLETED', 'PAID', 'PAID_CASH', 'CLOSED'].includes(plan.status)) {
        await prisma.jobOffer.create({
          data: {
            jobId: job.id,
            providerId: provider.id,
            status: 'accepted',
            respondedAt: new Date(created.getTime() + 2 * 3_600_000),
            expiresAt: new Date(created.getTime() + 12 * 3_600_000),
          },
        });
      }

      // Payment + ledger for settled jobs.
      if (settled && provider) {
        const method: PaymentMethod =
          plan.status === 'PAID_CASH' ? 'cash' : 'paystack';
        const total = price.total;
        const providerAmount = Number(((total * provider.split) / 100).toFixed(2));
        const commission = Number((total - providerAmount).toFixed(2));
        await prisma.payment.create({
          data: {
            jobId: job.id,
            householdId: pit.householdId,
            providerId: provider.id,
            purpose: 'job',
            method,
            status: PaymentStatus.success,
            amount: total,
            currency: 'GHS',
            commissionAmount: commission,
            providerAmount,
            subaccountCode: method === 'paystack' ? provider.subaccount : null,
            paystackRef:
              method === 'paystack' ? `seed_ref_${job.id.slice(-8)}` : null,
            paidAt: completedAt,
            createdAt: completedAt ?? created,
          },
        });
        paymentsCreated++;

        if (method === 'cash') {
          const prev = ledgerBalances.get(provider.id) ?? 0;
          const balanceAfter = Number((prev + commission).toFixed(2));
          ledgerBalances.set(provider.id, balanceAfter);
          await prisma.commissionLedgerEntry.create({
            data: {
              providerId: provider.id,
              jobId: job.id,
              type: 'commission_accrued',
              amount: commission,
              balanceAfter,
              note: 'Commission accrued on cash job',
              createdAt: completedAt ?? created,
            },
          });
        }
      }
    }
  }

  // Persist running ledger balances onto providers.
  for (const [providerId, balance] of ledgerBalances) {
    await prisma.provider.update({
      where: { id: providerId },
      data: { ledgerBalance: balance },
    });
  }
  console.log(`  ${jobsCreated} jobs, ${paymentsCreated} payments`);

  // ── Climate snapshots (per district, daily) ──────────────────────────────────
  for (const d of DISTRICTS) {
    for (let day = 30; day >= 0; day--) {
      const flood = Number(Math.min(0.95, Math.max(0.02, jitter(0.3, 0.4))).toFixed(3));
      const drought = Number(Math.min(0.95, Math.max(0.02, jitter(0.25, 0.3))).toFixed(3));
      await prisma.climateSnapshot.create({
        data: {
          district: d.name,
          snapshotTs: daysAgo(day),
          chirpsMm72h: Number(jitter(40, 70).toFixed(2)),
          glofasProbability: flood,
          speiValue: Number(jitter(-0.5, 3).toFixed(2)),
          floodSignal: flood,
          droughtSignal: drought,
          riskScore: Number((flood * 0.6 + drought * 0.4).toFixed(3)),
        },
      });
    }
  }
  console.log(`  climate snapshots for ${DISTRICTS.length} districts`);

  // ── Sample notifications ─────────────────────────────────────────────────────
  const recentJobs = await prisma.job.findMany({
    take: 30,
    orderBy: { createdAt: 'desc' },
    include: { pit: { select: { code: true } } },
  });
  const NOTIF_TEMPLATES = [
    'job_approval_requested',
    'district_pit_alert',
    'job_approved',
    'job_created',
    'job_assigned',
    'job_accepted',
    'job_en_route',
    'job_paid_cash',
    'job_approval_reminder',
    'district_escalation',
  ];
  for (const j of recentJobs) {
    const n = randInt(1, 3);
    for (let k = 0; k < n; k++) {
      await prisma.notification.create({
        data: {
          channel: chance(0.7)
            ? NotificationChannel.whatsapp
            : NotificationChannel.sms,
          template: pick(NOTIF_TEMPLATES),
          recipient: nextPhone(),
          body: `SaniChain update for ${j.pit.code}.`,
          status: chance(0.9)
            ? NotificationStatus.sent
            : NotificationStatus.failed,
          jobId: j.id,
          createdAt: daysAgo(randInt(0, 30)),
        },
      });
    }
  }

  console.log('\nSeed complete.');
  console.log('  Demo logins (password unless noted):');
  console.log(`    admin@sanichain.io / ${adminPassword}`);
  console.log('    amina@sanichain.io / demo1234   (sensored household)');
  console.log('    musah@sanichain.io / demo1234   (unsensored household)');
  console.log('    kwame@sanichain.io / demo1234   (verified provider)');
  console.log('    adisa@sanichain.io / demo1234   (pending provider)');
  for (const w of districtLogins) console.log(`    ${w}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

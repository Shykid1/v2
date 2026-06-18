# SaniChain — Design System

**Direction:** Field-grade infrastructure. Warm laterite-and-stone, high contrast, calm density, one confident clay signal accent. Light-first (forced for pilot). See `PRODUCT.md` for the why.

## Color (OKLCH, light theme)

No pure black or white. Neutrals are tinted warm (hue ~72). Brand is laterite clay (hue ~47). Status separates from brand primarily by **lightness**, so it stays legible against the warm field.

### Neutrals — warm stone
| Token | Value | Use |
|---|---|---|
| `--background` | `oklch(0.972 0.006 75)` | app/page background (warm paper) |
| `--foreground` | `oklch(0.24 0.012 60)` | ink text (never #000) |
| `--card` | `oklch(0.995 0.003 75)` | raised surfaces |
| `--card-foreground` | `oklch(0.24 0.012 60)` | text on cards |
| `--popover` / `--popover-foreground` | `oklch(0.995 0.003 75)` / `oklch(0.24 0.012 60)` | menus, popovers |
| `--muted` | `oklch(0.94 0.007 75)` | subtle fills, table headers |
| `--muted-foreground` | `oklch(0.50 0.014 62)` | secondary text (≥4.5:1 on bg) |
| `--secondary` | `oklch(0.93 0.008 74)` | secondary buttons |
| `--secondary-foreground` | `oklch(0.30 0.012 60)` | text on secondary |
| `--accent` | `oklch(0.93 0.012 70)` | hover wash |
| `--accent-foreground` | `oklch(0.28 0.012 60)` | text on accent |
| `--border` / `--input` | `oklch(0.90 0.009 72)` | hairlines, field borders |

### Brand — laterite clay
| Token | Value | Use |
|---|---|---|
| `--primary` | `oklch(0.55 0.14 47)` | primary actions, brand mark, active nav |
| `--primary-foreground` | `oklch(0.99 0.006 80)` | text on primary |
| `--ring` | `oklch(0.55 0.14 47)` | focus ring (brand) |

### Semantic status (distinct from brand)
| Token | Value | Use |
|---|---|---|
| `--success` | `oklch(0.58 0.11 150)` | done / paid / verified |
| `--warning` | `oklch(0.78 0.15 80)` | fill 60–80%, offered/pending |
| `--destructive` | `oklch(0.52 0.20 22)` | breach, decline, fill ≥80% |
| `--destructive-foreground` | `oklch(0.99 0.006 80)` | text on destructive |

Each status also has a tint background (`color-mix` with `--card` ~12%) for badges/banners. Job-state and fill-level color logic lives in `components/domain/JobStatusBadge` and `FillGauge` — never hardcode per page.

### Charts (recharts) — brand-led sequence
`--chart-1 oklch(0.55 0.14 47)` · `--chart-2 oklch(0.55 0.09 235)` (iron blue) · `--chart-3 oklch(0.74 0.13 80)` (amber) · `--chart-4 oklch(0.58 0.10 150)` (green) · `--chart-5 oklch(0.45 0.09 35)` (deep rust)

## Typography

- **Display / headings:** Archivo (`--font-heading`) — grotesque, technical, industrial.
- **Body / UI:** Inter (`--font-sans`).
- **Mono:** Geist Mono (`--font-mono`) — job refs, sensor IDs, GhanaPost addresses, money tabular figures.
- Scale steps ≥1.25 ratio. Body 16px min on mobile, line-height 1.5–1.6, measure 65–75ch. Headings tighter (1.05–1.15) with weight 600–700.

## Shape, elevation, spacing

- `--radius: 0.5rem` (tighter = utilitarian). Derived sm/md/lg/xl already in `@theme`.
- Elevation is restrained: hairline borders + one soft shadow tier for raised cards/popovers. No heavy drop shadows, no glassmorphism.
- Vary spacing for rhythm; do not pad everything identically. Avoid nested cards. Don't wrap everything in a container.

## Motion (emil-design-eng)

```
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);     /* enter/exit UI */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1); /* on-screen move */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);  /* vaul drawers */
```
- Durations: press 100–160ms, popovers/tooltips 125–200ms, dropdowns 150–250ms, drawers/modals 200–350ms. Nothing over 300ms for routine UI.
- Animate `transform`/`opacity` only. Pressables: `:active { transform: scale(0.97) }`. Enter from `scale(0.96)+opacity` (never `scale(0)`). Origin-aware popovers. List mount stagger 30–80ms. Honor `prefers-reduced-motion` (drop movement, keep opacity).
- No animation on keyboard-repeated actions.

## Components

Base = shadcn primitives in `components/ui/*` (adopt directly). Domain layer in `components/domain/*`: `FillGauge`, `JobStatusBadge`, `JobCard`, `JobTimeline`, `PriceTag`, `ProviderCard`, `StatCard`, `DataTable`, `EmptyState`, `PaymentMethodPicker`, `ZoneBadge`. App shells in `components/shells/*`.

## Bans

No `#000`/`#fff`, no side-stripe accent borders, no gradient text, no glassmorphism-by-default, no hero-metric template, no identical icon-card grids, no emoji icons (use lucide-react), no em dashes in UI copy.

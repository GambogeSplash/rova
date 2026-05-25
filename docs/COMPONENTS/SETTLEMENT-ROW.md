# SETTLEMENT-ROW

> Single row in the ledger table. The smallest unit of "money came in (or went out)" display.

---

## Visual

```
03:24  #7c2a  G1-ALPHA  CARRY  $4.80  $0.014  $4.786  ↗
```

Eight columns:

| Column      | Content                                | Style          |
| ----------- | -------------------------------------- | -------------- |
| Time        | `HH:MM` (today) or `MMM DD HH:MM` (older) | mono, slate    |
| Job         | `#7c2a` (jobId, truncated)              | mono, amber link |
| Robot       | `G1-ALPHA`                              | mono, bean    |
| Type        | `CARRY` (uppercase status pill style)  | mono, slate   |
| Gross       | `$4.80`                                 | mono, bean, tabular |
| Fee         | `$0.014`                                | mono, slate, tabular |
| Net         | `$4.786`                                | mono, accent if profit, alert if loss |
| External    | `↗` (Basescan link icon)                | amber          |

---

## Variants (by event type)

Each row represents one event. Color and direction differ:

### Settlement (positive — robot earned)
```
03:24  #7c2a  G1-ALPHA  CARRY  $4.80  $0.014  +$4.786  ↗
                                            ↑
                                          accent green
```

### Failed (refund — agent recovers)
```
04:18  #7d11  G1-DELTA  CARRY  $5.00  ----    refund→client  ↗
```

### Slash (loss — operator loses stake)
```
04:18  #7d11  G1-DELTA  CARRY  ----   ----   −0.48 ROVA  ↗
                                              ↑
                                             alert
```

### Sweep (treasury bulk transfer)
```
08:00  --    --        sweep  ----   ----   $164.73 → treasury  ↗
```

---

## Props

```ts
interface SettlementRowProps {
  event: SettlementEvent | SlashEvent | SweepEvent;
  variant?: "ledger" | "compact" | "mobile";
  onClick?: () => void;
}

type SettlementEvent = {
  kind: "settlement" | "failed";
  timestamp: Date;
  jobId: string;
  robotId: string;
  robotName: string;
  taskType: TaskType;
  gross: bigint;
  fee: bigint;
  net: bigint;            // can be negative for failed
  txHash: string;
};

type SlashEvent = {
  kind: "slash";
  timestamp: Date;
  robotId: string;
  robotName: string;
  reason: "GPS_MISMATCH" | "SLA_BREACH" | "DISPUTE_LOST";
  amount: bigint;          // ROVA
  txHash: string;
};

type SweepEvent = {
  kind: "sweep";
  timestamp: Date;
  totalUsdc: bigint;
  walletCount: number;
  txHash: string;
};
```

---

## Behavior

- **Click row** → opens `/job/[id]` in new tab (for settlements + slashes) or shows detail modal (for sweeps)
- **Click external arrow** → opens Basescan in new tab
- **Hover** → row highlights with cream-soft background
- **Tabular numbers** — all monetary columns use `font-variant-numeric: tabular-nums` so digits align across rows

---

## Sorting

Default: by timestamp descending. Other sort keys:
- Gross (highest first)
- Net (highest first)
- Robot name (alphabetical)
- Type (alphabetical)

Sort persists in URL.

---

## Variants

### `ledger` (default)
Full row with all 8 columns. Used in `/dashboard/earnings`.

### `compact`
Drops Job + Type columns. Used in robot detail page's mini-ledger.

### `mobile`
Stacks vertically into two lines:
```
03:24 · #7c2a · G1-ALPHA
CARRY · $4.80 → $4.786
```
Used in `MOBILE.md` Screen 1.

---

## Empty state

When the ledger has zero rows for the filter:

```
                  No settlements in this range.
                  Adjust the date filter or wait for jobs to settle.
```

A friendly empty state — no spinner if loading is fast.

---

## Loading

While the indexer query is pending, render skeleton rows:

```
░░░░░  ░░░░  ░░░░░░░░  ░░░░  ░░░░░  ░░░░░  ░░░░░  ░
░░░░░  ░░░░  ░░░░░░░░  ░░░░  ░░░░░  ░░░░░  ░░░░░  ░
```

Animated shimmer. Replaces with real rows when query resolves.

---

## Accessibility

- Wrapped in `<table>` with `<thead>` so screen readers parse correctly
- Currency announced as "four dollars eighty cents" not "four point eight"
- External link icon has `aria-label="View on Basescan"`
- Color is supplemental — positive/negative net is also indicated by `+` / `−` prefix

---

## Where used

- `/dashboard/earnings` (primary)
- `/dashboard/fleet/[robotId]` (compact, per-robot history)
- `/agent/wallet` (agent's perspective; shows their spend side)
- Mobile Screen 1 (mobile variant)
- CSV export (one row per `SettlementRow`, slightly different format — see `SETTLEMENT-LEDGER.md`)

---

## Related

- `SETTLEMENT-LEDGER.md` — the surface this row composes
- `STATE-MACHINE.md` § COMPLETED → settlement event
- `DATA-MODEL.md` § settlements + slashes tables
- `BIZ/PRICING.md` — what the fee column represents
- `DESIGN-SYSTEM.md` § typography — tabular numeric guidance

# ROBOT-TILE

> The fleet-view robot status tile. One per robot. Surfaces the load-bearing health signals at a glance.

---

## Visual

```
┌──────────────────────────────────────────────────────────────────┐
│  G1-ALPHA · Unitree G1                              ●  active     │
│  0x71C7…4e2F · battery 87% · rep 4.92                              │
│  Today: $48.21 (12 jobs) · This week: $387.21                      │
│                                                                    │
│  [ Pause ] [ Edit policy ] [ Open detail → ]                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## Props

```ts
interface RobotTileProps {
  robot: Robot;
  earnings: { today: bigint; week: bigint };
  jobsToday: number;
  battery: number;            // 0-1
  status: RobotStatus;
  lastHeartbeatAgoS: number;
  variant?: "fleet-list" | "dashboard-row" | "mobile" | "compact";
  onPauseToggle?: () => void;
  onEditPolicy?: () => void;
  onOpenDetail?: () => void;
}
```

---

## Status pills

| Status         | Color (light)    | Color (dark)    |
| -------------- | ---------------- | --------------- |
| `active`       | `forest`         | `accent`        |
| `idle`         | `teal`           | `teal`          |
| `charging`     | `amber`          | `amber`         |
| `maintenance`  | `slate`          | `text-tertiary` |
| `paused`       | `alert`          | `alert`         |

Status pill: small uppercase chip + leading filled circle.

---

## Health indicators

When something needs attention, the tile decorates:

| Signal                          | Decoration                                                   |
| ------------------------------- | ------------------------------------------------------------ |
| Battery < 20%                   | Battery readout in `alert` color                            |
| Heartbeat > 30s                 | "Heartbeat lost (47s)" yellow line below status pill        |
| Recent slash event              | Small "⚠" badge by reputation                                |
| Charging time anomaly           | Yellow "Charging +18% vs avg" line                           |
| Policy not synced               | "Policy out of sync" line + sync button                      |

---

## Behavior

- **Click anywhere except buttons** → opens detail view (`/dashboard/fleet/[robotId]`)
- **Click "Pause"** → confirmation modal → SDK push
- **Click "Edit policy"** → navigates to `/dashboard/policies/[id]`
- **Hover** → border darkens; reveal hidden "Sweep wallet" affordance on desktop

---

## Variants

### `fleet-list` (default)
Full tile with all actions. Used in `/dashboard/fleet`.

### `dashboard-row`
Compressed single-line: name + status + today's earnings. Used in `/dashboard` Tile 2 → drill-in.

### `mobile`
Stacked layout, larger tap targets, action buttons hidden behind a "⋯" menu. Used in `MOBILE.md` Screen 2.

### `compact`
Just the name + status pill + reputation. Used in tooltips, inspector panels, lists.

---

## Animation

- Status pill color transitions over 0.2s on change (per `DESIGN-SYSTEM.md` motion B)
- New tile appears with `enter` motion (motion A)
- Tile being removed (deactivated) fades + slides out (`exit`)

---

## Accessibility

- Status announced via `aria-live="polite"` on changes
- Status pill is NOT just color — always has a text label adjacent
- Battery + reputation announced as "battery 87 percent" not "87"
- Pause button has clear active state: "G1-ALPHA paused — press again to resume"

---

## Where used

- `/dashboard/fleet` — primary surface
- `/dashboard` Tile 2 — compact variant in fleet-glance
- Mobile Screen 2 — mobile variant
- Inspector panel for storm-mode robots — compact variant
- Operator's audit-log entries — compact

---

## Related

- `FLEET-OPS.md` — actions this tile launches
- `DASHBOARD.md` Tile 2
- `MOBILE.md` Screen 2
- `STATE-MACHINE.md` — what `phase` values mean

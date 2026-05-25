# JOB-CARD

> The incoming-job-offer card on the Operator's dashboard. The most-clicked component in the product.

---

## Visual

```
┌────────────────────────────────────────────────────────────────────┐
│  $7.50 CARRY · 12 min SLA                              [ Approve ] │
│  Aboki-Restock-Bot (rep 4.87 · 14 prior jobs)          [ Decline ] │
│  G1-BETA · Rack A2 → Dispatch Bay 1                                │
│                                                                    │
│  Bounty $7.50 · Robot ask $4.80 · Net to you $4.66                 │
│  Distance 18 m · Estimated completion 5m 24s                       │
│  Time to decide: 4:18 ⏱                                            │
│                                       [ ▾ More detail ]            │
└────────────────────────────────────────────────────────────────────┘
```

---

## Props

```ts
interface JobCardProps {
  offer: Offering;
  job: Job;
  robot: Robot;
  client: AgentProfile;
  timeRemainingS: number;
  onApprove: () => void;
  onDecline: (reason?: string) => void;
  variant?: "dashboard" | "alerts" | "history";
  expanded?: boolean;
}
```

---

## States

| State            | Visual change                                       |
| ---------------- | --------------------------------------------------- |
| Default          | Paper background, hairline border                  |
| Hover            | Border darkens to `bean-soft`                       |
| Time < 30s left  | Yellow border + pulse on countdown                  |
| Approving        | Approve button → spinner; entire card disabled      |
| Declining        | Decline confirms reason; slide-out animation       |
| Expanded         | Reveals client detail + risk score + economics      |
| Auto-expired     | Greyed out; slide-out; logged                       |

---

## Behavior

- **Click "Approve"** → calls `onApprove`; card shows spinner; on success slides out
- **Click "Decline"** → reveals chip-based reason selector; on confirm slides out
- **Click "More detail"** → expands inline (no modal)
- **Time-to-decide** updates every second; auto-declines at 0
- **Keyboard** — `Enter` approves, `Esc` declines, `D` opens reason picker

---

## Variants

### `variant: "dashboard"` (default)
Full card with all fields. Used in `/dashboard` Tile 4.

### `variant: "alerts"`
Compressed card. No approve/decline buttons (offer is already past); just the historical record.

### `variant: "history"`
Final-state card. Shows outcome (accepted/declined/expired) instead of countdown.

---

## Accessibility

- All buttons have `aria-label` with specific context: "Approve $7.50 CARRY job from Aboki-Restock-Bot"
- Time-remaining is announced via `aria-live="polite"` at 1m and 30s thresholds
- High-contrast mode: time-remaining color stays distinguishable (not just dependent on yellow tint)
- Reduced motion: skip the pulse animation but keep border color change

---

## Where used

- `/dashboard` Tile 4 — Incoming offers
- `/dashboard/jobs` — Past jobs list (history variant)
- Mobile (Screen 1 + 3) — compressed variant; tap for detail

---

## Related

- `JOB-APPROVAL.md` — the flow this card lives in
- `DASHBOARD.md` § Tile 4
- `DESIGN-SYSTEM.md` § component primitives
- `MOBILE.md` Screen 1

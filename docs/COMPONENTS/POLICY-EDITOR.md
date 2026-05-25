# POLICY-EDITOR (component)

> The in-page widget that lets an Operator edit a policy. The flow this lives in is in `POLICY-EDITOR.md` (no subfolder).

---

## Visual

A long form, scrollable, grouped into 5 conceptual sections (see `POLICY-EDITOR.md` for the full visual):

```
Acceptance     →  task types, capabilities, blacklist
Economics      →  price floors, price ceilings
Place + time   →  geofence, time windows
Reputation     →  threshold, max concurrent, max daily withdraw
Behavior       →  auto-accept, emergency pause
```

Each section is a collapsible accordion. Default state: all expanded.

---

## Props

```ts
interface PolicyEditorProps {
  initial: Policy;
  onChange: (next: Policy) => void;
  onSave: (next: Policy, deploy: boolean) => Promise<void>;
  onTestDryRun: (next: Policy) => Promise<DryRunResult>;
  scope?: "single-robot" | "all-robots";
  robotIds?: string[];        // which robots inherit if "all-robots"
  variant?: "full" | "compact-onboarding";
}
```

---

## Sub-components

The editor composes from smaller primitives:

| Sub-component         | What                                          |
| --------------------- | --------------------------------------------- |
| `TaskTypeMultiSelect` | The 4 checkboxes for accepted task types      |
| `PriceFloorSlider`    | Per-task-type slider with USDC display        |
| `GeofenceMapEditor`   | Map widget with bound drawing (`GEOFENCE-EDITOR.md`) |
| `TimeWindowList`      | List of (days, start, end) tuples with add/remove |
| `ReputationSlider`    | 0–10000 slider showing as stars (4.5/5)        |
| `CapabilityChipInput` | Add/remove capability tags (`CAPABILITY-CHIP.md`) |
| `AddressList`         | Blacklist entries with click-to-paste         |
| `AutoAcceptToggle`    | Two-state radio (on / off w/ manual approval)  |
| `EmergencyPauseToggle`| Emphasized danger toggle                       |

---

## Behavior

- **Every field change** → debounced 300ms → `onChange(next)`
- **"Test against last 24h"** → opens modal, fires `onTestDryRun(currentDraft)`
- **"Save"** → calls `onSave(next, false)` — persists but doesn't push to robots
- **"Save & deploy"** → calls `onSave(next, true)` — persists + pushes
- **Cancel / unsaved changes** → if dirty, confirm modal: "Discard changes?"
- **Live validation** — every primitive has its own validator; errors show inline
- **Diff indicator** — fields changed from `initial` get a small dot in the gutter

---

## States

| State           | Visual                                      |
| --------------- | ------------------------------------------- |
| Pristine        | All fields show `initial` value             |
| Dirty           | Dot indicator next to changed fields; save buttons enabled |
| Validating      | Brief spinner on the field being checked    |
| Validation error| Red border + inline message                 |
| Saving          | Save buttons → spinner; rest of form disabled |
| Saved           | Toast: "Policy saved" / "Policy deployed"   |

---

## Variants

### `full` (default)
All 5 sections, all 10 primitives, dry-run button, save+deploy. Used in `/dashboard/policies/[id]`.

### `compact-onboarding`
Subset for first-time operator (6 highest-leverage knobs). Used in `/onboard/operator/3`.

---

## Validation rules

- `acceptedTaskTypes` non-empty (or operator confirms "pause everything")
- `priceFloors[taskType]` if defined must be ≥ 0
- `priceCeilings[taskType]` must be > floor if both defined
- `geofence.bounds.lat[min] < lat[max]`, same for lng
- `timeWindows[].start` and `.end` valid HH:MM
- `reputationThreshold` in 0..10000
- `maxConcurrentJobs` ≥ 1
- `blacklist[]` entries are valid Ethereum addresses

---

## Accessibility

- Each section is a `<fieldset>` with `<legend>`
- Sliders have both visual marks AND `aria-valuetext` for screen readers
- Geofence map has a text-input fallback for visually-impaired users (manual lat/lng entry)
- Save buttons require pointer + keyboard (Enter when focused)

---

## Where used

- `/dashboard/policies/[id]`
- `/dashboard/policies/new`
- `/dashboard/fleet/[robotId]/policy`
- `/onboard/operator/3` (compact variant)

---

## Related

- `POLICY-EDITOR.md` (flow) — the surrounding screen
- `POLICIES.md` — the primitives this exposes
- `COMPONENTS/GEOFENCE-EDITOR.md`
- `COMPONENTS/CAPABILITY-CHIP.md`
- `DESIGN-SYSTEM.md` — form primitives

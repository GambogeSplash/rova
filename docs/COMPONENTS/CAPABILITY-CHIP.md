# CAPABILITY-CHIP

> Small inline tag representing a robot capability. The visual building block for capability-set lists.

---

## Visual

```
[ INDOOR_NAV ]   [ RTK_GPS ]   [ LIDAR ]   [ +RAIN_RATED ]   [ ×CAMERA_4K ]
```

A row of pill-shaped chips. Uppercase. Monospace 11px. ~28px tall.

---

## States

| State          | Visual                                              | When                                            |
| -------------- | --------------------------------------------------- | ----------------------------------------------- |
| `present`      | Light cream fill, bean border, bean text             | Robot has this capability                       |
| `absent`       | Hidden by default                                    | Robot doesn't have it                            |
| `required`     | Amber border, slightly bolder text                   | Policy requires this (highlighted in editor)    |
| `addable`      | Dashed border, `+` prefix                            | In capability picker, not yet added             |
| `removable`    | Solid border, `×` suffix on hover                    | In editor, can be removed                       |

---

## Props

```ts
interface CapabilityChipProps {
  capability: string;          // e.g., "RTK_GPS"
  state: "present" | "required" | "addable" | "removable";
  onClick?: () => void;         // for add/remove interactions
  size?: "sm" | "md";           // 24px or 28px tall
  tooltip?: string;             // hover description
}
```

---

## Standard capabilities (v1)

The known set, used in tooltips + autocomplete:

```
INDOOR_NAV       Robot can navigate inside buildings
OUTDOOR_NAV      Robot can navigate outside, in unstructured environments
RTK_GPS          Robot has differential / RTK-grade GPS (~1cm precision)
GNSS_ONLY        Robot has consumer-grade GPS only (~5m precision)
LIDAR            Robot has LIDAR for spatial awareness
CAMERA_4K        Robot has at least one 4K camera
CAMERA_THERMAL    Robot has thermal imaging
RAIN_RATED       Robot can operate in moderate rain
WATERPROOF       Robot is rated for full submersion / heavy weather
DUST_RATED       Robot is sealed against dust ingress
PAYLOAD_KG_<N>    Robot can carry up to N kg (where N ∈ {1, 5, 10, 25, 50})
SPEED_LIMIT_<N>   Robot's max speed in m/s (PAYLOAD/SPEED affect SLAs)
HUMAN_PROXIMITY  Robot is rated for human-shared spaces (safety-certified)
COLD_CHAIN       Robot has refrigerated cargo bay
SECURE_LOCK      Robot has tamper-evident cargo lock
```

Operators add capabilities via the SDK's `capabilities.toml`. Agents query against them.

Custom capabilities are allowed (free-text); SDK doesn't enforce a closed set. But standard ones get tooltips + autocomplete suggestions.

---

## Behavior

- **Hover** → tooltip with definition
- **Click (present state)** → no-op (display only)
- **Click (addable)** → adds capability to the list; fires `onClick`
- **Click (removable)** → confirms removal; fires `onClick`
- **Keyboard** → fully tab-able; Enter triggers click

---

## Color contrast

| Variant     | Background    | Border        | Text          |
| ----------- | ------------- | ------------- | ------------- |
| `present`   | `cream`       | `line-soft`  | `bean`         |
| `required`  | `amber-tint` | `amber`       | `amber-pressed` |
| `addable`   | transparent   | `line-soft` dashed | `bean-soft` |
| `removable` | `cream`       | `line-soft`  | `bean`         |

All combinations meet WCAG AA contrast on the spec'd light surface.

---

## Where used

- Robot tile (capabilities row)
- Policy editor (required capabilities list)
- Offering list (per-row capability indicator)
- Agent's offering browser (filter UI)
- Robot's `/robot/capabilities` page
- Inspector panel for robots
- Mobile robot detail screen

---

## Related

- `POLICIES.md` § requiredCapabilities — how policies use these
- `COMPONENTS/POLICY-EDITOR.md` — the editor that uses the picker variant
- `COMPONENTS/ROBOT-TILE.md` — shows present capabilities
- `AGENT-BROWSE.md` — agent filters by these
- `ROBOT-IDENTITY.md` § capability manifest — how a robot publishes its capabilities
- `DESIGN-SYSTEM.md` § component primitives

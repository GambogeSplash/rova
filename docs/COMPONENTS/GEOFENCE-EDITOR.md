# GEOFENCE-EDITOR

> Map widget with bound drawing. Operators draw the polygon that defines their warehouse boundary or service area.

v1: rectangular bounds only. v1.5: polygon drawing.

---

## v1 visual (rectangular)

```
┌──────────────────────────────────────────────────────────────────┐
│  GEOFENCE                                                        │
│                                                                  │
│  ☑ Reject offers outside bounds                                  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │            [Satellite map of the area]                     │  │
│  │                                                            │  │
│  │                  ┌──────────────┐                          │  │
│  │                  │              │                          │  │
│  │                  │   bounded    │                          │  │
│  │                  │     area     │                          │  │
│  │                  │              │                          │  │
│  │                  └──────────────┘                          │  │
│  │                                                            │  │
│  │  Drag corner handles to adjust                             │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Manual coords (advanced)                                        │
│    SW corner:  [ 6.4540 ] , [ 3.3940 ]                           │
│    NE corner:  [ 6.4555 ] , [ 3.3960 ]                           │
│                                                                  │
│  Area covered: ~14,000 m² (1.4 hectares)                         │
└──────────────────────────────────────────────────────────────────┘
```

---

## Props

```ts
interface GeofenceEditorProps {
  initial?: GeofenceBounds;
  onChange: (bounds: GeofenceBounds) => void;
  mapProvider?: "mapbox" | "google" | "none";  // none = manual entry only
  showAreaSqM?: boolean;
  variant?: "rectangle-v1" | "polygon-v1.5";
}

type GeofenceBounds =
  | { kind: "rectangle"; lat: [number, number]; lng: [number, number] }
  | { kind: "polygon"; vertices: Array<[number, number]> };
```

---

## Behavior

### Drawing
- **First load with no bounds** — map auto-centers on the operator's first robot's last-known GPS; draws a 200×200m default rectangle
- **Drag corner handles** — resize the rectangle (or move polygon vertices in v1.5)
- **Drag interior** — pan the entire rectangle to a new location
- **Type in manual coords** — alternative to map dragging; the map updates on input

### Validation
- `lat[min] < lat[max]`, same for lng — otherwise inline error "bounds inverted"
- Area > 10 m² — otherwise warning "Area suspiciously small"
- Area < 100 km² — otherwise warning "Area suspiciously large; are you sure?"
- All coords must be valid floats with ≤ 7 decimal places (matches E7 precision)

### Save behavior
- Changes flow to parent via `onChange` debounced 300ms
- Save action is the parent's responsibility (this is just an editor)

---

## v1.5 — Polygon variant

Same widget extends to polygons:

```
☑ Reject offers outside bounds
( ) Rectangle    (●) Polygon (more precise)

  [satellite map with polygon vertices as dots, lines between]

  [ + Add vertex ]    [ Delete selected ]

  Vertices: 6 · Area: ~22,000 m² (2.2 hectares)
```

Polygon constraints:
- Minimum 3 vertices
- Maximum 32 vertices
- Convex preferred (warn on concave)
- Self-intersecting polygons rejected

---

## Map provider

Default: Mapbox (already a dependency for the live fleet map). Falls back to Google Maps if Mapbox is unavailable. Falls back further to a static-no-map mode if both are unreachable.

The widget API doesn't change across providers — operators see the same affordances. Provider switch is invisible.

---

## Accessibility

- Map element has `aria-label="Geofence map. Use arrow keys to pan, plus and minus to zoom."`
- Corner handles are keyboard-focusable
- Numeric coord inputs are the primary path for keyboard-only users
- High-contrast mode: rectangle stroke + fill remain visible on the satellite imagery

---

## Performance

- Map tiles lazy-loaded (only what's visible)
- Polygon drawing is canvas-based for v1.5 (cheaper than SVG with many vertices)
- Updates throttled to 60 FPS during drag operations

---

## Where used

- `POLICY-EDITOR.md` § Place + time (component)
- `/onboard/operator/3` (compact policy editor)
- `/dashboard/policies/[id]` (full policy editor)
- Read-only view in `/dashboard/fleet/[robotId]` (shows geofence overlaid on heatmap)

---

## Related

- `POLICIES.md` § geofence — what these bounds enforce
- `POLICY-EDITOR.md` (flow + component)
- `DATA-MODEL.md` § off-chain policies
- `ERRORS.md` § Po-03 — inverted bounds

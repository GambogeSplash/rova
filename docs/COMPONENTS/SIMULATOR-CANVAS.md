# SIMULATOR-CANVAS

> The warehouse rendering — top-down + isometric + robot-POV — inside `/simulator`. The most graphics-heavy component in Rova.

Implementation lives at `WarehouseCanvas` inside `src/app/simulator/page.tsx`.

---

## Frame

A single HTML5 Canvas element, ~420 px tall, rendering at 60 FPS via `requestAnimationFrame`. Renders:

- The warehouse floor plan (shelves + dispatch bays + charging station)
- The primary robot with payload indicator
- Ambient storm robots (when storm mode active)
- A dashed path trail
- Status overlays (GPS jam scanlines, robot-down banner)
- Camera-mode badge

DPI-aware (multiplies canvas dimensions by `devicePixelRatio`). Resilient to window resize.

---

## Props

```ts
interface WarehouseCanvasProps {
  phase: Phase;
  robotPos: Point;
  cameraMode: "top-down" | "isometric" | "robot-pov";
  ambientRobots: AmbientRobot[];
  fault: InjectedFault | null;
  onClickEntity: (entity: InspectableEntity) => void;
}
```

---

## Rendering layers (drawn bottom → top)

```
1. Background fill (#080808)
2. (Apply camera transform: identity / iso matrix / POV zoom-translate)
3. Grid (faint dotted lines, 32px spacing)
4. Zone labels ("ZONE A", "DISPATCH")
5. Shelves (9 total, A1-A3 / B1-B3 / C1-C3)
6. Dispatch bays (3 total)
7. Charging station (dashed outline)
8. Path trail (dashed line through pickup + dropoff)
9. Primary robot (pulse ring + body + payload indicator + label)
10. Ambient storm robots (smaller, faded)
11. (Pop camera transform — overlays below are screen-space)
12. Fault overlay (GPS jam scanlines, robot-down banner)
13. Camera mode badge (top-right corner)
14. Top-left warehouse label
15. Live indicator (pulsing dot)
```

---

## Camera modes

### Top-down
Identity transform. The default. Best for understanding spatial layout.

### Isometric
```ts
ctx.translate(W / 2, H / 2);
ctx.transform(1, 0.32, -0.5, 0.8, 0, 0);
ctx.translate(-W / 2, -H / 2 + 30);
```

Tilts the scene ~30°. Shelves render as if seen from a corner. Adds depth perception without 3D.

### Robot-POV
```ts
const zoom = 2.6;
const cx = currentRobotPos.current.x * W;
const cy = currentRobotPos.current.y * H;
ctx.translate(W / 2, H / 2);
ctx.scale(zoom, zoom);
ctx.translate(-cx, -cy);
```

Zooms into the robot, follows it as it moves. Pedagogical hook — "what would the robot see?"

---

## Click hit-testing

`handleClick` accepts a `React.MouseEvent`, converts to normalized canvas coords, and hit-tests against:

1. **Primary robot** — circle of radius ~0.03 (normalized) around current position
2. **Each shelf** — axis-aligned bounding box from `SHELVES` constant
3. **Each dispatch bay** — axis-aligned bounding box from `DISPATCH_BAYS` constant

Returns an `InspectableEntity` to `onClickEntity`, which surfaces in the inspector panel.

Hit-test runs in screen-space, not transformed space. Isometric or POV modes don't change which pixel corresponds to which entity — clicking the robot's apparent position works in all modes.

---

## Path trail

Drawn during all non-idle phases. A dashed line from:
- Charging station (`home`) → Rack B3 (pickup) → Dispatch Bay 2 (delivery)

Color: faint amber (`rgba(239,111,46,0.1)`). Doesn't compete with the robot itself for attention.

---

## Robot rendering

The primary robot is composed of:
- A pulse ring (sin-wave alpha, 12 → 18 px radius)
- A radial-gradient body (12 px radius, accent color falloff)
- A solid orange dot (4 px) at the center
- A small yellow circle (4 px) at +10,-10 offset when carrying a payload
- A monospace label below ("G1-ALPHA" or "G1-ALPHA · DOWN" if faulted)

Ambient robots (storm mode) use a simpler render: solid teal circle + label + smaller payload indicator. Faulted ambient robots flip to red.

---

## Fault overlays

### GPS jam
Screen-space red wash (8% alpha) + horizontal scanlines (every 3px, 18% red lines). Big "⚠ GPS JAM" text top-left.

### Robot down
No wash, just a "⚠ ROBOT HEARTBEAT LOST" banner top-left.

Both overlays drawn AFTER the camera transform is popped — they're UI, not part of the rendered scene.

---

## Animation

- `time` accumulates by 0.016 per frame (rough 60 FPS step)
- Robot position lerps toward target at 3% per frame (smooth follow)
- Pulse ring scale + alpha oscillate as `sin(t * 3)` and `sin(t * 4)` for variety
- Live indicator pulses on alpha
- Ambient robots step at 80ms intervals (separate setInterval, not part of the canvas loop)

---

## Performance

Tested:
- Desktop Chrome: 60 FPS at 1440p with 8 storm robots
- iPad Safari: 60 FPS at native res with 4 storm robots
- iPhone: 30 FPS at native res with 2 storm robots (scaled down automatically)

Canvas is cleared and redrawn each frame — no incremental updates. The scene is simple enough that this is fast.

---

## Accessibility

Canvas elements are inherently inaccessible to screen readers. Mitigation:
- The simulator's other components (event log, lifecycle stepper, narrative bar) carry the protocol meaning in accessible text
- The canvas is decorative for SR users — they get the protocol from the structured data
- High-contrast mode: keep accent color visible against `#080808`; status colors don't lose distinguishability

Reduced motion: skip the pulse + sine oscillations, keep position lerp (it's a physical motion, not decoration).

---

## Where used

- `/simulator` (the only place)

---

## Related

- `SIMULATOR.md` — the surrounding screen + lifecycle
- `ARCH/SIMULATOR.md` — the engine's architecture
- `DESIGN-SYSTEM.md` § motion — animation primitives
- `STATE-MACHINE.md` — phases this canvas visualizes

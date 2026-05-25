# ARCH/SIMULATOR

> The in-browser warehouse engine. How `/simulator` actually runs — state model, render loop, lifecycle driver, fault injection.

User-facing spec lives in `SIMULATOR.md` + `COMPONENTS/SIMULATOR-CANVAS.md`.

---

## Frame

The simulator is a TypeScript-only port of the Rova lifecycle. No chain calls, no real contracts, no real network. Just a faithful animation of the protocol's mechanics.

Three engines run in parallel:

```
1. Phase driver        →  advances through PHASE_ORDER on setTimeout
2. Canvas renderer     →  60 FPS rAF loop
3. Storm tick          →  setInterval moving ambient robots
```

Each is independent. State changes flow through React; rendering happens in a `useEffect`-attached `requestAnimationFrame` loop.

---

## State (`SimulatorPage` hooks)

```ts
const [phase, setPhase]           = useState<Phase>("idle");
const [logs, setLogs]             = useState<LogEntry[]>([]);
const [running, setRunning]       = useState(false);
const [robotPos, setRobotPos]     = useState<Point>(WAREHOUSE_LOCATIONS.home);
const [speed, setSpeed]           = useState(1);
const [paused, setPaused]         = useState(false);
const [cameraMode, setCameraMode] = useState<CameraMode>("top-down");
const [injectedFault, setInjectedFault] = useState<InjectedFault | null>(null);
const [stormActive, setStormActive] = useState(false);
const [stormCount, setStormCount] = useState(4);
const [ambientRobots, setAmbientRobots] = useState<AmbientRobot[]>([]);
const [inspected, setInspected]   = useState<InspectableEntity | null>(null);

const timeoutRef    = useRef<NodeJS.Timeout | null>(null);
const phaseIndexRef = useRef(0);
const pausedRef     = useRef(false);
const stormTickRef  = useRef<NodeJS.Timeout | null>(null);
```

Why some `useRef` and some `useState`: React state triggers re-renders. The `setTimeout` callbacks in the phase driver need to *read* the latest paused state without triggering re-renders on every check — hence `pausedRef`. Same for `phaseIndexRef` (the advance loop reads + increments).

---

## Phase driver

Drives the simulation through `PHASE_ORDER`:

```ts
const PHASE_ORDER: Phase[] = [
  "idle", "boot", "job_posted", "matching", "escrow_locked",
  "navigating_pickup", "picking_up", "navigating_delivery", "delivering",
  "proof_submitted", "build_userop", "submit_bundler", "verifying", "settled",
];
```

The `advance()` function called from `runSimulation()`:

```ts
const advance = () => {
  if (phaseIndexRef.current >= PHASE_ORDER.length) return;
  if (pausedRef.current) {
    timeoutRef.current = setTimeout(advance, 100);
    return;
  }

  const p = PHASE_ORDER[phaseIndexRef.current];
  setPhase(p);
  setRobotPos(WAREHOUSE_LOCATIONS[PHASE_CONFIG[p].robotTarget]);

  const log = getPhaseLog(p, formatTime());
  if (log) setLogs((prev) => [...prev, log]);

  // Fault firing branches here (see below)

  phaseIndexRef.current++;
  const duration = PHASE_CONFIG[p].duration;
  timeoutRef.current = setTimeout(advance, duration / speed);
};
```

Each phase has a configured duration in `PHASE_CONFIG`. The driver uses `setTimeout`, scaled by `speed`. Paused state polls every 100ms — wasteful but correct.

---

## Camera transform

Canvas applies one of three transforms before rendering the scene:

```ts
if (cameraMode === "isometric") {
  ctx.translate(W / 2, H / 2);
  ctx.transform(1, 0.32, -0.5, 0.8, 0, 0);  // axonometric tilt
  ctx.translate(-W / 2, -H / 2 + 30);
} else if (cameraMode === "robot-pov") {
  const zoom = 2.6;
  const cx = currentRobotPos.current.x * W;
  const cy = currentRobotPos.current.y * H;
  ctx.translate(W / 2, H / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-cx, -cy);
}
// else top-down: identity
```

The transform stack:
1. `ctx.save()` at start
2. Apply transform
3. Draw all world-space content (grid, shelves, robot, etc.)
4. `ctx.restore()` — back to screen space
5. Draw all UI overlays (badges, fault banners, warehouse label)

This means click hit-testing operates in world space (normalized 0–1 coords) regardless of camera mode — the visitor clicks where they see the entity, and the math works out.

---

## Fault injection

`InjectedFault` is queued in state. When `advance()` enters the phase that matches `fault.injectedAt`, the driver:

1. Marks `triggered: true`
2. Emits a fault-specific log entry (e.g., `"⚠ GPS multipath detected · destination check will fail"`)
3. For *terminating* faults (`robot_down`, `sla_breach`, `escrow_stuck`, `sensor_failure`), the driver stops advancing — phase remains on the fault phase
4. For *outcome-flipping* faults (`gps_jam`), the driver continues to `verifying`, then replaces the "all checks passing" log with a rejected one + halts before `settled`

The visual surface picks up the fault through the canvas's `fault` prop:
- `gps_jam` → red scanline overlay
- `robot_down` → "ROBOT HEARTBEAT LOST" banner + red label on robot

---

## Storm mode

Storm spawns `stormCount` (2-8) ambient robots wandering between `AMBIENT_WAYPOINTS`. Each robot:
- Has a `pos` and `target`
- Moves toward target at ~0.008 normalized units per tick (80ms interval)
- On arrival, picks a new random target + toggles payload state
- Has a 5% chance per arrival of flipping to `faulted: true` (red rendering)

Storm has no effect on the primary lifecycle. It's pure background — visual proof that the protocol scales beyond one robot.

The interval is canceled when storm is toggled off, restarted (with fresh robots) when re-enabled.

---

## Click hit-testing

`handleClick` on the canvas:

```ts
const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
  const rect = canvasRef.current!.getBoundingClientRect();
  const cx = (e.clientX - rect.left) / rect.width;
  const cy = (e.clientY - rect.top) / rect.height;

  // Robot hit-test (priority over shelves)
  const rdx = cx - currentRobotPos.current.x;
  const rdy = cy - currentRobotPos.current.y;
  if (rdx * rdx + rdy * rdy < 0.001) {
    onClickEntity({ kind: "robot", id: "G1-ALPHA", ... });
    return;
  }

  // Shelf bounding box check
  for (const s of SHELVES) {
    if (cx >= s.x && cx <= s.x + s.w && cy >= s.y && cy <= s.y + s.h) {
      onClickEntity({ kind: "shelf", id: `RACK-${s.label}`, ... });
      return;
    }
  }

  // Dispatch bay check
  for (const b of DISPATCH_BAYS) {
    // ...
  }
};
```

Hit-test order: robot first (visually on top), shelves and bays second. Background clicks are no-op (no entity at the cursor).

---

## Renderer

`WarehouseCanvas` uses `requestAnimationFrame` for the draw loop:

```ts
useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const draw = () => {
    // DPI-aware resize each frame (handles window resize)
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;
    timeRef.current += 0.016;

    // 1. Clear, 2. Apply transform, 3-N. Draw scene, N+1. Restore, ...draw overlays...
    // (see code at WarehouseCanvas)

    animFrameRef.current = requestAnimationFrame(draw);
  };
  animFrameRef.current = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(animFrameRef.current);
}, [phase, hasPayload, robotPos, cameraMode, ambientRobots, isFaulted, isGpsJammed, isRobotDown]);
```

Re-attaches the draw loop when any rendering input changes. Inside the loop, position is lerped toward `targetRobotPos.current` for smooth motion between phase transitions.

---

## Speed + step

Speed is a multiplier on phase duration. Step button (paused only) advances exactly one phase, bypassing the timeout chain:

```ts
const stepOnce = useCallback(() => {
  if (!paused || phaseIndexRef.current >= PHASE_ORDER.length) return;
  const p = PHASE_ORDER[phaseIndexRef.current];
  setPhase(p);
  setRobotPos(WAREHOUSE_LOCATIONS[PHASE_CONFIG[p].robotTarget]);
  const log = getPhaseLog(p, formatTime());
  if (log) setLogs((prev) => [...prev, log]);
  phaseIndexRef.current++;
}, [paused]);
```

Useful for pedagogy — pause, then step through each transition to understand what's happening.

---

## Inspector panel

Sliding right-edge drawer shown when `inspected` is non-null. Receives a structured `InspectableEntity`:

```ts
type InspectableEntity = {
  kind: "robot" | "shelf" | "bay" | "agent" | "contract";
  id: string;
  label: string;
  data: Record<string, string>;
};
```

The panel is dumb — just renders the kv pairs. Population of `data` happens in the canvas's `handleClick`:

```ts
onClickEntity({
  kind: "robot",
  id: "G1-ALPHA",
  label: "G1-ALPHA",
  data: {
    model: "Unitree G1",
    phase: phase,
    payload: hasPayload ? "1.4 kg bin" : "none",
    gps: `${(currentRobotPos.current.x * 100).toFixed(4)}°, ${(currentRobotPos.current.y * 100).toFixed(4)}°`,
    battery: "87 %",
    stake: "100 ROVA",
    reputation: "4920 / 5000",
    wallet: "0x71C7…4e2F",
    fault: isFaulted ? (fault?.type ?? "—") : "none",
  },
});
```

Adding a new entity kind = add a hit-test branch + populate `data`.

---

## Keyboard handler

A global `keydown` listener:

```ts
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.code === "Space" && running) {
      e.preventDefault();
      setPaused((p) => !p);
    } else if (e.code === "Escape") {
      setInspected(null);
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [running]);
```

Adding shortcuts = add branches here.

---

## Why not a state machine library

We considered XState. Rejected because:
- The lifecycle is linear (sequential phases), not a graph
- The number of phases is small (~14)
- Adding XState's runtime + types adds 30KB to the bundle for marginal benefit
- The driver code is < 100 lines; readable as-is

If the simulator grows (multi-agent storms with their own lifecycles, branching paths), XState may be worth revisiting.

---

## Performance notes

- Canvas redraws at 60 FPS even when "nothing changes" — easier than state-tracking
- Storm robots use the same canvas as the primary scene — no separate canvas
- Event log uses virtual scrolling at > 100 entries (most demos don't reach this)
- Lifecycle stepper is plain DOM — small enough to render every frame React drops

Tested:
- 60 FPS on M1 MacBook Air
- 30-60 FPS on iPad Pro
- ~30 FPS on iPhone (acceptable; banner suggests desktop)

---

## File map

```
src/app/simulator/page.tsx
  ├─ Constants (WAREHOUSE_LOCATIONS, SHELVES, DISPATCH_BAYS, PHASE_CONFIG, ...)
  ├─ Type definitions (Phase, CameraMode, FaultType, ...)
  ├─ Helper functions (getPhaseLog, getNarrative, formatTime, roundRect)
  ├─ Sub-components (WarehouseCanvas, ConnectionBar, ProtocolLog, ACPJobCard, ...)
  ├─ Toolboxes (SpeedControls, InjectFaultsToolbox, CameraModeToggle, InspectorPanel, StormControls)
  └─ Main: SimulatorPage (state + advance + JSX)
```

All in one file. ~1700 lines. Splitting would help — flagged for v2 cleanup; current single-file is fine for now.

---

## Related

- `SIMULATOR.md` — user-facing spec
- `COMPONENTS/SIMULATOR-CANVAS.md` — canvas component detail
- `STATE-MACHINE.md` — the production lifecycle the simulator faithfully ports
- `DESIGN-SYSTEM.md` § motion — animation primitives
- `ERRORS.md` — failure modes the toolbox surfaces

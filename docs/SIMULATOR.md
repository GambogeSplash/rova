# SIMULATOR

> The in-browser warehouse demo. The visitor's first protocol experience — walk through the full Rova lifecycle in 3 minutes without touching a wallet or a robot.

---

## Frame

The simulator at `/simulator` is the single most important visitor surface. More people will see it than will ever read the docs. It must:

1. Show the full lifecycle end-to-end with no setup
2. Make the protocol's mechanics legible — escrow, proof, settlement — without explanation
3. Demonstrate failure modes are handled, not glossed
4. Be inspectable: every entity is clickable, every value is real-looking

The simulator is not just marketing. It's the QA harness, the developer onramp, the operator's first dry-run, and the agent builder's "let me see what this looks like."

---

## Audience

- **Visitors** evaluating the protocol — "what does this actually do?"
- **Robotics developers** assessing integration complexity
- **Operators** dry-running before installing the SDK
- **Agent builders** prototyping against the lifecycle
- **Investors / partners** during pitch demos

Each audience has different needs but the same surface serves all four — different things matter to each, the simulator makes them all visible.

---

## Surface

Single page at `/simulator`. No left sidebar. Custom top bar.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ROVA / Simulator           ACP·ROS2·Base·Bundler   Top|Iso|POV   ⏸ Step 0.5 1 2 4   [Post Job] │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┬───────────────────────────────┐  │
│ │                                         │  LIFECYCLE                    │  │
│ │           [warehouse canvas]            │   1. Boot               (SYS) │  │
│ │                                         │   2. ACP Job Posted     (ACP) │  │
│ │                                         │   3. Matching           (ACP) │  │
│ │                                         │   4. Escrow Locked      (CHN) │  │
│ │                                         │   5. Navigate Pickup    (ROS) │  │
│ │                                         │   6. Verify Package     (ROS) │  │
│ │                                         │   7. Navigate Dispatch  (ROS) │  │
│ │                                         │   8. Delivery Confirmed (ROS) │  │
│ │                                         │   9. Submit Proof       (ACP) │  │
│ │                                         │  10. Build UserOp       (4337)│  │
│ │                                         │  11. Submit Bundler     (BDL) │  │
│ │                                         │  12. Verify Onchain     (CHN) │  │
│ │                                         │  13. Settled            (CHN) │  │
│ │  (narrative bar)                        │                               │  │
│ │  (protocol event log)                   │  INJECT FAULT                 │  │
│ │                                         │   GPS Jam · Robot Down ·       │  │
│ │                                         │   Escrow Stuck · SLA · Sensor  │  │
│ │                                         │                               │  │
│ │                                         │  MULTI-AGENT STORM            │  │
│ │                                         │  [OFF] · slider 2-8           │  │
│ │                                         │                               │  │
│ │                                         │  (data cards: ACPJob,         │  │
│ │                                         │   UserOp, Settlement)         │  │
│ └─────────────────────────────────────────┴───────────────────────────────┘  │
│ (Pitch section below — Why the Robotics Lab + checklist)                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Components

| Component                | What                                              | Source                                  |
| ------------------------ | ------------------------------------------------- | --------------------------------------- |
| Top bar                  | Brand · connection dots · camera mode · controls · CTA | `src/app/simulator/page.tsx` top section |
| Warehouse canvas         | Top-down / isometric / POV view of the warehouse    | `WarehouseCanvas` in same file          |
| Narrative bar            | Plain-language description of the current phase    | `NarrativeBar`                           |
| Protocol event log       | Time-ordered events from ACP/ROS2/CHAIN/BUNDLER/WALLET sources | `ProtocolLog`                  |
| Lifecycle stepper        | 13-stage progress display                          | `LifecycleStepper`                       |
| ACP Job card             | Live JSON view of the on-chain job object          | `ACPJobCard`                              |
| UserOp card              | ERC-4337 UserOperation construction view           | `UserOpCard`                              |
| Settlement card          | Final receipt when settled                         | `SettlementCard`                          |
| Inject-faults toolbox    | 5 fault types queueable before/during run         | `InjectFaultsToolbox`                    |
| Storm controls           | Multi-agent ambient traffic                        | `StormControls`                           |
| Camera mode toggle       | Top / Iso / POV                                    | `CameraModeToggle`                       |
| Inspector panel          | Click any entity → slide-in detail                 | `InspectorPanel`                          |

All shipped today (see commit `4e7f116`).

---

## Lifecycle

13 phases per the existing implementation:

```
idle → boot → job_posted → matching → escrow_locked
     → navigating_pickup → picking_up → navigating_delivery → delivering
     → proof_submitted → build_userop → submit_bundler → verifying → settled
```

Maps to the canonical lifecycle in `STATE-MACHINE.md` with two simulator-specific phases:
- `boot` (visualizes the connections lighting up)
- `build_userop` + `submit_bundler` (visualizes the ERC-4337 path explicitly because it's pedagogically important)

These extras don't exist in the production state machine — they're for the simulator's narrative pacing.

---

## Inject-faults toolbox

Five fault types, each fires at a specific phase:

| Fault            | Fires at               | Effect on lifecycle                                |
| ---------------- | ---------------------- | -------------------------------------------------- |
| `gps_jam`        | `navigating_delivery`  | Proof rejected with GPS_MISMATCH; refund + slash   |
| `robot_down`     | `navigating_pickup`    | Heartbeat lost; SLA breach; bounty refund + slash  |
| `escrow_stuck`   | `build_userop`         | Bundler rejects UserOp; settlement hangs           |
| `sla_breach`     | `navigating_delivery`  | Force `block.timestamp > deadline`; slash          |
| `sensor_failure` | `picking_up`           | Sensor frame invalid; proof aborted                |

Visitor selects a fault → runs the sim → sees exactly how Rova handles that failure. The most common "but what if..." question answered visually.

---

## Multi-agent storm

Toggle + slider. When active:
- Spawns N (2–8) ambient robots wandering the canvas
- They post and complete background jobs at random
- Occasional fault state (~5% of robots show red)

Visual demonstration that the protocol scales beyond one robot. Otherwise the demo feels like a one-shot toy.

The primary demo flow (main robot + its lifecycle) continues to play in the foreground; storm robots are ambient.

---

## Camera modes

Three modes, all canvas transforms on the same scene:

- **Top-down** (default) — orthographic view
- **Isometric** — canvas matrix transform; tilts the scene ~30°
- **Robot-POV** — zooms 2.6× centered on the primary robot, follows its motion

POV mode is the most "look I'm a robot" pedagogical hook. Visitors usually try it third after seeing the default + iso.

---

## Inspector panel

Click any entity (primary robot, ambient robot, shelf, dispatch bay) → slide-in right-edge panel with structured data:

```
ROBOT · G1-ALPHA
model         Unitree G1
phase         navigating_delivery
payload       1.4 kg bin
gps           52.4137°, -1.5108°
battery       87 %
stake         100 ROVA
reputation    4920 / 5000
wallet        0x71C7…4e2F
fault         none
```

Esc to close. The same shape as the Operator dashboard's robot detail — visitors who later become operators see consistent design language.

---

## Keyboard shortcuts

- `Space` — pause / resume
- `Esc` — close inspector
- `S` — open storm controls (future)
- `R` — restart sim (future)

Visible in a tooltip on first visit. After first use, hidden but still active.

---

## Narrative bar

Above the protocol log. Plain-language description of the current phase:

```
What's happening
G1-ALPHA submits a composite proof to ROVAVerifier.sol —
GPS coordinates confirm delivery location, timestamp proves
SLA compliance, sensor hash verifies payload integrity.
```

Updates with each phase transition. Writes by the visitor's mental model — agent / robot / chain are the three actors, the narrative names whichever is most active right now.

---

## Protocol event log

Time-ordered list of events. Each row:

```
HH:MM:SS  [ACP]   Job posted → CARRY · Rack B3 → Dispatch Bay 2
                  bounty: 2.00 USDC · schema: ROVA-CARRY-v1
```

Source colors:
- `SYS` — neutral
- `ACP` — orange/amber (agent communication)
- `ROS2` — teal (robot operating system)
- `CHAIN` — forest green (on-chain)
- `BUNDLER` — amber (ERC-4337 path)
- `WALLET` — slate (signing operations)

A visitor learning the protocol watches the log scroll and sees: which actor is doing what, when.

---

## Pitch section (below the fold)

Two-column layout below the live simulator:

```
WHY THE ROBOTICS LAB

This simulator shows the full protocol flow.
The missing step is validating the physical execution
loop with real robots.

Access to the lab and the Unitree G1 robots would
allow ROVA to complete that final step — validating
agent-to-robot coordination in the real world.
```

Right column:

```
WHAT WE'VE VALIDATED
• Agent-to-robot task posting via ACP v2
• Onchain escrow lock and release
• GPS + timestamp proof verification
• ERC-4337 gasless robot payments
• Automatic settlement on Base
• Fleet operator policy controls

WHAT THE LAB UNLOCKS
• Real Unitree G1 physical task execution
• Sensor-to-chain proof pipeline
• Multi-robot fleet coordination
• Real-world SLA validation
```

The pitch section was designed for hackathon-readers (Base Batches 003 / 0G Onsite). When Rova ships v1, this section will rotate to "What's working in production" + "How to get involved."

---

## Performance

Canvas redraws at 60 FPS. Event log scroll is virtualized (only renders visible rows). Lifecycle stepper renders 13 items max.

Tested on:
- Desktop Chrome / Safari / Firefox (smooth)
- iPad / Safari (smooth with reduced storm count)
- iPhone (works but cramped; designed for tablet+)

For mobile users, a banner suggests "View on desktop for full experience."

---

## Visitor → operator conversion

The simulator's pitch section CTAs:
- "Try with real robots" → `/onboard/operator`
- "Read the spec" → `/docs/spec`
- "I have an agent" → `/onboard/agent`

Some visitors hit these immediately. Most leave + come back. The `/simulator` page sets a cookie + later marketing surfaces show "Pick up where you left off" prompts.

---

## Simulator vs production

The simulator is a faithful walk of the production lifecycle with these differences:

| Aspect            | Simulator                                   | Production                          |
| ----------------- | ------------------------------------------- | ----------------------------------- |
| Chain calls       | Mocked locally                              | Real Base Sepolia / mainnet         |
| GPS coordinates    | Hardcoded warehouse layout                  | Robot's actual GNSS readings        |
| Sensor data       | Mock values + mock keccak256                | Real sensor frames + real hashes    |
| Timing            | Compressed (each phase = 1-3s)              | Real-world (~10 min per CARRY job)  |
| Failure injection | UI-triggered                                | Natural failure                     |
| Storm robots      | Synthetic                                   | Real ambient fleet                  |

The lifecycle order is identical. The phase names match. The event log uses real event names. The data card JSON uses real schemas.

A visitor who learns the protocol via the simulator will recognize every piece in production.

---

## Edge cases

- **Visitor leaves mid-run.** No state persistence — refresh starts a clean sim. (Intentional; simulator is a demo, not a continuation.)
- **Multiple tabs open.** Each runs independently; no shared state.
- **Reduced motion preference.** Spring animations soften to opacity-only; canvas still animates (physical scene, not decoration).
- **JS disabled.** Static fallback message + screenshot.

---

## Related

- `STATE-MACHINE.md` — what the simulator's lifecycle visualizes
- `PROOF.md` — what `proof_submitted` and `verifying` represent
- `ERRORS.md` § J + P + S — the faults the toolbox demonstrates
- `MARKETING.md` — the broader visitor flow `/simulator` slots into
- `SIMULATOR-TO-REAL.md` — converting a sim session into onboarding
- `ARCH/SIMULATOR.md` — the engine's architecture

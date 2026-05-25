# SIMULATOR-TO-REAL

> Converting a simulator session into a real operator onboarding. The bridge between "I saw the demo" and "my robot is live."

v1.5 priority. v1 has the visitor click "Apply" and start onboarding from scratch.

---

## Frame

A visitor finishes the simulator. They've watched the lifecycle, tried inject-faults, opened the inspector. They're convinced.

Two ways they can convert today:
- **Apply** for a pilot (asynchronous; we follow up in days)
- **Onboard** as an operator (synchronous; full flow from `ONBOARDING.md`)

Both lose context — the visitor has to re-explain what they want. The simulator-to-real bridge captures that context and pre-fills the onboarding flow.

---

## Capture model

While the visitor uses the simulator, we passively capture engagement signals:

```ts
type SimulatorSession = {
  sessionId: string;           // anonymous, generated at first /simulator load
  startedAt: Date;
  lastInteractionAt: Date;

  // Engagement signals
  fullLifecyclesCompleted: number;     // watched start → settled at least once
  injectedFaults: FaultType[];          // which ones they tried
  cameraModesUsed: CameraMode[];        // which views they explored
  stormActivated: boolean;
  inspectorOpens: number;               // how many entities they inspected

  // Visitor input (optional)
  declaredInterest?: "operator" | "agent" | "robot-partner";
  estimatedFleetSize?: number;
  estimatedTaskVolume?: number;
};
```

Stored in localStorage + sent to the indexer on session close. Survives reload + revisit.

---

## The bridge CTA

After the visitor has completed at least one full lifecycle, a non-intrusive footer appears:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  You've watched 3 cycles. Want to try this with real robots?            │
│                                                                         │
│  → I have robots, take me to onboarding                                  │
│  → I'm an agent builder, take me to the SDK                              │
│  → Not now, just exploring                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

Three paths. The "Not now" option is honest — no dark patterns.

---

## Bridge to onboarding (Operator path)

Click "I have robots":

1. Show a 2-question modal:

```
Quick question (10 seconds):

How many robots in your fleet?
( ) 1     ( ) 2-5     ( ) 6-20     ( ) 20+

Primary robot model?
[ Unitree G1 / Spot / Reachy / Custom ROS2 / Other ▾ ]

[ Continue → Onboarding ]
```

2. The answers pre-fill the onboarding flow:
   - First robot's "Model" field
   - Defaults for stake (lower for "20+" fleets — bulk discount)
   - Auto-selects appropriate policy template (`Outdoor Last-Mile` for delivery-suggesting fleets, etc.)

3. Direct to `/onboard/operator/1` with pre-filled context.

The simulator session data flows through to onboarding telemetry — we can see "this operator watched 3 lifecycles + injected GPS-jam fault, then onboarded with a 5-robot fleet."

---

## Bridge to agent SDK (Agent path)

Click "I'm an agent builder":

1. Show a 2-question modal:

```
Quick question:

What's your agent doing?
[ Restock / Last-mile / Inspection / Other ▾ ]

Where does it live?
[ Virtuals / Custom Node.js / Custom Python / Other ▾ ]

[ Continue → SDK Quickstart ]
```

2. Direct to `/docs/sdk-agent` with a callout banner:
   "Setting up your first job for [Restock]. We've pre-loaded the [Virtuals] example."

3. Codeblock examples on the SDK page swap to match the visitor's stated runtime.

---

## Bridge to apply (Robot partner path)

Click "I sell robots":

1. Direct to `/apply` with the "Robot partner" track preselected
2. Pre-fill "Number of deployed units" with a hint (based on simulator session — were they exploring large-scale features?)

---

## Continuation across visits

If the visitor leaves without converting, the cookie + localStorage persist their session. On return:

- `/simulator` shows: "Welcome back. Last visit you watched [N] cycles."
- `/` (marketing landing) shows a personalized strip: "Continue where you left off → resume simulator → onboard"

After 30 days of no activity, the session is cleared.

---

## Privacy

The simulator session is anonymous. We collect:
- Sessions don't have an identity until the visitor connects a wallet
- IP is hashed, never stored raw
- No fingerprinting (no canvas hash, no font enumeration)
- We tell the visitor what's tracked in a single tooltip: "We track which features you try in the simulator so we can tailor onboarding. Clear at any time → button"

If the visitor clears their session, server-side we delete the SessionId record + any inferred preferences.

---

## What we learn

Aggregate analytics on simulator → onboarding conversion:

| Simulator behavior            | Conversion to onboard | Notes                                          |
| ------------------------------ | ---------------------- | ---------------------------------------------- |
| Watched 1 lifecycle only       | ~3%                    | Tire-kickers                                   |
| Tried inject-faults             | ~12%                   | Engineers — they want to know how it breaks    |
| Opened inspector ≥ 3 entities   | ~18%                   | Deep researchers; usually pilot-quality        |
| Activated multi-agent storm    | ~22%                   | Visualizing scale; usually operator-class      |
| Came back ≥ 2 visits            | ~31%                   | Already convinced; needs nudge                 |

The simulator inspires self-selection. People who try faults + storm + inspector are the people Rova wants.

---

## When NOT to bridge

Don't show the bridge CTA in these cases:

- Visitor is on a tiny screen (mobile — they're not converting from a phone)
- Visitor has been on `/simulator` less than 60 seconds (they haven't engaged enough)
- Visitor has the "do not track" header set (respect)
- Visitor is currently inside an active lifecycle (don't interrupt)

The CTA is patient. It appears in the right moments and disappears the rest of the time.

---

## v2 evolution

- **Bridge to specific verticals** — visitor says they're in healthcare → pre-populate use cases + templates for healthcare-specific deployments
- **Personalized pricing** — fleet size + task volume → estimated monthly revenue range with a "Calculate yours" interactive
- **Demo bot pre-deployment** — visitor onboards with a Rova-managed demo robot (sim instance) so their first 50 jobs happen without their own hardware
- **Cross-product bridging** — a Chaum visitor exploring agent identity gets bridged to Rova as "the marketplace your agent will use"

---

## Related

- `SIMULATOR.md` — the surface the visitor's coming from
- `ONBOARDING.md` — the Operator path destination
- `SDK-AGENT.md` — the Agent path destination
- `MARKETING.md` — the broader visitor flow
- `IA.md` — URL structure

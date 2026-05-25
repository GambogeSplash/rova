# MOBILE

> The Operator's phone companion. Read-mostly, triage-first. The dashboard's smallest viable surface.

v1.5 priority. v1 has a responsive `/dashboard` that collapses on phones, but it's not the optimized surface.

---

## Audience

Operator on the go. Specifically:
- Awakened by a push notification at 02:14
- Riding to a meeting, needs to check fleet health
- Out for lunch, wants to approve an unusual offer
- Travelling, wants to see overnight earnings

They are NOT trying to:
- Re-author a policy from scratch
- Edit a geofence on a phone map
- Run a deep ledger export

Editing-heavy work pushes to desktop.

---

## Entry point

`https://rova-ashy.vercel.app/m/` — a separate URL prefix optimized for phones. Or PWA install: "Add to home screen" creates a `Rova Ops` icon.

The desktop dashboard detects narrow viewport and offers a "Open mobile view" banner; choosing it remembers the preference.

---

## The four screens

### Screen 1 — Today (default landing)

```
╔══════════════════════════════╗
║  ROVA Ops · 07:14            ║
║                              ║
║  $221.04                     ║
║  ─ overnight ─               ║
║  47 jobs · 3 failed          ║
║                              ║
║  ████░░░░░░░░░░░░░░          ║
║  6/7 robots online           ║
║                              ║
║  ⚠ 3 alerts                  ║
║  ⚡ 4 offers pending          ║
║                              ║
║  ────────────────            ║
║  RECENT (last 8)             ║
║                              ║
║  03:24 G1-ALPHA  CARRY $4.78 ║
║  03:18 G1-BETA   SORT  $3.19 ║
║  03:11 G1-ALPHA  CARRY $5.08 ║
║  03:04 G2-OMEGA  CARRY $7.48 ║
║  ...                         ║
║                              ║
║  ┌──────┬──────┬──────┬────┐ ║
║  │Today │Fleet │ Alts │More│ ║
║  └──────┴──────┴──────┴────┘ ║
╚══════════════════════════════╝
```

Single screen, scrollable. Big headline number. Fleet status bar. Two clickable badges (alerts, pending). Recent settlements list.

Bottom nav: 4 tabs (Today / Fleet / Alts / More).

### Screen 2 — Fleet

```
╔══════════════════════════════╗
║  ROVA Ops · Fleet            ║
║                              ║
║  G1-ALPHA   ●  active        ║
║  87% battery · rep 4.92      ║
║  Today $48.21 · 12 jobs       ║
║                              ║
║  G1-DELTA   ⚠  charging      ║
║  14% battery · rep 4.41      ║
║  Today $0 · 0 jobs            ║
║                              ║
║  G2-OMEGA   ●  active        ║
║  76% battery · rep 4.78      ║
║  Today $52.94 · 14 jobs       ║
║                              ║
║  ...                         ║
║                              ║
║  ┌──────┬──────┬──────┬────┐ ║
║  │Today │Fleet │ Alts │More│ ║
║  └──────┴──────┴──────┴────┘ ║
╚══════════════════════════════╝
```

One row per robot. Tap any robot → robot detail screen (full-screen panel; see Screen 5).

### Screen 3 — Alerts

```
╔══════════════════════════════╗
║  ROVA Ops · Alerts (3)       ║
║                              ║
║  ⚠ HIGH                      ║
║  G1-DELTA charging time      ║
║  +18% on past week           ║
║  → Inspect robot              ║
║                              ║
║  ⚠ MEDIUM                    ║
║  JOB-7c3a awaiting settlement║
║  Verified 8 min ago          ║
║  [ Settle now ]              ║
║                              ║
║  ⚠ MEDIUM                    ║
║  Policy reject cluster       ║
║  8 offers at $3.80 floor     ║
║  → Review price floor         ║
║                              ║
║  ┌──────┬──────┬──────┬────┐ ║
║  │Today │Fleet │ Alts │More│ ║
║  └──────┴──────┴──────┴────┘ ║
╚══════════════════════════════╝
```

Alerts feed. Each is tappable for detail + a primary action. Swipe to dismiss.

### Screen 4 — More

Settings, sweep, logout, deep-link to desktop dashboard:

```
╔══════════════════════════════╗
║  More                        ║
║                              ║
║  💰 Sweep to treasury        ║
║                              ║
║  ⚙ Notification settings    ║
║  ⚙ Sync settings            ║
║  ⚙ Theme                    ║
║                              ║
║  🖥 Open desktop dashboard   ║
║  📤 Export this week          ║
║  ↪ Switch role               ║
║                              ║
║  Logout                      ║
║                              ║
║  Rova v1.5.2                 ║
║  ┌──────┬──────┬──────┬────┐ ║
║  │Today │Fleet │ Alts │More│ ║
║  └──────┴──────┴──────┴────┘ ║
╚══════════════════════════════╝
```

### Screen 5 — Robot detail (modal full-screen)

Tap a robot row → slide-up modal with the robot's stats and 4 actions:

```
╔══════════════════════════════╗
║  ← G1-ALPHA                  ║
║                              ║
║  ● ACTIVE                    ║
║                              ║
║  Battery       87% ⚡         ║
║  Last hb       3 s ago        ║
║  Reputation    4.92 / 5       ║
║  Wallet bal    $48.21         ║
║                              ║
║  Today         $48.21 (12)    ║
║  This week     $387.21 (88)   ║
║                              ║
║  ────────────────            ║
║  Quick actions               ║
║                              ║
║  [ Pause acceptance ]        ║
║  [ Cancel active job ]       ║
║  [ Sweep wallet ]            ║
║  [ Open in desktop → ]       ║
║                              ║
╚══════════════════════════════╝
```

Power features (edit policy, rotate key, adjust offerings) are explicitly NOT here — they link to desktop.

---

## Push notifications

Opt-in during PWA install. Two channels:

### Critical (always on if opted in)
- Robot offline > 5 min
- Dispute opened against your fleet
- Daily withdraw cap reached
- Hard error (paymaster bankrupt, etc.)

### Optional (toggleable)
- New high-bounty offer ($> 20)
- Day's net earnings summary (08:00 local)
- Weekly summary (Mondays)

Notifications deep-link into the relevant screen.

---

## Approve from a notification

For the time-critical "approve this offer" notification flow:

```
[Push notification on phone]
$12.40 CARRY offer · G1-BETA · expires in 4:31
[Approve]  [Decline]  [Open]
```

Tapping "Approve" or "Decline" directly from the notification:
- Triggers SDK call without launching the app
- Shows toast: "Approved · job assigned"
- 30% faster than opening the app

This requires WebAuthn / Passkey for the SIWE session — the approval is signed locally without re-opening a wallet UI.

---

## Edge cases

- **Bad network on phone** → cache last-known state, show with staleness indicator
- **Phone in airplane mode** → "Offline. Last data: 14:32." All buttons disabled.
- **Notification permission denied** → soft prompt every 7 days; respect deny
- **PWA install declined** → respect; still works as a regular mobile web page
- **Logout from phone** → keeps SIWE session valid; just clears local pref

---

## What's deliberately NOT on mobile

- Policy editor (full screen on phone is unusable for 10-primitive grid)
- Geofence editor (drawing on a 6" map is bad UX)
- Bulk approval (a desktop power-user feature)
- Per-job detail beyond the summary line
- Audit log (too much data)
- Charts drawer (charts are sub-readable at phone scale)

Mobile is triage. Editing is desktop. The two complement each other; they don't compete.

---

## Telemetry

```
mobile.viewed                  (screen)
mobile.notification.received   (type)
mobile.notification.tapped     (type, action)
mobile.approval.from_push      (offerId)
mobile.robot.opened            (robotId)
mobile.action.taken            (robotId, action)
mobile.sweep.initiated         (from: more | robot_detail)
```

---

## Related

- `DASHBOARD.md` — the full desktop surface this trims down from
- `JOB-APPROVAL.md` — approval logic shared with mobile push
- `FLEET-OPS.md` — robot-level actions that the phone surfaces a subset of
- `IA.md` § Marketing → simple top nav — mobile reuses this pattern
- `ERRORS.md` § U-01 — stale-tab handling for backgrounded apps

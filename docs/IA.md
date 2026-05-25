# IA

> URL map, navigation rules, three-actor surface scoping. The structural answer to "where does each thing live."

---

## Frame

Rova has three distinct surfaces with different audiences and different navigation patterns:

1. **Marketing site** (`/`, `/about`, `/apply`) — visitor, marketing-grade IA, single nav bar, conversion focus.
2. **Operator product** (`/dashboard`, `/fleet`, `/policies`, etc.) — authenticated Operator, app-grade IA, persistent sidebar, density focus.
3. **Public surfaces** (`/job/[id]`, `/robot/[id]`, `/simulator`) — anyone, shareable links, no auth, lightweight chrome.

Each surface has its own nav. They share the brand chrome (logo, footer) but not the navigation. Don't try to unify them.

---

## URL inventory

### Marketing
```
/                       Home (hero, how-it-works, contracts, partners, CTA)
/about                  Why robots earn (origin, team, why now)
/apply                  Pilot application form
/manifesto              (v1.5) Why the substrate matters — opinion piece
```

### Operator product (auth required; "operator" cookie or wallet)
```
/dashboard              Today — incoming offers, alerts, settlements, fleet at-a-glance
/dashboard/fleet        Fleet view — every robot, status, earnings
/dashboard/jobs         Jobs ledger — every job past or active, filterable
/dashboard/jobs/[id]    Job detail — proof receipt, dispute controls, override
/dashboard/policies     Policy library + editor
/dashboard/policies/[id]   Edit one policy
/dashboard/earnings     Settlements + payouts + treasury sweep
/dashboard/emergency    Emergency pause + fleet kill switch
/dashboard/settings     Account, wallet, team, billing (v1.5)
```

### Agent product (mostly SDK; minimal UI in v1)
```
/agent                  Agent console — wallet, active jobs, history
/agent/post             Post a job (manual)
/agent/registry         Browse robot offerings
/agent/wallet           Agent wallet detail
```

### Robot product (mostly SDK; minimal UI in v1)
```
/robot                  Robot detail (for the SDK-installed robot's local view)
/robot/capabilities     Capability manifest
/robot/proof            Submit-proof debugger
/robot/earnings         Robot earnings history
```

### Public (shareable)
```
/job/[id]               Public job receipt — anyone can open by id
/robot/[id]             Public robot card — reputation, history, stake
/operator/[id]          Public operator profile (v1.5)
/agent/[address]        Public agent profile by wallet (v1.5)
/simulator              In-browser warehouse demo — visitor onboarding
```

### Developer
```
/docs                   SDK docs landing
/docs/sdk-agent         ACP SDK quickstart
/docs/sdk-robot         ROS2 SDK quickstart
/docs/contracts         Contract reference
/docs/spec              Spec canon — links to docs/* in repo
```

### Onboarding
```
/onboard                Two-door entry — Operator vs Agent
/onboard/operator       Operator onboarding flow (4 steps)
/onboard/agent          Agent onboarding flow (3 steps)
```

---

## Navigation rules

### Rule 1 — Persistent left sidebar in the Operator product

Every URL under `/dashboard/*` shows the persistent left sidebar with:

```
─ Today          (/dashboard)
─ Fleet          (/dashboard/fleet)
─ Jobs           (/dashboard/jobs)
─ Policies       (/dashboard/policies)
─ Earnings       (/dashboard/earnings)
─ Emergency      (/dashboard/emergency)

─ Help
─ Account
```

The sidebar collapses on screens < 1024 px to icons only. It does not collapse below the breakpoint to a hamburger — the Operator surface is not designed for phones (the mobile companion is `MOBILE.md`).

### Rule 2 — Top nav on marketing surfaces

The marketing nav is one row:

```
[ROVA logo]                    Protocol · About · Docs              Apply →
```

Three middle links. One CTA. No dropdowns. No mega-menu.

### Rule 3 — Three-actor switcher

The `AccountSwitcher` (in `src/components/AccountSwitcher.tsx`) appears in the dashboard top bar and lets the user pivot between roles they hold:

```
[avatar] Agent ▾    →    Agent / Robot / Operator
```

A single user (wallet) may hold all three roles. The switcher persists role in local storage and re-routes:
- Switching to **Operator** → `/dashboard`
- Switching to **Agent** → `/agent`
- Switching to **Robot** → `/robot`

If the user has only one role, the switcher is hidden.

### Rule 4 — Public surfaces never link into the product

A `/job/[id]` page (shareable) shows a back-to-home link, not a back-to-dashboard. Anyone landing on a public surface from a shared link should not be forced into the auth funnel — they should be able to read the receipt and leave.

### Rule 5 — One CTA per page

Every page has a single primary CTA in amber. If a page seems to need two, one of them is wrong. Multi-action toolbars on dashboard surfaces are not CTAs — they're affordances inside an existing action context.

---

## Three-actor surface scoping

Some URLs are scoped per actor — a single URL pattern serves different content depending on role. The pattern:

| URL                  | Operator sees                                                    | Agent sees                            | Robot sees                              |
| -------------------- | ---------------------------------------------------------------- | ------------------------------------- | --------------------------------------- |
| `/dashboard`         | Operator's Today                                                 | (redirect to `/agent`)                | (redirect to `/robot`)                  |
| `/agent`             | (redirect to `/dashboard`)                                       | Agent console                         | (redirect to `/robot`)                  |
| `/robot`             | (redirect to `/dashboard`)                                       | (redirect to `/agent`)                | Robot local view                        |
| `/job/[id]`          | Triage controls (if this Operator owns the assigned robot)       | Monitor + dispute controls (if client) | Read-only proof + payout                |

Server-side: middleware reads the active role cookie and redirects on mismatch. Client-side: the AccountSwitcher writes the cookie + navigates.

---

## Breadcrumbs

Inside `/dashboard/*` only:

```
Dashboard · Fleet · G1-ALPHA
```

Each segment is a link. The last segment is plain text (current page). Breadcrumbs live in the top bar inside the sidebar layout.

Marketing surfaces have no breadcrumbs.
Public surfaces (`/job/[id]`) have no breadcrumbs.
SDK docs use a left sidebar instead of breadcrumbs.

---

## Deep-link patterns

### Deep-linkable parameters

Some URL parameters are deep-linkable — sharing the URL preserves state:

```
/dashboard/jobs?status=failed&taskType=CARRY     → filtered jobs view
/dashboard/fleet?robot=G1-ALPHA                  → fleet view focused on one robot
/dashboard/policies/op-cautious-warehouse         → directly opens a named policy
/job/[id]?tab=proof                              → job page opens on proof tab
```

### Non-deep-linkable

Some state is local and not in URL:
- Right-edge inspector panel state
- Modal open/close
- Toast notifications
- Sort order in tables (persists per-user in local storage, not URL)

### Anchor links

Use anchor links sparingly. Marketing pages have a few:

```
/#protocol
/#receipts
/#partners
```

Each section that's anchor-linked has a `scroll-mt-24` modifier so the section header isn't hidden under the sticky nav.

---

## Page chrome by surface

| Surface    | Top                                | Side          | Bottom        |
| ---------- | ---------------------------------- | ------------- | ------------- |
| Marketing  | One-row marketing nav              | —             | Footer        |
| Operator   | Breadcrumb + AccountSwitcher + ⌘K  | Persistent    | —             |
| Agent      | Same as Operator chrome            | Persistent (different items) | — |
| Robot      | Same as Operator chrome            | Persistent (different items) | — |
| Public     | Logo + back-to-home only           | —             | Compact footer |
| Onboard    | Just logo + progress dots          | —             | —             |
| Simulator  | Custom (Connection bar + controls) | —             | —             |

The Operator/Agent/Robot top bars share the same component but different sidebar items. Implementations live in `src/components/shell/AppShell.tsx`.

---

## Routing technology

Next.js App Router. File system:

```
src/app/
├── layout.tsx                       Root layout — fonts, CmdK, dark token base
├── page.tsx                         Marketing home
├── about/page.tsx
├── apply/page.tsx
├── onboard/page.tsx                 Two-door entry
├── onboard/operator/page.tsx
├── onboard/agent/page.tsx
├── dashboard/
│   ├── layout.tsx                   Sidebar layout
│   ├── page.tsx                     Today
│   ├── fleet/page.tsx
│   ├── jobs/page.tsx
│   ├── jobs/[id]/page.tsx
│   ├── policies/page.tsx
│   ├── policies/[id]/page.tsx
│   ├── earnings/page.tsx
│   └── emergency/page.tsx
├── agent/
│   ├── page.tsx
│   ├── post/page.tsx
│   ├── registry/page.tsx
│   └── wallet/page.tsx
├── robot/
│   ├── page.tsx
│   ├── capabilities/page.tsx
│   ├── proof/page.tsx
│   └── earnings/page.tsx
├── job/[id]/page.tsx                Public receipt
├── operator/[id]/page.tsx           (v1.5)
├── agent/[address]/page.tsx         (v1.5)
├── simulator/page.tsx
├── docs/
│   ├── page.tsx
│   ├── sdk-agent/page.tsx
│   ├── sdk-robot/page.tsx
│   ├── contracts/page.tsx
│   └── spec/page.tsx
└── api/
    ├── indexer/[event]/route.ts     SSE event stream
    └── webhook/[provider]/route.ts  Inbound webhooks
```

---

## Out-of-scope routes

The following are intentionally NOT part of v1:
- `/onboard/robot` — robots don't self-onboard; their Operator owner does it from `/dashboard`
- `/marketplace` — the public registry doesn't have its own page; it's exposed only through the agent SDK
- `/admin` — admin tooling is internal and lives outside the product surface (separate repo)
- `/blog` — content marketing lives on a separate subdomain

---

## Related

- `DESIGN-SYSTEM.md` — what each page chrome looks like
- `ONBOARDING.md` — flow walked by `/onboard/operator`
- `STATE-MACHINE.md` — what a `/job/[id]` page is rendering
- `AUTH.md` — how the role-cookie middleware works
- `MARKETING.md` — copy and structure of the marketing surfaces

# COPY/MICROCOPY

> Every button label, error message, empty state, tooltip. Single source of truth for product copy.

---

## Tone reminder

From `DESIGN-SYSTEM.md` § Tone: write like the protocol, not like a startup. Specific, declarative, low-adjective.

Three rules:

1. **Name the action.** "Sweep to treasury" not "Manage funds."
2. **Tell the user what just happened.** "Policy saved. Robots sync in ~10s." not "Success!"
3. **Don't apologize for the system.** "Network busy — retrying" not "Oops! Something went wrong :("

---

## Buttons (verb-first, specific)

| Surface                           | Label                       | Notes                              |
| --------------------------------- | --------------------------- | ---------------------------------- |
| Onboarding step 1                 | `Connect wallet`            | Standard                           |
| Onboarding step 2                 | `Register robot`            | Specific verb                      |
| Onboarding step 3                 | `Save & continue`           | Two-action button                  |
| Onboarding step 4                 | `Publish offerings →`       | Arrow shows progression             |
| Policy editor                     | `Save`                      | Default                            |
| Policy editor (deploy)            | `Save & deploy`             | Two-action variant                  |
| Job approval card                 | `Approve` / `Decline`       | Single verb                         |
| Fleet view                        | `Pause` / `Resume`          | State-toggle                        |
| Fleet view (single robot)         | `Open detail →`             | Navigation                          |
| Earnings tile                     | `Sweep to treasury`         | Specific noun                       |
| Emergency screen                  | `PAUSE EVERY ROBOT`         | Uppercase for emphasis              |
| Emergency screen (destructive)    | `HARD STOP EVERYTHING`      | Even more emphatic                  |
| Dispute (operator side)           | `Publish pre-image`         | Specific technical term             |
| Dispute (operator side)           | `Concede dispute`           | Honest verb                         |
| Wallet disconnect                 | `Disconnect`                | Don't say "Sign out"                |
| CSV export                        | `Export this week`          | Specific scope                      |

**Avoid:**
- `Submit`, `OK`, `Done` — meaningless verbs
- `Save changes` — what changes? Be specific
- `Continue` alone — what are we continuing toward?

---

## Headlines (capitalized, no period)

| Where                         | Headline                                          |
| ----------------------------- | ------------------------------------------------- |
| Landing hero                  | `The settlement layer. For robots that earn.`     |
| About hero                    | `Why robots earn through coordination, not contracts` |
| Onboarding intro              | `Add your first robot to the registry`             |
| Dashboard greeting            | `Today` (just the word)                            |
| Empty earnings state          | `No settlements in this range`                     |
| Empty fleet state              | `Add your first robot to begin`                    |
| Empty alerts                   | `All clear — no alerts`                            |
| Dispute open (operator side)  | `Aboki-Restock-Bot disputed this job`              |
| Job receipt verified          | `Proof verified · settled`                         |
| Job receipt rejected          | `Proof rejected · refunded`                        |

**Avoid:**
- `Welcome!` — generic
- `Great job!` — patronizing
- "Awesome", "Hooray", "🎉" — leave the emotional acting to the user

---

## Helpers + descriptions

| Field / context                  | Helper text                                                          |
| -------------------------------- | -------------------------------------------------------------------- |
| Robot name field                 | `Use any name. We default to G1-ALPHA, G1-BETA, etc.`                |
| Stake amount field               | `100 ROVA minimum. Slashed on failed jobs.`                          |
| Geofence editor                  | `Draw a rectangle around where your robot operates.`                 |
| Time windows                     | `When your robot is allowed to accept new offers.`                   |
| Auto-accept toggle               | `Accept offers automatically (turn off for manual review).`          |
| Price floor slider               | `Reject offers below this price.`                                    |
| Daily withdraw cap               | `Defense in depth. Limits how much can leave a robot wallet per day.`|
| Dispute bond                     | `Refunded if you win. Burned if you lose. Anti-griefing.`             |
| Force-fail past deadline         | `Anyone can call this once a job is past its SLA.`                    |

**Rules:**
- Single sentence. Period at end.
- No exclamation marks.
- No "Don't worry, we..." (treats user as anxious; condescending)

---

## Errors (typed, specific, with recovery)

For each error code, the user-facing copy. Stored in `src/lib/errorMessages.ts`.

| Code   | Title                                | Body                                                                            | CTA                                  |
| ------ | ------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------ |
| W-01   | Wallet not connected                  | Connect your wallet to continue.                                                | `Connect wallet`                     |
| W-02   | Wrong network                         | Switch to Base Sepolia.                                                         | `Switch network`                     |
| W-03   | Signature cancelled                   | Sign-in cancelled. Try again to continue.                                       | `Try again`                          |
| W-04   | Need ETH for gas                      | Top up your wallet — ~0.001 ETH needed.                                         | `Get testnet ETH ↗`                  |
| W-05   | Not enough USDC                       | Your wallet has {haveUsdc} USDC. This job needs {needUsdc}.                     | `Add funds`                          |
| C-02   | Job already claimed                   | That job was just claimed. Pick another.                                        | (none — auto-refresh)                |
| C-03   | Robot offline                         | That robot went offline. Showing fresh offerings.                               | (none)                               |
| C-04   | Price changed                         | Robot raised its price from {old} to {new}. Re-evaluating.                      | (none)                               |
| C-05   | Robot deactivated                     | That robot just deactivated. Showing fresh offerings.                           | (none)                               |
| C-06   | Proof not yet                         | Proof hasn't landed. We'll settle automatically when it does.                   | (none)                               |
| P-01   | Proof rejected (GPS)                  | Robot wasn't at destination ({deltaMeters} m off). Bounty refunded, stake slashed. | `View proof`                         |
| P-02   | Proof rejected (SLA)                  | Robot finished late ({actual} vs {deadline}). Bounty refunded, stake slashed.    | `View proof`                         |
| J-01   | Robot offline                         | {robotName} heartbeat lost ({secondsAgo}s ago). Recovering.                      | `Check robot`                        |
| S-01   | Settlement pending                     | Proof verified — click to release escrow.                                       | `Settle now`                         |
| S-03   | Bundler issue                         | Settlement queued — paymaster issue. Falling back.                              | (none)                               |
| I-01   | Live data delayed                     | Showing data through {timestamp}. Refresh to update.                            | `Refresh`                            |
| Po-02  | Policy invalid                        | `priceFloors.{taskType}` must be a number ≥ 0.                                   | (inline)                             |
| D-01   | Dispute window closed                 | This job settled {hoursAgo}h ago. Disputes must open within 24h.                | `Contact support ↗`                  |

**Patterns:**
- Title: ≤ 5 words
- Body: 1 sentence; ≤ 14 words ideally
- Numbers in mono; variable placeholders shown in `{braces}` in the source

---

## Empty states

| Surface                    | Headline                              | Body                                                                       |
| -------------------------- | ------------------------------------- | -------------------------------------------------------------------------- |
| Dashboard, day 1           | `Your robot is live`                  | Once an agent posts a job, we'll show it here.                              |
| Fleet view, no robots      | `Add your first robot`                | The fleet view shows robots you've registered. Click below to start.        |
| Earnings, empty range      | `No settlements in this range`        | Adjust the date filter or wait for jobs to settle.                          |
| Alerts, all clear          | `All clear`                           | No alerts in the last 24h. Pulled fresh just now.                           |
| Policies, none             | `No policies yet`                     | Policies control which offers your robots accept. Create one to begin.      |
| Disputes, none open        | `No open disputes`                    | Disputes appear here when agents challenge a verified proof.                |

Empty states are friendly, not apologetic. They invite the next action.

---

## Confirmations + destructive actions

When the user is about to do something hard-to-reverse:

```
Withdraw stake & deactivate G1-ALPHA?

This removes G1-ALPHA from the registry. Stake (100 ROVA) returns to your wallet.
This is final — you can re-register later but reputation history doesn't transfer.

Type G1-ALPHA to confirm:
[                              ]

[ Cancel ]   [ Withdraw & deactivate ]
```

Patterns:
- State exactly what happens
- Type-the-name confirmation for fleet-affecting actions
- Two buttons: Cancel (neutral) + destructive (alert color)
- No countdown auto-confirmations

---

## Toast messages

Short. Specific. Auto-dismiss after 5s.

| Trigger                                | Toast                                            |
| -------------------------------------- | ------------------------------------------------ |
| Policy saved                            | `Policy saved.`                                  |
| Policy saved & deployed                 | `Policy deployed. Robots sync in ~10s.`          |
| Robot paused                            | `{robotName} paused.`                             |
| Robot resumed                           | `{robotName} resumed.`                            |
| Offer approved                          | `Approved · job assigned.`                        |
| Offer declined                          | `Declined.`                                       |
| Sweep complete                          | `Swept ${amount} to treasury.`                    |
| Session key rotated                     | `New session key live.`                           |
| CSV exported                            | `CSV ready. Downloading…`                         |
| Settings saved                          | `Settings saved.`                                 |
| Copy success                            | `Copied.`                                         |

---

## Loading states

| Action                            | Label                                  |
| --------------------------------- | -------------------------------------- |
| Signing a tx                       | `Signing in your wallet…`              |
| Waiting for tx                     | `Confirming on Base…`                  |
| Indexer query                      | (no label — content skeletons cover)   |
| Policy push                        | `Syncing to {robotName}…`              |
| Sweep                              | `Sweeping {robotCount} wallets…`       |
| CSV export                         | `Building export…`                     |

Never `Loading…` alone. Always say what's loading.

---

## Tooltips

Tooltips supplement; they don't carry essential info. Patterns:

- Definition of a term: `INDOOR_NAV  →  Robot can navigate inside buildings`
- Disambiguation: `bps  →  basis points (1 bps = 0.01%)`
- Keyboard hint: `Pause  →  Spacebar`
- Source of value: `4.92  →  reputation, scaled 0–5 (raw on-chain: 4920/5000)`

Don't tooltip:
- Things obvious from the label
- Critical info ("only present in tooltip" = unreachable for mobile)
- Long explanations (use inline help instead)

---

## Numbers + currencies

- USDC: `$4.786` (3 decimals max in display; 6 internally)
- ROVA: `100 ROVA` (no decimals in display; 18 internally)
- GPS: `52.4137°, −1.5108°` (4 decimals; "−" not "-")
- Time relative: `2 min ago`, `1h 32m ago`, `Yesterday at 18:42`
- Time absolute: `2026-05-25T14:32:18Z` (ISO 8601 in receipts; localized in dashboards)
- Percentages: `4.6%` (one decimal)
- Distances: `12 m`, `1.4 km`, `0.4 km` (1 decimal for km, 0 for m)

---

## Voice notes

- Refer to the user as "you" not "the operator"
- Don't use "we" excessively (drains agency)
- Don't refer to features as "magical" or "intelligent"
- The robot is "it"; named robots get their actual name + "it" pronoun
- The agent is "it" if unnamed, with name preferred when known
- "Robot" not "bot" in product UI (bot has crypto-vibe baggage)

---

## What to NEVER write

- `Don't worry`
- `Easy as 1-2-3`
- `Welcome to the future`
- `Revolutionary`
- `Powered by blockchain` (the user knows)
- `🚀`, `🔥`, `💎` in product UI
- `Click here` (link should be the noun)
- `Read more →` (be specific: "Read about disputes →")
- `Submit` as a button (always know what you're submitting)

---

## Translation readiness

All copy in `src/lib/errorMessages.ts` and `src/lib/copy.ts` is keyed for i18next-style lookup. v1 ships English-only. v1.5 adds:
- French (operator candidates in West Africa)
- Spanish (Latin American operators)
- Mandarin (Asian agent builders)

No copy is hardcoded in JSX. Everything goes through the lookup.

---

## Related

- `DESIGN-SYSTEM.md` § Tone — the underlying voice rules
- `ERRORS.md` — the error catalog this copy serves
- `COPY/LANDING.md` — landing page specific copy
- `COPY/EMAIL-RECEIPT.md` (v1.5) — email-specific tone

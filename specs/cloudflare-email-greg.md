# EXECUTE — email in and out on `greg@<your-domain>` via Cloudflare Email Service

**Authored 2026-08-06. Executor: Code (Robot Wrench), in a session on Gregory's own machine.
DRAFT until Gregory merges this spec.**

## Mission (one line)

Mail sent to `greg@<your-domain>` arrives in Gregory's Gmail, and he can reply *as*
`greg@<your-domain>` so recipients never see the Gmail address — with the configuration
recorded as scripts and a runbook, not clicked once and forgotten.

## Why now

The consulting business has a website ([`mazzag-website`](https://github.com/gcmazza/mazzag-website),
journal #8) but no business email address. A CFO-for-hire sending from a personal Gmail is a
credibility leak on the first contact. This closes that, and does it in a form that survives:
if the domain changes or the config drifts, it is a re-run, not an archaeology project.

## The one thing to understand before starting

This is **two separate Cloudflare products**, separately configured, separately priced, with
DNS records in different places. Doing one does nothing for the other.

| | Email Routing | Email Sending |
|---|---|---|
| Direction | Inbound (receiving) | Outbound (sending) |
| Price | Free | **Workers Paid, $5/mo** |
| Status | Generally available | **Beta** |
| DNS | MX + SPF + DKIM on the **root domain**, selector `cf2024-1._domainkey` | MX + SPF + DKIM on **`cf-bounce.<domain>`**, selector `cf-bounce._domainkey`, plus **DMARC on `_dmarc`** |

Receiving working and sending not working is a **normal, valid end state** — it is exactly what
the free plan gives. Do not treat it as a failure.

## Gates and fences

- **Run this from a Local session, not the cloud.** It needs Gregory's Cloudflare token, his
  Gmail settings page, and his inbox. A cloud Code session has none of those.
- **Never commit a token.** Not in a script, not in a committed `.env`, not in the PR body, not
  in a comment. `.gitignore` already covers `.env`; the guardrails CI fails the build if a
  credential-shaped string appears. Export tokens in the shell for the run only.
- **Never enable a paid plan on Gregory's behalf.** If the account is not on Workers Paid, stop
  the sending half and report it as a decision for him. The script already exits `2` for this.
- **Do not hardcode the domain.** Both scripts resolve it from the zone at runtime. The domain
  `mazzagconsulting.com` appearing in the website repo's meta tags is an **unconfirmed
  placeholder** (journal #8), not a verified purchase — confirm the real zone with Gregory.
- **Do not modify** `journal.md` history, `FACTORY.md`'s roster block, or anything under
  `hosting/` or `guides/` (template-managed paths; a factory update would overwrite you).

## What already exists (merged with this spec — do not rewrite it)

| File | What it is |
|---|---|
| `scripts/setup-email-routing.mjs` | Part 1. Enables routing, adds the destination, creates the rule, enables catch-all. Idempotent. Stops cleanly when the destination is unverified. |
| `scripts/setup-email-sending.mjs` | Part 2. Plan gate, then onboards the domain under Email Sending, reports the `cf-bounce` + `_dmarc` DNS state, prints the Gmail settings. |
| `runbooks/cloudflare-email.md` | The runbook: token permissions, both manual steps, the Gmail settings verbatim, security, troubleshooting. |
| `.gitignore` | Covers `.env`. |

Endpoint shapes in both scripts were taken from Cloudflare's own published API schema
(`cloudflare/api-schemas`, `openapi.json`) and the `cloudflare` npm SDK v7 — **not guessed**.
Both scripts were exercised against a local mock of those endpoints before being handed over
(see the PR that introduced them). What has **not** happened is a run against a real Cloudflare
account — that is this task.

## The work

1. **Confirm the domain with Gregory.** Which zone is this actually for? Get the **Zone ID**
   from the Cloudflare dashboard → domain → Overview → API box.

2. **Have Gregory mint a narrow API token** (dashboard → My Profile → API Tokens → Create Token
   → Custom token), scoped to this one zone and account:
   - `Zone → Email Routing → Edit`
   - `Zone → Zone → Read`
   - `Account → Email Routing Addresses → Edit`
   - `Email Sending → Edit` (only if doing Part 2)

   If he reuses an existing broader token, note that in the PR as something to narrow later.

3. **Part 1 — receiving.**
   ```sh
   export CLOUDFLARE_API_TOKEN=...        # shell only, never committed
   export CLOUDFLARE_ZONE_ID=...
   export EMAIL_DESTINATION=<his-gmail>
   node scripts/setup-email-routing.mjs --dry-run
   node scripts/setup-email-routing.mjs
   ```
   The script **will stop** and tell him to click *"Verify email address"* in the mail Cloudflare
   sends to his Gmail. That click cannot be automated and every rule stays disabled until it
   happens. After he clicks, re-run — it picks up where it left off.

4. **Part 2 — sending.**
   ```sh
   node scripts/setup-email-sending.mjs --dry-run
   node scripts/setup-email-sending.mjs
   node scripts/setup-email-sending.mjs --fix-dns   # only if DNS status is not "ready"
   ```
   **If it exits `2`, stop here.** Report the sending half as blocked on a $5/mo decision that
   is Gregory's to make, finish everything else, and say so plainly in the PR.

5. **Configure Gmail** — Settings → Accounts and Import → Send mail as → Add another email
   address. The settings are in `runbooks/cloudflare-email.md` verbatim. The two people
   always get wrong: **Username is the literal string `api_token`** (the token goes in the
   *password* field), and it is **port 465 / SSL** only.

   Gmail emails a confirmation code to `greg@<domain>`. Because Part 1 already forwards that
   address to the same inbox, the code lands where he is already sitting. No extra step.

6. **Update the runbook** with anything reality contradicted, and **write the journal entry**
   (newest first, format in `templates/JOURNAL-ENTRY.md`).

## Verification (the done-gates)

A `200` from the API is not mail arriving, and a saved Gmail setting is not a delivered message.
Observe these, do not assume them (RULE 1), and paste what you actually saw into the PR:

- [ ] **Receiving.** A test message sent to `greg@<domain>` **from an account that is not the
      destination Gmail** arrives in that Gmail. Testing from the destination account is invalid —
      providers drop mail that appears to come from the inbox it is delivered to. **Check spam.**
- [ ] **Sending.** A message sent from Gmail **as** `greg@<domain>` to an outside address arrives,
      and the recipient sees **the custom domain** in the From line, not the Gmail address.
- [ ] Re-running `setup-email-routing.mjs` a second time reports only `skip` lines and writes
      nothing (proves the idempotency holds against the real API, not just the mock).
- [ ] `git grep` finds no token value anywhere in the diff; the guardrails CI is green.

## Out of scope (each with an owner and a when — RULE 20)

- **Narrowing an over-broad Cloudflare token** — owner: Gregory, when: at the next token rotation,
  or immediately if the token used here also carries DNS/Workers write.
- **Deciding on Workers Paid** — owner: Gregory, when: whenever he wants to send as the domain;
  receiving is unaffected either way.
- **Additional addresses** (`hello@`, `billing@`) — owner: Code, when: Gregory asks. The catch-all
  already delivers them; a named rule is a one-line change to the script's `EMAIL_LOCAL_PART`.
- **Email for the website's contact form** — owner: Cowork, when: the `first-website` mission
  reaches a contact form. Different problem (transactional send from a Worker), same account.

## PR description template

**WHAT** — which halves ran, what the scripts wrote, the actual DNS records created on the root
domain and on `cf-bounce`, and the exact state of both manual steps.
**WHY** — this spec, plus anything reality forced you to change.
**ONE THING TO LEARN** — one sentence Gregory keeps after the diff is forgotten.
**VERIFIED BY** — the two live mail tests, quoted: what you sent, from where, what arrived, what
the From line said. If a test did not happen, say which one and why — a skipped check named is
fine, a skipped check implied is not.

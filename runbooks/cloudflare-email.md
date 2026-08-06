# Runbook — email in and out on `greg@<your-domain>` via Cloudflare

**What this gets you:** mail sent to `greg@<your-domain>` lands in your normal
Gmail inbox, and you can reply *from* `greg@<your-domain>` so the other person
never sees the Gmail address.

**Why a runbook and not just a click-through:** the dashboard forgets why you
did something. This file plus the two scripts are the record. If the config ever
drifts, gets deleted, or has to be rebuilt on a new domain, you re-run the
scripts instead of trying to remember twenty checkboxes.

---

## The one thing to understand first

This is **two separate Cloudflare products**. They are configured separately,
priced separately, and they put DNS records in different places. Setting up one
does nothing for the other.

| | **Email Routing** | **Email Sending** |
|---|---|---|
| Direction | Inbound — receiving | Outbound — sending |
| Price | Free | Requires **Workers Paid** ($5/mo) |
| Status | Generally available | **Beta** |
| DNS it adds | MX + SPF + DKIM on the **root domain** (`<your-domain>`), DKIM selector `cf2024-1._domainkey` | MX + SPF + DKIM on the **`cf-bounce` subdomain** (`cf-bounce.<your-domain>`), DKIM selector `cf-bounce._domainkey`, plus **DMARC** on `_dmarc.<your-domain>` |
| Script | `scripts/setup-email-routing.mjs` | `scripts/setup-email-sending.mjs` |

You can have receiving working perfectly and sending not working at all. That is
a normal, valid state — it is exactly what you get on the free plan.

---

## Before you start

You need two values from the Cloudflare dashboard, and one API token.

**Zone ID** — Cloudflare dashboard → your domain → **Overview** → the **API**
box on the right → **Zone ID**. Copy it.

**API token** — Cloudflare dashboard → **My Profile** → **API Tokens** →
**Create Token** → **Custom token**. The permissions differ per half:

| For | Permission |
|---|---|
| Receiving (Routing) | **Zone → Email Routing → Edit** |
| Receiving (Routing) | **Zone → Zone → Read** — so the script can read your domain name instead of having it hardcoded |
| Receiving (Routing) | **Account → Email Routing Addresses → Edit** — destination addresses live at the account level, not the zone |
| Sending | **Email Sending → Edit** |

Scope it to **this one zone** and **this one account** under Zone Resources /
Account Resources.

> **If you already have a broader Cloudflare token, note it as something to
> narrow later.** A token with wider permissions than the two lines above will
> work — but it is a bigger blast radius than this job needs, and the SMTP
> password below is a *long-lived* credential that sits in Gmail's settings.
> Prefer minting a fresh narrow token for this. If you reuse a broad one,
> write yourself a reminder to replace it.

**Never commit either token.** Not in a script, not in a `.env` you `git add`,
not in a PR body, not in a comment. `.gitignore` in this repo covers `.env`, and
the guardrails CI will fail the build if a credential-shaped string appears in a
commit. Export the token in your shell for the run and let it disappear when the
shell closes:

```sh
export CLOUDFLARE_API_TOKEN=...        # paste the token here, in your terminal only
export CLOUDFLARE_ZONE_ID=...
export EMAIL_DESTINATION=you@gmail.com # the Gmail inbox that receives the mail
```

---

## Part 1 · Receiving — `greg@<your-domain>` arrives in Gmail

```sh
node scripts/setup-email-routing.mjs --dry-run   # look first, writes nothing
node scripts/setup-email-routing.mjs
```

The script does five things, and **reads current state before each one**, so
running it twice is safe:

1. Resolves the zone → your domain name and account id (nothing hardcoded).
2. Enables Email Routing, which creates the MX + SPF + DKIM records on the root domain.
3. Adds your Gmail address as a **destination address**.
4. Creates the rule `greg@<your-domain>` → forward to your Gmail.
5. Enables the **catch-all** to the same Gmail, so typos (`gerg@…`) still arrive.

> **Why idempotency matters here specifically:** if two routing rules share the
> same email pattern, Cloudflare only honours the first one. A script that
> re-created its rule on every run would quietly produce a second, ignored rule
> and the mailbox would look broken for no visible reason. This script updates
> the existing rule in place instead.

### The manual step you cannot skip

Cloudflare emails your Gmail address a verification link. **Until someone
clicks it, every routing rule stays disabled** — that is Cloudflare's
anti-spam behaviour, not a bug.

The script detects this and stops cleanly, telling you:

> Check `you@gmail.com`, open the mail from Cloudflare, click
> **"Verify email address"**, then re-run this script.

Click it, then run the script again. It will pick up where it left off.

### Verify receiving — for real

A `200` from the API is not mail arriving. Test it:

1. Send a message to `greg@<your-domain>` **from an account that is not your
   destination Gmail**. This matters: providers routinely drop mail that appears
   to come from the same inbox it is being delivered to, so testing from the
   destination account can look like a failure when nothing is wrong.
2. Confirm it arrives in the Gmail inbox.
3. **Check spam** if it does not appear within a minute or two.

---

## Part 2 · Sending — replying *as* `greg@<your-domain>`

### The plan gate, first

```sh
node scripts/setup-email-sending.mjs --dry-run
```

If the account is not on **Workers Paid**, the script stops with exit code `2`
and says so plainly. It does **not** enable a plan, upgrade, or purchase
anything — that is a spending decision for the account owner, not for a script.

If that is where you land: receiving still works, and the sending half is simply
**blocked on a $5/mo decision**. Nothing is broken.

### Onboarding the domain

```sh
node scripts/setup-email-sending.mjs
node scripts/setup-email-sending.mjs --fix-dns   # if DNS is not yet "ready"
```

This is a **separate onboarding from Routing** — being set up for receiving does
not onboard you for sending. It registers the domain under Email Sending, which
manages the `cf-bounce` records and DMARC. The script prints the aggregate DNS
status (`ready` / `unconfigured` / `unlocked` / `misconfigured`) and every
record it manages. Allow 5–15 minutes for DNS propagation before re-checking.

### Gmail settings — verbatim, keep these

Gmail → **Settings** → **Accounts and Import** → **Send mail as** →
**Add another email address**

| Field | Value |
|---|---|
| Name | Greg Mazza |
| Email address | `greg@<your-domain>` |
| Treat as an alias | **Uncheck** — if you want replies to thread properly |
| SMTP Server | `smtp.mx.cloudflare.net` |
| Port | `465` |
| Security | **SSL** (implicit TLS) |
| Username | `api_token` — **the literal string**, not your token |
| Password | your Cloudflare API token with **Email Sending → Edit** |

Two details people get wrong:

- **Username is the literal text `api_token`.** It is not your token, not your
  email address, not your account id. The token goes in the *password* field.
- **Port 465 with SSL only.** Cloudflare does not offer STARTTLS on 587 or
  unauthenticated relay on 25 for outbound. Port 25 is inbound-only.

### The second manual step

Gmail sends a **confirmation code** to `greg@<your-domain>` to prove you own it.
Because Part 1 already forwards that address to the same Gmail inbox, **the code
arrives in the inbox you are already sitting in.** No extra mailbox, no extra
step. Paste it back into Gmail.

### Verify sending — for real

A saved Gmail setting is not a delivered message. Test it:

1. Compose from Gmail, and in the **From** field pick `greg@<your-domain>`.
2. Send it to an address **outside** your Gmail — a friend, a second personal
   account, anything you can read.
3. Confirm the recipient sees **the custom domain** in the From line, not the
   Gmail address.

---

## Security — the part worth re-reading

**The SMTP password is a real credential, and it is long-lived.** Anyone holding
that token can send mail as **any** domain onboarded for Email Sending on that
Cloudflare account — not just this one. Mail sent with it is DKIM-signed and
will look completely legitimate to recipients. Treat it exactly like a password:

- It lives in Gmail's settings and in your terminal environment. Nowhere else.
- Never in this repo, never in a PR, never pasted into a chat.
- If you ever think it leaked, **rotate it in Cloudflare first**, then update
  Gmail. Committed once is leaked, even after deletion.

**Token scope.** Routing needs `Zone → Email Routing → Edit`. Sending needs
`Email Sending → Edit`. If the token you used is broader than that, it still
works — but note it as something to narrow later, and prefer a fresh narrow
token for the SMTP password specifically, since that one sits in a third party's
settings page indefinitely.

---

## Troubleshooting

| Symptom | Almost always |
|---|---|
| Mail to `greg@<your-domain>` never arrives | Destination address not verified — every rule stays disabled until the link is clicked. Re-run the routing script; it will tell you. |
| Test mail vanished, sent from the destination Gmail | Expected. Providers drop mail that looks like it came from the inbox it is delivered to. Test from a different account. |
| Arrives, but in spam | Check that SPF/DKIM landed on the root domain — the routing script prints the records it manages. |
| A rule exists but does nothing | Two rules share an email pattern; Cloudflare honours only the first. Delete the duplicate. |
| Gmail rejects the SMTP login | Username must be the literal `api_token`; the token goes in the password field. Confirm the token has **Email Sending → Edit**. |
| Sending script exits with code `2` | Not on Workers Paid — the sending half is blocked on a plan decision. Receiving is unaffected. |
| Recipient still sees the Gmail address | The Gmail "Send mail as" identity was not selected in the From field when composing. |

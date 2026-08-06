#!/usr/bin/env node
// setup-email-routing.mjs — Cloudflare Email Routing (INBOUND, free) for one zone.
//
// What it does, in order:
//   1. Resolves the zone -> domain name + account id (nothing about the domain is hardcoded).
//   2. Enables Email Routing on the zone if it is not already enabled.
//   3. Adds the forwarding destination (your Gmail) as an account-level destination address.
//   4. Creates the rule  <local-part>@<domain>  ->  forward to that destination.
//   5. Enables the catch-all rule to the same destination.
//
// It is IDEMPOTENT: every step reads current state first and only writes when
// something is actually missing or wrong. That matters more than it looks —
// Cloudflare honours only the FIRST rule when two rules share an email pattern,
// so a script that blindly re-creates its rule silently breaks mail delivery on
// the second run.
//
// It will STOP CLEANLY (exit 0) if the destination address is not verified yet.
// That verification is a link in an email; it cannot be automated, and EVERY
// routing rule stays disabled until a human clicks it.
//
// Credentials come from the environment ONLY. Never paste a token into this file.
//
// Required environment:
//   CLOUDFLARE_API_TOKEN   API token with  Zone -> Email Routing -> Edit
//                          (and Zone -> Zone -> Read, to resolve the zone name)
//   CLOUDFLARE_ZONE_ID     The zone id for the domain (Cloudflare dashboard, zone Overview)
//   EMAIL_DESTINATION      The Gmail address that should receive the mail
//
// Optional environment:
//   EMAIL_LOCAL_PART       Local part of the custom address. Default: greg
//   EMAIL_CATCH_ALL        "false" to skip the catch-all step. Default: enabled
//
// Usage:
//   node scripts/setup-email-routing.mjs
//   node scripts/setup-email-routing.mjs --dry-run    # read-only; shows the plan
//
// Exit codes:
//   0  success, or stopped cleanly waiting on destination verification
//   1  configuration or API error

// Overridable only so the setup can be exercised against a local mock of the
// Cloudflare API. Leave it unset in real use.
const API = process.env.CLOUDFLARE_API_BASE || 'https://api.cloudflare.com/client/v4';

const DRY_RUN = process.argv.includes('--dry-run');

const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const DESTINATION = process.env.EMAIL_DESTINATION;
const LOCAL_PART = process.env.EMAIL_LOCAL_PART || 'greg';
const WANT_CATCH_ALL = process.env.EMAIL_CATCH_ALL !== 'false';

// ---------------------------------------------------------------- utilities

const log = (...a) => console.log(...a);
const step = (n, msg) => console.log(`\n[${n}] ${msg}`);
const ok = (msg) => console.log(`    ok      ${msg}`);
const skip = (msg) => console.log(`    skip    ${msg}`);
const wrote = (msg) => console.log(`    wrote   ${msg}`);
const plan = (msg) => console.log(`    would   ${msg}`);

function die(msg, hint) {
  console.error(`\nERROR: ${msg}`);
  if (hint) console.error(hint);
  process.exit(1);
}

/**
 * One call against the Cloudflare v4 API.
 * Throws with Cloudflare's own error codes/messages attached — those are far
 * more useful than a bare status code when a token is missing a permission.
 */
async function cf(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let payload;
  const text = await res.text();
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    const err = new Error(`${method} ${path} -> HTTP ${res.status}, non-JSON response`);
    err.status = res.status;
    throw err;
  }

  if (!res.ok || payload.success === false) {
    const details = (payload.errors || [])
      .map((e) => `${e.code ?? '?'}: ${e.message ?? JSON.stringify(e)}`)
      .join('; ');
    const err = new Error(
      `${method} ${path} -> HTTP ${res.status}${details ? ` — ${details}` : ''}`,
    );
    err.status = res.status;
    err.cfErrors = payload.errors || [];
    throw err;
  }

  return payload;
}

/** GET every page of a paginated list endpoint. */
async function cfList(path) {
  const out = [];
  let page = 1;
  for (;;) {
    const sep = path.includes('?') ? '&' : '?';
    const { result, result_info } = await cf('GET', `${path}${sep}page=${page}&per_page=50`);
    out.push(...(result || []));
    const total = result_info?.total_pages ?? 1;
    if (page >= total || !result || result.length === 0) break;
    page += 1;
  }
  return out;
}

/** True when a rule's action set is exactly "forward to this one address". */
function forwardsOnlyTo(actions, address) {
  const forwards = (actions || []).filter((a) => a.type === 'forward');
  if (forwards.length !== (actions || []).length || forwards.length !== 1) return false;
  const values = forwards[0].value || [];
  return values.length === 1 && values[0].toLowerCase() === address.toLowerCase();
}

// ------------------------------------------------------------------- checks

if (!TOKEN) {
  die(
    'CLOUDFLARE_API_TOKEN is not set.',
    'Export it in your shell for this run only — never commit it:\n' +
      '  export CLOUDFLARE_API_TOKEN=...   (Zone -> Email Routing -> Edit)',
  );
}
if (!ZONE_ID) {
  die(
    'CLOUDFLARE_ZONE_ID is not set.',
    'Cloudflare dashboard -> your domain -> Overview -> API section -> Zone ID.',
  );
}
if (!DESTINATION) {
  die(
    'EMAIL_DESTINATION is not set.',
    'This is the Gmail address that should receive the forwarded mail:\n' +
      '  export EMAIL_DESTINATION=you@gmail.com',
  );
}
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(DESTINATION)) {
  die(`EMAIL_DESTINATION does not look like an email address: ${DESTINATION}`);
}

// --------------------------------------------------------------------- main

async function main() {
  if (DRY_RUN) log('DRY RUN — reading current state, writing nothing.\n');

  // 1. Resolve the zone. The domain name is read from Cloudflare, never guessed.
  step(1, 'Resolving zone');
  const { result: zone } = await cf('GET', `/zones/${ZONE_ID}`);
  const domain = zone.name;
  const accountId = zone.account?.id;
  if (!accountId) die('Could not read the account id from the zone response.');
  const address = `${LOCAL_PART}@${domain}`;
  ok(`zone ${domain} (account ${accountId})`);
  ok(`target address ${address} -> ${DESTINATION}`);

  // 2. Email Routing on the zone.
  step(2, 'Email Routing on the zone');
  const { result: settings } = await cf('GET', `/zones/${ZONE_ID}/email/routing`);
  if (settings.enabled) {
    skip(`already enabled (status: ${settings.status ?? 'unknown'})`);
  } else if (DRY_RUN) {
    plan(`enable Email Routing (status is currently ${settings.status ?? 'unknown'})`);
  } else {
    // Enabling also creates the routing MX + SPF + DKIM records on the root domain.
    await cf('POST', `/zones/${ZONE_ID}/email/routing/enable`, {});
    wrote('enabled Email Routing (adds MX + SPF + DKIM on the root domain)');
  }

  // 3. Destination address. These live at the ACCOUNT level, not the zone.
  step(3, 'Destination address');
  const addresses = await cfList(`/accounts/${accountId}/email/routing/addresses`);
  let destination = addresses.find(
    (a) => (a.email || '').toLowerCase() === DESTINATION.toLowerCase(),
  );

  if (destination) {
    skip(`${DESTINATION} already a destination on this account`);
  } else if (DRY_RUN) {
    plan(`add ${DESTINATION} as a destination address (sends a verification email)`);
  } else {
    const { result } = await cf('POST', `/accounts/${accountId}/email/routing/addresses`, {
      email: DESTINATION,
    });
    destination = result;
    wrote(`added ${DESTINATION} — Cloudflare has sent it a verification email`);
  }

  // The gate. `verified` is a timestamp; null/absent means "not verified yet".
  // Until it is set, Cloudflare keeps every rule pointing at this address DISABLED.
  const isVerified = Boolean(destination?.verified);
  if (!isVerified && !DRY_RUN) {
    log('');
    log('  ─────────────────────────────────────────────────────────────');
    log(`  STOP — ${DESTINATION} is not verified yet.`);
    log('');
    log(`  Check ${DESTINATION}, open the mail from Cloudflare, click`);
    log('  "Verify email address", then re-run this script.');
    log('');
    log('  That click cannot be automated, and every routing rule stays');
    log('  disabled until it happens. Nothing below has been configured.');
    log('  ─────────────────────────────────────────────────────────────');
    log('');
    log('Re-run:  node scripts/setup-email-routing.mjs');
    process.exit(0);
  }
  if (isVerified) ok(`${DESTINATION} is verified (${destination.verified})`);
  if (!isVerified && DRY_RUN) plan('wait for destination verification before rules are created');

  // 4. The routing rule. Read first — a second rule on the same pattern would
  //    be silently ignored by Cloudflare and would look like a broken mailbox.
  step(4, `Routing rule for ${address}`);
  const rules = await cfList(`/zones/${ZONE_ID}/email/routing/rules`);
  const existing = rules.find((r) =>
    (r.matchers || []).some(
      (m) =>
        m.type === 'literal' &&
        m.field === 'to' &&
        (m.value || '').toLowerCase() === address.toLowerCase(),
    ),
  );

  const ruleBody = {
    name: `Forward ${address}`,
    enabled: true,
    matchers: [{ type: 'literal', field: 'to', value: address }],
    actions: [{ type: 'forward', value: [DESTINATION] }],
  };

  if (existing) {
    const correct = forwardsOnlyTo(existing.actions, DESTINATION) && existing.enabled;
    if (correct) {
      skip(`rule already forwards ${address} -> ${DESTINATION}`);
    } else if (DRY_RUN) {
      plan(`update existing rule ${existing.id} to forward -> ${DESTINATION} (enabled)`);
    } else {
      // Update in place. Never create a second rule for the same pattern.
      await cf('PUT', `/zones/${ZONE_ID}/email/routing/rules/${existing.id}`, ruleBody);
      wrote(`updated existing rule ${existing.id} -> forward to ${DESTINATION}`);
    }
  } else if (DRY_RUN) {
    plan(`create rule ${address} -> forward to ${DESTINATION}`);
  } else {
    const { result } = await cf('POST', `/zones/${ZONE_ID}/email/routing/rules`, ruleBody);
    wrote(`created rule ${result.id} — ${address} -> ${DESTINATION}`);
  }

  // 5. Catch-all. Single, fixed rule per zone — always a PUT, never a create.
  step(5, 'Catch-all rule');
  if (!WANT_CATCH_ALL) {
    skip('EMAIL_CATCH_ALL=false — leaving the catch-all untouched');
  } else {
    const { result: catchAll } = await cf('GET', `/zones/${ZONE_ID}/email/routing/rules/catch_all`);
    const correct = forwardsOnlyTo(catchAll?.actions, DESTINATION) && catchAll?.enabled;
    if (correct) {
      skip(`catch-all already forwards to ${DESTINATION}`);
    } else if (DRY_RUN) {
      plan(`enable catch-all -> ${DESTINATION}`);
    } else {
      await cf('PUT', `/zones/${ZONE_ID}/email/routing/rules/catch_all`, {
        name: 'Catch-all',
        enabled: true,
        matchers: [{ type: 'all' }],
        actions: [{ type: 'forward', value: [DESTINATION] }],
      });
      wrote(`catch-all enabled -> ${DESTINATION}`);
    }
  }

  // 6. Report the DNS records Cloudflare manages for routing, so the runbook
  //    records what actually exists instead of what we assume exists.
  step(6, 'Routing DNS records on the root domain');
  try {
    const { result: dns } = await cf('GET', `/zones/${ZONE_ID}/email/routing/dns`);
    const records = Array.isArray(dns) ? dns : dns?.records || [];
    if (records.length === 0) {
      skip('no records reported yet — re-check after enabling finishes');
    } else {
      for (const r of records) {
        const prio = r.priority !== undefined ? ` priority=${r.priority}` : '';
        ok(`${r.type.padEnd(5)} ${r.name}${prio}  ->  ${r.content}`);
      }
    }
  } catch (err) {
    // Non-fatal: a narrower token may not read DNS. Routing still works.
    skip(`could not read routing DNS records (${err.message})`);
  }

  // ------------------------------------------------------------- next steps
  log('');
  log('Receiving is configured.' + (DRY_RUN ? ' (dry run — nothing was written)' : ''));
  log('');
  log('VERIFY IT FOR REAL — an API 200 is not mail arriving:');
  log(`  Send a test message to ${address} from an account that is NOT`);
  log(`  ${DESTINATION}. Providers routinely drop mail that appears to come`);
  log('  from the same inbox it is delivered to. Then check the inbox, and');
  log('  check spam.');
  log('');
  log('Sending as this address is a SEPARATE product (Email Sending, requires');
  log('Workers Paid). See scripts/setup-email-sending.mjs and the runbook at');
  log('runbooks/cloudflare-email.md.');
}

main().catch((err) => {
  console.error(`\nERROR: ${err.message}`);
  if (err.status === 403 || err.status === 401) {
    console.error(
      '\nThat looks like a token permission problem. This script needs:\n' +
        '  Zone -> Email Routing -> Edit   (enable routing, rules, catch-all)\n' +
        '  Zone -> Zone -> Read            (resolve the zone name)\n' +
        '  Account -> Email Routing Addresses -> Edit  (add the destination)\n' +
        'Scope the token to this one zone/account. Do not reuse a broader token.',
    );
  }
  process.exit(1);
});

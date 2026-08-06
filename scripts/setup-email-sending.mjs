#!/usr/bin/env node
// setup-email-sending.mjs — Cloudflare Email Sending (OUTBOUND) onboarding for one zone.
//
// This is a DIFFERENT PRODUCT from Email Routing, with a different onboarding,
// different DNS records, and a different price. Routing (inbound) is free.
// Sending (outbound) requires the Workers Paid plan and is currently in beta.
//
// What it does, in order:
//   1. Resolves the zone -> domain name + account id.
//   2. Checks that Email Sending is actually available on this account.
//      If it is NOT, the script STOPS and reports it as a decision for the
//      account owner. It never enables, upgrades, or purchases anything.
//   3. Onboards the domain under Email Sending (idempotent — reads first).
//   4. Reports the DNS state for the sending records, which live on the
//      cf-bounce subdomain plus a DMARC record on _dmarc.
//   5. Prints the exact Gmail "Send mail as" settings.
//
// Credentials come from the environment ONLY. Never paste a token into this file.
//
// Required environment:
//   CLOUDFLARE_API_TOKEN   API token with  Email Sending -> Edit
//                          (and Zone -> Zone -> Read, to resolve the zone name)
//   CLOUDFLARE_ZONE_ID     The zone id for the domain
//
// Usage:
//   node scripts/setup-email-sending.mjs
//   node scripts/setup-email-sending.mjs --dry-run   # read-only; shows the plan
//   node scripts/setup-email-sending.mjs --fix-dns   # let Cloudflare write the
//                                                    # sending DNS records it manages
//
// Exit codes:
//   0  success (or dry run)
//   1  configuration or API error
//   2  BLOCKED — Email Sending is not available on this account (a plan
//      decision for the owner; deliberately a distinct code from a failure)

// Overridable only so the setup can be exercised against a local mock of the
// Cloudflare API. Leave it unset in real use.
const API = process.env.CLOUDFLARE_API_BASE || 'https://api.cloudflare.com/client/v4';

const DRY_RUN = process.argv.includes('--dry-run');
const FIX_DNS = process.argv.includes('--fix-dns');

const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;

const log = (...a) => console.log(...a);
const step = (n, msg) => console.log(`\n[${n}] ${msg}`);
const ok = (msg) => console.log(`    ok      ${msg}`);
const skip = (msg) => console.log(`    skip    ${msg}`);
const wrote = (msg) => console.log(`    wrote   ${msg}`);
const plan = (msg) => console.log(`    would   ${msg}`);
const warn = (msg) => console.log(`    warn    ${msg}`);

function die(msg, hint) {
  console.error(`\nERROR: ${msg}`);
  if (hint) console.error(hint);
  process.exit(1);
}

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

if (!TOKEN) {
  die(
    'CLOUDFLARE_API_TOKEN is not set.',
    'Export it for this run only — never commit it:\n' +
      '  export CLOUDFLARE_API_TOKEN=...   (Email Sending -> Edit)',
  );
}
if (!ZONE_ID) die('CLOUDFLARE_ZONE_ID is not set.');

async function main() {
  if (DRY_RUN) log('DRY RUN — reading current state, writing nothing.\n');

  // 1. Resolve the zone.
  step(1, 'Resolving zone');
  const { result: zone } = await cf('GET', `/zones/${ZONE_ID}`);
  const domain = zone.name;
  const accountId = zone.account?.id;
  if (!accountId) die('Could not read the account id from the zone response.');
  ok(`zone ${domain} (account ${accountId})`);

  // 2. THE PLAN GATE.
  //
  // We check availability by READING the Email Sending API, not by reading a
  // plan label. The read is the honest signal: if this account cannot use
  // Email Sending, the sending endpoints refuse, and that refusal is exactly
  // the condition we care about. We never enable, upgrade, or buy anything.
  step(2, 'Checking whether Email Sending is available on this account');
  try {
    const { result: limits } = await cf('GET', `/accounts/${accountId}/email/sending/limits`);
    const quota = limits?.quota;
    const usage = limits?.usage;
    ok(
      'Email Sending API responds' +
        (quota !== undefined ? ` — quota ${JSON.stringify(quota)}, usage ${JSON.stringify(usage)}` : ''),
    );
  } catch (err) {
    const blocked =
      err.status === 402 ||
      err.status === 403 ||
      /plan|subscription|billing|entitle|not enabled|unauthor/i.test(err.message);

    if (blocked) {
      log('');
      log('  ─────────────────────────────────────────────────────────────');
      log('  BLOCKED — Email Sending is not available on this account.');
      log('');
      log(`  Cloudflare said: ${err.message}`);
      log('');
      log('  Email Sending (outbound) requires the Workers Paid plan, $5/mo,');
      log('  and is currently in beta. Email Routing (inbound) is free and is');
      log('  unaffected — receiving mail already works, or can be set up now');
      log('  with scripts/setup-email-routing.mjs.');
      log('');
      log('  This is a spending decision, so this script stops here rather');
      log('  than making it. Nothing has been enabled or purchased.');
      log('');
      log('  If the plan IS already Workers Paid, the more likely cause is');
      log('  the token: it needs  Email Sending -> Edit. Re-check that first.');
      log('  ─────────────────────────────────────────────────────────────');
      process.exit(2);
    }
    throw err;
  }

  // 3. Onboard the domain under Email Sending. Read first, then write.
  step(3, `Email Sending onboarding for ${domain}`);
  const { result: subdomainsRaw } = await cf('GET', `/zones/${ZONE_ID}/email/sending/subdomains`);
  const subdomains = Array.isArray(subdomainsRaw) ? subdomainsRaw : [];
  let sending = subdomains.find((s) => (s.name || '').toLowerCase() === domain.toLowerCase());

  if (sending) {
    skip(`${domain} already onboarded (enabled: ${sending.enabled})`);
  } else if (DRY_RUN) {
    plan(`onboard ${domain} under Email Sending`);
  } else {
    const { result } = await cf('POST', `/zones/${ZONE_ID}/email/sending/subdomains`, {
      name: domain,
    });
    sending = result;
    wrote(`onboarded ${domain} under Email Sending`);
  }

  const sendingId = sending?.tag;
  if (sending) {
    if (sending.return_path_domain) ok(`return-path domain: ${sending.return_path_domain}`);
    if (sending.dkim_selector) ok(`DKIM selector: ${sending.dkim_selector}`);
  }

  // 4. DNS state for the sending records.
  if (!sendingId) {
    warn('no sending-subdomain id available yet — re-run to read DNS state');
  } else {
    step(4, 'Sending DNS records (cf-bounce subdomain + _dmarc)');
    const { result: status } = await cf(
      'GET',
      `/zones/${ZONE_ID}/email/sending/subdomains/${sendingId}/dns/status`,
    );
    ok(`aggregate status: ${status?.status ?? 'unknown'}`);

    for (const r of status?.records || []) {
      const prio = r.priority !== undefined ? ` priority=${r.priority}` : '';
      ok(`${String(r.type).padEnd(5)} ${r.name}${prio}  ->  ${r.content}`);
    }
    for (const e of status?.errors || []) {
      warn(`${e.code ?? 'error'}: ${e.message ?? JSON.stringify(e)}`);
    }

    if (status?.status !== 'ready') {
      if (FIX_DNS && !DRY_RUN) {
        const { result: fixed } = await cf(
          'POST',
          `/zones/${ZONE_ID}/email/sending/subdomains/${sendingId}/dns`,
        );
        wrote(`applied managed sending DNS records — status now: ${fixed?.status ?? 'unknown'}`);
        for (const e of fixed?.errors || []) {
          warn(`${e.code ?? 'error'}: ${e.message ?? JSON.stringify(e)}`);
        }
      } else {
        warn(
          'sending DNS is not "ready". Re-run with --fix-dns to let Cloudflare ' +
            'write the records it manages, then allow 5-15 min for propagation.',
        );
      }
    }
  }

  // 5. The Gmail settings. Printed here AND kept in the runbook, because Greg
  //    will need them again and a terminal scrollback is not a record.
  step(5, 'Gmail "Send mail as" settings');
  log('');
  log('  Gmail -> Settings -> Accounts and Import -> Send mail as');
  log('  -> Add another email address');
  log('');
  log('    Name            Greg Mazza');
  log(`    Email address   greg@${domain}`);
  log('    Treat as alias  UNCHECK, if replies should thread properly');
  log('');
  log('    SMTP Server     smtp.mx.cloudflare.net');
  log('    Port            465');
  log('    Security        SSL (implicit TLS)');
  log('    Username        api_token          <- the literal string, not a token');
  log('    Password        your Cloudflare API token with Email Sending -> Edit');
  log('');
  log('  Gmail will email a confirmation code to greg@' + domain + '. Because');
  log('  Email Routing already forwards that address to the same Gmail inbox,');
  log('  the code arrives there. No extra step.');
  log('');
  log('  The SMTP password is a REAL CREDENTIAL: anyone holding it can send');
  log('  mail as ANY onboarded domain on this Cloudflare account. Treat it');
  log('  like a password. Never commit it, never paste it into chat.');
  log('');
  log('VERIFY IT FOR REAL — a saved Gmail setting is not a delivered message:');
  log(`  Send a message from Gmail AS greg@${domain} to an outside address,`);
  log('  and confirm the recipient sees the custom domain in the From line —');
  log('  not the Gmail address.');
}

main().catch((err) => {
  console.error(`\nERROR: ${err.message}`);
  if (err.status === 403 || err.status === 401) {
    console.error(
      '\nThat looks like a token permission problem. This script needs:\n' +
        '  Email Sending -> Edit\n' +
        '  Zone -> Zone -> Read   (resolve the zone name)',
    );
  }
  process.exit(1);
});

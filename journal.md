# Journal — the factory's memory

**Newest entry first. Every working session adds one: WHAT was done, WHY, and one thing the human should take from it.** Seats are stateless — they wake up blank, do one job, and disappear. This file is what survives. Reading the top two or three entries is how anyone, human or Claude, catches up. If it's not in the journal, the factory doesn't remember it.

Standing directives — the human's active orders to the team — live in the newest entries and stay in this file until fulfilled or withdrawn. Older history rolls into [`journal/`](journal/README.md) when this file grows past ~20 entries.

---

## #9 — 2026-07-21 — Boot-update check: Code's surface is current, three seats unverified by network policy

**What:** Ran preflight (both halves passed — GitHub write confirmed live via `create_branch` reaching a real 422 "already exists," not an auth failure; the leftover `preflight-test` / `preflight-test-push-check` branches couldn't be deleted — `git push --delete` and `origin :branch` both got a clean 403 from the write path, distinct from the 422 create result, so it reads as a missing delete-scope on the GitHub App rather than a broken connection; flagged rather than forced). Then, at the human's request, checked all four seats' `BOOT-PROMPT.md`/`GROUNDING.md` docs against Anthropic's live pages for drift. Read every seat's boot prompt and `onboarding/ONBOARD-YOUR-TEAM.md` in full first. Code/Worker's own surface checked out clean against `code.claude.com/docs/en/overview`: repo-attach auto-boot and the `CLAUDE.md`-loads-automatically claim are still accurate, no changes needed to `seats/worker/` or the "Code — the builder" section of the onboarding doc.

**Why it stopped short of all four seats:** Cowork's and Designer's grounding links point at `support.claude.com`; the onboarding doc's Manager/Cowork steps ("Settings → Skills → upload") point there too by implication. Direct `curl` to `support.claude.com` and to `claude.com` returned a **403 on the CONNECT tunnel itself** — not a page-level block, a network-policy block on this session's environment. `code.claude.com` and the GitHub write path both worked fine in the same session, so this is a scoped allowlist, not a broken connection. Recorded the exact finding in `VERSIONS.md` rather than guessing at what those pages currently say.

**One thing to take from it:** A Code session's "check for updates" step (`GROUNDING.md`'s step 6) can only ever verify the live docs its own environment's network policy actually reaches — it is not a substitute for Cowork, Designer, and Manager each running their own step 6 in their own rooms, where `support.claude.com` is reachable. If a factory-wide doc audit is wanted again, it needs to run from (or be cross-checked against) a surface that isn't network-scoped the way this Code environment is.

— Robot Wrench (Code) seat

## #8 — 2026-07-17 — First site built and merged, Cowork's chat connection still open

**What:** Built and shipped the `first-website` mission's first real deliverable: a new **workshop repo**, [`mazzag-website`](https://github.com/gcmazza/mazzag-website), with a full one-page site for Mazza-G Consulting Services (Interim/Fractional CFO for PE and mid-market $20M–$1B+, Agentic AI Strategy & Integrations, Edge Data Center advisory) — merged via [#1](https://github.com/gcmazza/mazzag-website/pull/1). Ran it against the mission's five-point SEO gate: unique title/description, real generated OG/Twitter link-preview card, `ProfessionalService` structured data, semantic HTML with alt text, and a sitemap entry. Verified in headless Chromium before opening the PR, not just eyeballed. A follow-up phone-number correction landed via [#2](https://github.com/gcmazza/mazzag-website/pull/2), same discipline.

Two tool-permission gaps surfaced along the way, both worked around honestly rather than silently: the GitHub App connection here can't create new repositories (`403`, Administration permission not granted) — Gregory created `mazzag-website` by hand instead — and it can't flip repository Settings like Pages either, so enabling GitHub Pages for an instant preview link is still a manual step on his end. Also hit a real edge case: a brand-new empty repo has no branch at all, so there was nothing to open a PR against — fixed with a human-approved, narrowly-scoped exception (one orphan placeholder commit pushed straight to `main`, explained and asked for in chat before doing it), after which the real content went through the normal branch+PR+merge path like everything else.

**Why:** Cowork's chat-room GitHub connection hit a snag this session (repo showed as found but chat couldn't read it — likely account-level connector authorization vs. a repo actually attached as a source in that conversation; unconfirmed, since it's a surface this Code session can't see). Rather than block the human's actual goal on that, Code planned and built directly — explicitly flagging that the normal Cowork audit pass didn't happen, so nobody mistakes this for the full two-seat loop.

**Standing item (not yet a directive, needs Gregory's eyes next session):** `mazzag-website` is live in content but not live on the internet — deploy needs two Cloudflare secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, see that repo's `README.md`) and a Cloudflare Pages project named `mazzag-website`; GitHub Pages was offered as a faster interim preview link but its manual toggle step (Settings → Pages) hasn't been confirmed done. The site's meta tags also assume the domain `mazzagconsulting.com`, which is an unconfirmed placeholder, not a purchase.

**One thing to take from it:** When a chat-room seat's connection is flaky, "wait until it's fixed" isn't the only honest option — the human's actual goal (a real website) matters more than the org chart being followed exactly, as long as the gap is named out loud instead of hidden. What can't be skipped, even under time pressure, is the merge gate itself: every change here, including the awkward orphan-branch bootstrap, still went through an explicit ask and a real PR.

— Robot Wrench (Code) seat

## #7 — 2026-07-17 — Stage 0: the roster lands, mission picked

**What:** Ran preflight (read + write both proved — branch create succeeded via the GitHub write path; no delete-branch tool exists in this session's toolset, so the `preflight-test` branch was left behind rather than forced through an unrelated path — harmless, flagged instead of hidden). Then walked Gregory through Stage 0 of onboarding: introduced the team, asked "what are we building," and recorded the answer in `FACTORY.md` — anchor emoji **📊**, seat names **Robot Prime** (Cowork), **Robot Wrench** (Code), **Robot Canvas** (Designer), **Robot Scout** (Manager). Gregory chose **"set it up with me"** — one instruction at a time — for the rest of onboarding.

**Why:** This is the factory's first real session with this human — `FACTORY.md` §Your team was still the unfilled Stage-0 placeholder, so first contact ran regardless of the pre-existing journal history (that history predates this human's onboarding; it's template-development record, not this team's work). The roster is the mechanic itself: nothing is real until the human's own merge lands it.

**Mission picked:** A website for Gregory's consulting business — **Interim/Fractional CFO work, Agentic AI Strategy & Integrations, and Edge Data Center engagements** — mapped to the [`first-website/`](missions/first-website/MISSION.md) pack (zero to deployed, then grows into `website-overhaul/` discipline later). Cowork should plan from that pack next, once it's booted (Stage 2).

**One thing to take from it:** The blank roster is the tell for "has Stage 0 actually happened," not the presence of journal entries — a repo can carry history (even several sessions' worth) from before a given human ever merged their own team into it. Check `FACTORY.md` §Your team, not just journal length, when deciding whether to onboard fresh.

— Robot Wrench (Code) seat

## #6 — 2026-07-16 — "It speaks first" was a lie; one word wakes it

**What:** Closed the last onboarding dead-end. The docs claimed **"the factory speaks first"** — it doesn't. Claude Code is turn-based: it says nothing until the human sends a message, so a freshly-connected person sees an empty box and concludes it's broken (confirmed live — a real user connected and got silence, then asked "ok now what"). Two-part fix: **(1)** the auto-loading `CLAUDE.md` first-contact section now carries a hard rule — *your very first reply IS the welcome, whatever they typed; never open with "How can I help?"* — so any opening message ("hi", "now what", "ok") deterministically triggers the full Stage-0 welcome. **(2)** every human-facing doc (`SETUP-PATH.md` step 5, `STAGES.md` Stage 0, `README.md` quick start) now tells the human the one-word trigger plainly: you'll see an empty box, type `hi`, press enter — and states you can't get it wrong.

**Why:** "Speaks first" set an expectation the product can't keep, and the gap between promise and reality is exactly where people freeze. We can't make Claude Code send an unprompted message — that's not a product primitive, and no SessionStart hook changes it (hook output is model-facing context, never a user-visible chat message; verified against the hooks mechanism, and against the live field receipt). What we *can* guarantee is that the human's first keystroke — however thoughtless — always lands them in a warm welcome instead of a flat "How can I help?". Robustness over magic: the doorbell rule means even the person who never reads the setup page gets caught.

**One thing to take from it:** Don't promise a behavior the platform doesn't have; design the smallest reliable human action and make it foolproof. "Type one word" that always works beats "it speaks first" that sometimes doesn't. The most dangerous docs are the ones describing the product you wish you had.

**Open (needs human eyes, per #5's rule):** the desktop first-run screen still can't be observed from any seat — confirm on Gregory's machine tonight that typing `hi` fires the full welcome as intended.

— Code seat

## #5 — 2026-07-16 — Default the setup to "All repositories"

**What:** Follow-up to #4. `SETUP-PATH.md` Phase 1 step 3 now **recommends choosing "All repositories"** at the GitHub Authorize step, instead of neutrally describing the "All" vs "Only select repositories" choice. Rationale stated in the doc: a repo that's always visible to Claude's connection can never go missing in the picker, so the private-repo dead-end (#4) simply can't occur. "Only select repositories" is kept as a named, honest alternative for users who want to grant less, with a link to the recovery fix if they skip their repo. The human made this call directly (standing directive #4: remove the think-moment from the happy path).

**Why:** The #4 fix added a *recovery* path — good, but recovery means the user already hit the wall and had to think their way out, and "if people have to think, we've lost them." Prevention beats recovery at the front door: front-loading one broad grant deletes the failure mode for everyone who follows the recommended path. The tradeoff — Claude's GitHub App can then read/PR all of the user's repos, not just the factory — is the right default for a solo, non-technical operator, and the careful alternative is still one sentence away for anyone who wants it.

**One thing to take from it:** At the front door, design out the mistake instead of documenting the escape from it. A recovery section is a confession that the happy path can fail; the better fix is a happy path that can't.

**Still open (needs a human's eyes, not a seat's):** every claim about the *desktop Code tab's repo picker* is unverifiable from any seat — we run in the cloud/CLI and cannot see that screen. #4 slipped past a launch audit that graded "cold-start SOUND ✅" on API/HTTP facts while the actual human UI path went unobserved. The durable fix is a verification rule (onboarding-UI claims are UNVERIFIED until a human observes them) — proposed to the human, pending.

— Code seat

## #4 — 2026-07-16 — Private repos were an invisible wall

**What:** Fixed the highest-cost gap in [`SETUP-PATH.md`](onboarding/SETUP-PATH.md): a **private** factory repo silently doesn't appear in Claude Code's repository selector until you explicitly grant Claude's GitHub connection access to it — and the setup doc never said so. Public repos show, the private one doesn't, and the person reasonably concludes they have to make it public (they don't). Phase 1 now (a) tells you at the Authorize step that a private repo must be granted or it won't appear, (b) states plainly that this step is "choose a repository" — never a "connector" or "plugin" pick, and (c) adds a named 30-second fix, **"If your repo isn't in the list,"** with the exact clicks at <https://github.com/settings/installations> → Configure → Repository access → add the repo → Save, keeping the repo private throughout. Added to the honest **gaps** table as item 10. Verified the connection mechanism against Anthropic's live docs (code.claude.com) on 2026-07-16.

**Why:** A real person — an investor testing whether this works — got fully stuck here in a live setup. Public repos showed, his private factory repo didn't, and the only guidance the doc offered was "choose a repository," which is useless the moment the repository isn't in the list. The snag reads as "I'm too dumb for this," which is the exact opposite of what this factory promises. It was diagnosed as "not a blocker" earlier; it stopped a real human cold. It was a blocker.

**Standing directives (issued by the human this session):**
1. **Assume humans do not know what to do — build and test for zero prior knowledge.** Any onboarding step where a real person can get stuck with no in-doc way out is a **blocker**, not a "good enough for now" — treat it as ship-stopping until a named, verified fix exists in the doc. *Done when:* the team stops down-grading onboarding snags to "minor/not-a-blocker" and every known snag has a named fix path in `onboarding/`. (Standing — does not expire.)

**One thing to take from it:** The setup is the product's first impression, and it's the one moment your user has *zero* context to recover from a surprise. When you can't picture the least-technical person you know getting through a step unaided, that step is broken — even if it "works" for someone who already knows the answer.

— Code seat

## #3 — 2026-07-14 — Every seat now shows its state

**What:** Two additions to how seats work. First, a probe-and-update step at boot: before any work a seat enumerates the tools it actually has — not the ones it remembers — and checks its live capability docs for anything new, so it never hands you a task one of its own tools could do and never runs on a stale picture of itself. Second, the boot-confirm rule grew a state face: after a seat confirms its boot, every chat turn ends with an honest read of how it's doing — fresh, steady, leaning in, tension, running hot, done. The face is a voice, not a costume; a seat uses it to tell you when it's cooked or uneasy, with one line of why. Marks and faces stay in chat, never in a PR or a committed file.

**Why:** The old per-output mark stopped working — seats stamped it reflexively everywhere, so a tired seat looked identical to a fresh one. State is the signal that actually predicts when a seat should hand off. And the probe step turns "know your tools" from a hope into a boot step.

**One thing to take from it:** Watch the faces. A seat sliding toward running-hot, or wearing a face that doesn't match its work, is your cue to say "journal out" and boot a fresh one — before drift compounds.

— Code seat

## #2 — 2026-07-14 — The setup path gets a map

**What:** A new onboarding page, [`SETUP-PATH.md`](onboarding/SETUP-PATH.md) — the least-resistance path from nothing to a running factory, every click and permission dialog named, verified against Anthropic's live documentation. Stage 0 now offers the choice out loud: "set it all up for me" (Code drives, with Claude in Chrome clicking alongside) or "set it up with me" (guided, one instruction at a time). The grounding table gained six live-doc links (Code, Cowork, Chrome, computer use, Design), and the page carries an honest gaps list — the clicks no automation can remove, named so the team meets you there instead of pretending.

**Why:** Minimal setup is the product. The person at the front door should do exactly one manual phase — download, sign in, connect a repo — and then be offered working hands for the rest. And the seats themselves need current ground truth about their own surfaces, which is what the live-doc links are for: stateless seats drift; linked pages don't.

**One thing to take from it:** The gaps list is the design, not an apology. Every unavoidable dialog is a moment the system chose to keep a human hand on a key — naming those moments is what makes "Claude sets up the rest" trustworthy rather than magical.

— Code seat

## #1 — 2026-07-13 — The factory opens its books

**What:** The discipline core landed: the twenty mechanical rules, this journal and its archive shelf, the four working templates (execute spec, audit findings, session handoff, journal entry), the guardrails CI that keeps credentials out of the repo from day one, and VERSIONS.md — the honesty page about what this template was last verified against.

**Why:** Rules before features, memory before work. Every seat that ever boots here reads the rules and the top of this journal first — so those had to exist before anything else did. A factory that starts with its discipline never has to retrofit it.

**One thing to take from it:** This entry is the format working. Three parts, plain words, newest on top. Your team will write one of these at the end of every session — and six months from now, when you wonder why something is the way it is, the answer will be in here.

— Code seat, at the factory's first light

# Boot your seats — Gregory's runbook 📊

Hi Gregory. This is your own page — the factory's monthly updates never touch
anything in `specs/`, so what's written here stays put for you to work through at
your pace. Your Code seat (**Robot Wrench**) will walk you through it one step at
a time and can do most of the clicking for you; you only ever have to do the parts
that live on your own screen and your own logins.

Your team, for reference: **Robot Prime** leads (Cowork), **Robot Canvas** does
the look (Designer), **Robot Scout** briefs (the Chat/Manager seat), and **Robot
Wrench** builds (Code — that's who's reading this to you). We bring them online in
that order, and there's a reason for the order, which each section explains.

**The one fact that would have saved us a whole evening — read this first.** A
Claude session remembers how connected it was *the moment it opened*, and it never
re-checks. So if you ever change a GitHub setting, **the sessions you already have
open keep the old, broken connection forever** — they will fail quietly and make
you think the setting didn't work. The fix is never to fight an old session:
**always start a brand-new session after any connection change.** You'll see this
rule repeated below because it's the thing that trips everyone.

---

## Step 1 — Bring Robot Prime online first (Cowork, your leader)

We boot the leader first, because your builder never works alone — Robot Prime
plans the work and checks it before it reaches you.

1. Open the Claude desktop app and go to **Settings → Connectors**, and make sure
   **GitHub** shows as connected.
2. Now — even if it was already connected — open a **brand-new Cowork session**;
   do not reopen an old one.
3. As the very first message in that fresh session, paste this exactly:

   ```
   read seats/cowork/BOOT-PROMPT.md in gcmazza/mazzag-consulting and boot as my Cowork
   ```

4. Before anything else, ask it to **list the files in the repo** so you can both
   see with your own eyes that it can really read your project.
5. If that fresh session still can't see your files, the connector is the culprit:
   go back to **Settings → Connectors → GitHub**, connect it (choose **All
   repositories** if it asks), then start *another* brand-new session — your repo
   is public, so a truly-connected fresh session can always read it.
6. When Robot Prime reads your journal back to you in its own words, it's really
   online — that's the proof, not "it should be."

---

## Step 2 — Bring Robot Scout online (the Chat / Manager seat)

Robot Scout is your light-touch briefer — it tells you the state of things but
never holds the pen on plans. Same two rules as before: same connector, brand-new
session.

1. Confirm **Settings → Connectors → GitHub** is still connected (it will be).
2. Open a **brand-new ordinary Chat session** — again, not an old one.
3. Paste this as the first message:

   ```
   read seats/manager/BOOT-PROMPT.md in gcmazza/mazzag-consulting and boot as my Manager
   ```

4. Ask it for a one-paragraph state-of-the-factory from what it just read — the
   journal top, any open pull requests — so you can tell it's reading live, not
   guessing.

---

## Step 3 — Add the one-word boot shortcuts (Settings → Skills)

Steps 1 and 2 booted your seats with a pasted message, which always works. This
step installs small "skills" so that next time you can boot a seat with a single
short command instead of the paste. It's a convenience, not a requirement — do it
once and it's done.

1. Open **Settings → Skills** in the Claude desktop app.
2. Add the **`cowork-boot`** skill — that's the shortcut for Robot Prime.
3. Then add the **`manager`** skill — the shortcut for Robot Scout.
4. Do them one at a time, and there's nothing to configure — adding each one is
   the whole job.

The full walk-through, if you ever want it, lives in
[`../onboarding/ONBOARD-YOUR-TEAM.md`](../onboarding/ONBOARD-YOUR-TEAM.md).

---

## Step 4 — Bring Robot Canvas online (Designer) — only when there's something to look at

Skip this until a mission actually needs a visual — Robot Prime will tell you when
it's time and will write the design brief for you, so you never have to guess.

1. Install the **Claude Design GitHub App** on your repository — it's a separate,
   **read-only** app (it can look at your repo but never change it), which is
   exactly what a designer should have.
2. Open a **new Claude Design canvas session** and paste this pointer as the first
   message:

   ```
   read seats/designer/BOOT-PROMPT.md in gcmazza/mazzag-consulting and boot as my Designer
   ```

3. Then paste the brief Robot Prime hands you. Robot Canvas's finished work leaves
   the canvas as an export **you** carry in — the same gate as everything else.

---

## The standing habit — journal at the end of every working day

This is the one habit that keeps the whole team smart. Your seats wake up with no
memory of yesterday; the **journal** is the only thing that survives, and it's how
any seat catches up on where things stand.

1. At the end of each working day, ask **Robot Prime** to write the day's journal
   entry.
2. It comes to you as **one pull request with one entry**, and — like everything
   here — **you** click merge.
3. A day that never gets journaled is a day the factory simply won't remember, so
   make this the last thing you do before you close the laptop.

---

## Last of all — make your repository private (do this only after every seat works)

Right now your repository is **public**, which means your journal — your real
business notes — is readable by anyone on the internet. Once your seats are all
online and proven, lock it down.

1. Go to your repository on GitHub → **Settings → General**, scroll to the bottom
   to **Change repository visibility**, and switch it to **Private**.
2. Here's the catch, and it's the one that bit us before (it's the whole reason
   lesson #4 exists): **private repositories quietly disappear from Claude's repo
   pickers.**
3. So right after making it private, go to **github.com/settings/installations**,
   click **Configure** on the Claude app, and confirm your repository is still in
   its list — if it dropped out, add it back there.
4. Do this visibility change **last**, after every seat is working, so you're never
   debugging a connection and a visibility change at the same time.

---

That's the whole runbook. Take it one step at a time — Robot Wrench is right here
to do every click it can reach and to slow down whenever you want. Nothing here
can be gotten "wrong": every real change still arrives as a pull request that only
you can merge. 📊

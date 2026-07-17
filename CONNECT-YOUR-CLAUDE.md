# Connect your Claude to this repo (2 minutes, one time)

Greg — **your Claude says it's connected, but GitHub shows no app installed.
That's the missing half.** The connection has two switches on two different
pages. You (or a past setup) flipped the first one — that's why Claude reads
"connected." The second one, the one that actually lets Claude **write** to your
repo, was never flipped. Until it is, your sessions can read public files but
every change silently fails, and private repos don't work at all. That's the
whole reason tonight went the way it did. Here's the fix.

## The half that's missing — INSTALL the Claude app on GitHub
1. Go to **github.com/apps/claude**
2. Click **Install**
3. Choose **gcmazza** (your account)
4. Choose **All repositories** → click the green button

## Verify it took — this step is not optional
1. Go to **github.com/settings/installations**
2. **Claude** must now appear under **Installed GitHub Apps**
   - ⚠️ There's a separate **"Authorized GitHub Apps"** tab. Seeing Claude there
     is what you already had — it is **not** the same as **Installed** and it is
     **not enough**. It must be under **Installed**.
3. Confirm it has access to **mazzag-consulting** (All repositories covers it).

If it's under **Installed** with access to your repo, the missing half is fixed.

## Then start ONE brand-new session — and don't reopen the old ones
The sessions you had open tonight are holding **dead credentials**. They'll keep
failing even now that the app is installed. Leave them closed.

1. Open the Claude desktop app → **Code** tab
2. Click **New session** — **never resume an old one**
3. Pick **mazzag-consulting**
4. Let it lead. It now **proves its own access first** (reads the repo, then
   makes and deletes a test branch) before doing anything — so you'll *know*
   it's connected, and it'll walk you through booting your team from there.

That's the whole job on your side. After this, your Claude team runs from this
repo, and every change it makes reaches you as a pull request — like this one —
that only **you** merge.

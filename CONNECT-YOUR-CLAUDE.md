# Connect your Claude to this repo (2 minutes, one time)

Greg — your Claude can't see this repo yet because two switches were never
flipped. Do these in order, in your normal web browser:

## Switch 1 — connect GitHub to your Claude account
1. Go to claude.ai and sign in
2. Click your initials (bottom-left) → Settings → Connectors
3. Find GitHub → click Connect
4. Sign in to GitHub as gcmazza and approve everything it asks
5. If it asks which repositories: choose "All repositories" → green button

## Switch 2 — make sure the Claude app is INSTALLED on GitHub
1. Go to github.com/settings/installations
2. "Claude" must appear under INSTALLED GitHub Apps (not just "Authorized" —
   that is a different tab and it is not enough)
3. If it's missing: go to github.com/apps/claude → Install → gcmazza →
   All repositories → green button

## Prove it works
1. Open the Claude desktop app → Code tab
2. IGNORE all your old sessions — they are permanently broken, never resume them
3. Click New session → pick MazzaG-Consuling → paste this:
   "List the files in this repo's root, then create a branch called
   access-test and delete it. Report exactly what you see."
4. If it lists files AND the branch worked: you're connected. Forever.

That's it. After this, your Claude team runs from this repo and every change
it makes comes to you as a pull request — like this one — that only YOU can merge.

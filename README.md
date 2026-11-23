# The First 40 Days: multi-family version

This is the version to sell. Any family can start their own page, and it's kept completely separate from Elena's live app (different branch, different Firebase project).

**Try it now:** open `index.html?demo` (as the mom) or `index.html?demo=helper` (as a helper). Until a Firebase config is added, the whole app runs in demo mode: everything works, nothing is saved.

## What's different from the family app

- **Any family can start a page.** Sign in, enter names and the due date, and you get a private invite link (`?f=<random code>`).
- **Nothing is hard-coded.** The mom's name, partner and big kids come from each family's settings. With no big kids, the "Time with…" options disappear.
- **"Elena" tab is now "Manage."** It has invite sharing, co-managers by email, and "Delete this page."
- **Account deletion** (an App Store requirement): Delete account, or "Remove my info" for helpers.
- **Sign in with Apple** added next to Google and email. Apple requires a privacy-friendly option like this when an app offers Google sign-in.
- **Privacy:** co-manager emails and phone numbers are hidden from helpers, and nobody can browse other families.
- **Turned off for now:** the auto-updating calendar feed. The family app's version ran on a GitHub Action, which doesn't scale to many families. One-tap "add to calendar" and downloads still work. The feed comes back in Phase 4 with a Firebase Cloud Function.

## Files

| File | What it is |
|---|---|
| `index.html` | The app |
| `config.js` | Paste the new Firebase project's config here |
| `demo.js` | In-memory sample family for `?demo` links and screenshots |
| `firestore.rules` | Security rules. Paste into Firebase → Firestore → Rules |
| `privacy.html`, `terms.html` | **Drafts.** Fill in the brackets and get them reviewed |
| `tests/` | Security-rule tests (29 checks) for the Firestore emulator |

## Setup (about 20 minutes)

1. **New Firebase project.** At console.firebase.google.com, add a project (e.g. `first40days-app`). Don't reuse `thefirst40days-2656f`.
2. **Firestore.** Build → Firestore Database → Create database (production mode, `us-east1`). Then open **Rules**, paste in `firestore.rules`, and Publish.
3. **Sign-in methods.** Build → Authentication → Get started → Sign-in method. Turn on **Anonymous**, **Email/Password** (with "Email link" too), **Google** and **Apple**. Apple needs an Apple Developer account, so it can wait until Phase 4.
4. **Authorized domains.** Authentication → Settings → Authorized domains. Add `thepatrickreardon-sys.github.io`, or your own domain later.
5. **Web app config.** Project settings → Your apps → add a Web app → copy the `firebaseConfig` values into `config.js`.
6. **Host it.** Put this branch in its own repo (e.g. `first40days-app`) with GitHub Pages turned on. Or tell Claude the new repo name and it'll push there.

## Run the rule tests

```
cd tests
npm i firebase-tools @firebase/rules-unit-testing firebase
npx firebase emulators:exec --only firestore --project demo-f40 "node test.mjs"
```

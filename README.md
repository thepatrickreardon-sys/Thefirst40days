# The First 40 Days: public version (1.0)

Any family can start their own private page and invite helpers with one link. It's kept completely separate from Elena's live app (different branch, different Firebase project).

**Try it now:** open `index.html?demo` (as the mom) or `index.html?demo=helper` (as a helper). Until `config.js` has a Firebase config, the whole app runs in demo mode: everything works, nothing is saved.

## Go live (about 20 minutes)

Everything you need to edit is in **`config.js`**.

1. **New Firebase project.** At console.firebase.google.com, add a project (e.g. `first40days-app`). Don't reuse `thefirst40days-2656f`. Turn Google Analytics off; it isn't needed.
2. **Firestore.** Build → Firestore Database → Create database (production mode, `us-east1`). Open **Rules**, paste in all of `firestore.rules`, and Publish.
3. **Sign-in methods.** Build → Authentication → Get started → Sign-in method. Turn on **Anonymous**, **Email/Password** (and its "Email link" switch) and **Google**. Leave Apple off for now.
4. **Authorized domains.** Authentication → Settings → Authorized domains. Add the address the app will live at (e.g. `thepatrickreardon-sys.github.io`).
5. **Web app config.** Project settings → Your apps → add a Web app → copy the `firebaseConfig` values into `config.js`.
6. **Your details.** In `config.js`, fill in `BUSINESS_NAME`, `BUSINESS_PLACE` and `SUPPORT_EMAIL`. They fill in the Privacy Policy, Terms and footer automatically.
7. **Host it.** Put this branch in its own public repo (e.g. `first40days-app`) with GitHub Pages on. Claude can do this step for you.
8. **Link previews.** Once you know the final address, change `og:image` in `index.html` to the full address (e.g. `https://…/og-image.png`) so texts and social posts show the picture.

## What's in 1.0

- **Start a page in a minute.** Sign in (Google or email + password), enter the mom's name and the due date, and get a private invite link.
- **Getting-started checklist** on the Manage tab: share the link, add the date, add the address, post a first request.
- **Helpers need no account.** A short "how to help" card, sign up with just a name, one-tap add to Google, Outlook or Apple Calendar.
- **Get Ready tab** for before the baby; it hides itself once "Baby has arrived" is checked.
- **Co-managers** by email (partner, sister, doula). They confirm their email, then get the Manage tab.
- **Delete anything:** families delete their page; anyone can delete their account or remove their info.
- **Privacy:** phone numbers and co-manager emails are hidden from helpers; nobody can browse other families.
- Calendar files use the family's time zone, so out-of-town helpers get the right time.
- **Not in 1.0:** payments (it's free) and the auto-updating calendar feed. Both can come later.

## Files

| File | What it is |
|---|---|
| `index.html` | The app |
| `config.js` | **The only file to edit**: Firebase config and your contact details |
| `demo.js` | In-memory sample family for `?demo` links and screenshots |
| `firestore.rules` | Security rules. Paste into Firebase → Firestore → Rules |
| `privacy.html`, `terms.html`, `legal.js` | Privacy Policy and Terms, filled in from `config.js` |
| `tests/` | Security-rule tests, run automatically on GitHub (Actions → App tests) |

// Security tests for the multi-family rules. Run inside the Firestore emulator:
//   cd app && npx firebase emulators:exec --only firestore --project demo-f40 "node --test tests/"
import { test, before, after } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";

let env;
const C = "circleA", CODE = "k".repeat(24);
const now = Date.now();
const real = (uid) => env.authenticatedContext(uid, { firebase: { sign_in_provider: "password" }, email: uid + "@x.com", email_verified: true }).firestore();
const guest = (uid) => env.authenticatedContext(uid, { firebase: { sign_in_provider: "anonymous" } }).firestore();

before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-f40", firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"), host: "127.0.0.1", port: 8080 } });
});
after(async () => { await env.cleanup(); });

async function makeCircle(db, uid = "owner", c = C) {
  const b = writeBatch(db);
  b.set(doc(db, `circles/${c}`), { name: "Ana's circle", ownerUid: uid, managers: [uid], plan: "trial", createdAt: now });
  b.set(doc(db, `circles/${c}/secrets/invite`), { code: CODE });
  b.set(doc(db, `circles/${c}/members/${uid}`), { name: "Ana", role: "owner", joinedAt: now });
  b.set(doc(db, `circles/${c}/settings/main`), { mom: "Ana", family: "Ana · Ben · baby" });
  return b.commit();
}
const join = (db, uid, code = CODE, role = "helper", c = C) =>
  setDoc(doc(db, `circles/${c}/members/${uid}`), { name: "Helper " + uid, role, code, joinedAt: now });

test("guests (no email account) cannot create a circle", async () => {
  await assertFails(makeCircle(guest("g0"), "g0", "gcircle"));
});

test("an owner can create a circle in one batch", async () => {
  await assertSucceeds(makeCircle(real("owner")));
});

test("a new circle cannot start as paid or with extra managers", async () => {
  const db = real("o2");
  await assertFails(setDoc(doc(db, "circles/c2"), { name: "x", ownerUid: "o2", managers: ["o2"], plan: "paid", createdAt: now }));
  await assertFails(setDoc(doc(db, "circles/c3"), { name: "x", ownerUid: "o2", managers: ["o2", "someone"], plan: "trial", createdAt: now }));
  await assertFails(setDoc(doc(db, "circles/c4"), { name: "x", ownerUid: "someone", managers: ["someone"], plan: "trial", createdAt: now }));
});

test("strangers cannot see anything in the circle", async () => {
  const db = guest("stranger");
  await assertFails(getDoc(doc(db, `circles/${C}`)));
  await assertFails(getDoc(doc(db, `circles/${C}/settings/main`)));
  await assertFails(getDoc(doc(db, `circles/${C}/members/owner`)));
  await assertFails(getDoc(doc(db, `circles/${C}/secrets/invite`)));
  await assertFails(setDoc(doc(db, `circles/${C}/people/stranger`), { name: "x", items: [], updatedAt: now }));
});

test("joining needs the right invite code, and only as a helper", async () => {
  await assertFails(join(guest("h1"), "h1", "wrong-code-wrong-code-123"));
  await assertFails(join(guest("h1"), "h1", CODE, "owner"));
  await assertFails(join(guest("h1"), "h1", CODE, "manager"));
  await assertFails(join(guest("h1"), "someone-else"));
  await assertSucceeds(join(guest("h1"), "h1"));
  await assertSucceeds(join(guest("h2"), "h2"));
});

test("helpers can read the schedule but not the invite code or manager stuff", async () => {
  const db = guest("h1");
  await assertSucceeds(getDoc(doc(db, `circles/${C}`)));
  await assertSucceeds(getDoc(doc(db, `circles/${C}/settings/main`)));
  await assertFails(getDoc(doc(db, `circles/${C}/secrets/invite`)));
  await assertFails(setDoc(doc(db, `circles/${C}/settings/main`), { mom: "Hacked" }));
  await assertFails(setDoc(doc(db, `circles/${C}/needs/n1`), { cat: "meal", date: "2026-12-01" }));
  await assertFails(updateDoc(doc(db, `circles/${C}`), { managers: ["owner", "h1"] }));
  await assertFails(updateDoc(doc(db, `circles/${C}/members/h1`), { role: "owner" }));
  await assertSucceeds(updateDoc(doc(db, `circles/${C}/members/h1`), { name: "Aunt Maria" }));
});

test("helpers change only their own sign-ups, with checked data", async () => {
  const db = guest("h1");
  await assertSucceeds(setDoc(doc(db, `circles/${C}/people/h1`), { name: "Aunt Maria", items: [{ id: "a", date: "2026-12-01" }], updatedAt: now }));
  await assertFails(setDoc(doc(db, `circles/${C}/people/h2`), { name: "Not me", items: [], updatedAt: now }));
  await assertFails(setDoc(doc(db, `circles/${C}/people/h1`), { name: "x", items: [], updatedAt: now, admin: true }));
  await assertFails(setDoc(doc(db, `circles/${C}/people/h1`), { name: "x".repeat(61), items: [], updatedAt: now }));
  await assertFails(setDoc(doc(db, `circles/${C}/people/h1`), { name: "x", items: Array(201).fill({}), updatedAt: now }));
  await assertFails(deleteDoc(doc(guest("h2"), `circles/${C}/people/h1`)));
});

test("phone numbers are private to the person and the managers", async () => {
  await assertSucceeds(setDoc(doc(guest("h1"), `circles/${C}/contacts/h1`), { phone: "555-0100" }));
  await assertFails(getDoc(doc(guest("h2"), `circles/${C}/contacts/h1`)));
  await assertSucceeds(getDoc(doc(guest("h1"), `circles/${C}/contacts/h1`)));
  await assertSucceeds(getDoc(doc(real("owner"), `circles/${C}/contacts/h1`)));
  await assertFails(setDoc(doc(guest("stranger"), `circles/${C}/contacts/stranger`), { phone: "1" }));
});

test("managers run the circle but can't change the owner or the plan", async () => {
  const db = real("owner");
  await assertSucceeds(setDoc(doc(db, `circles/${C}/needs/n1`), { cat: "laundry", title: "Fold laundry", date: "2026-12-01", start: "10:00", dur: 60, spots: 1, priority: true, note: "", at: now }));
  await assertFails(setDoc(doc(db, `circles/${C}/needs/n2`), { cat: "laundry", date: "2026-12-01", hacked: 1 }));
  await assertFails(updateDoc(doc(db, `circles/${C}`), { plan: "paid" }));
  await assertFails(updateDoc(doc(db, `circles/${C}`), { ownerUid: "h1" }));
  await assertFails(updateDoc(doc(db, `circles/${C}`), { managers: ["h1"] }));
  await assertSucceeds(updateDoc(doc(db, `circles/${C}`), { managers: ["owner", "h1"] }));
  // h1 is now a manager
  await assertSucceeds(setDoc(doc(guest("h1"), `circles/${C}/settings/main`), { mom: "Ana", welcome: "Thank you!" }));
  await assertSucceeds(getDoc(doc(guest("h1"), `circles/${C}/secrets/invite`)));
  await assertSucceeds(setDoc(doc(guest("h1"), `circles/${C}/people/h2`), { name: "Helper h2", items: [], updatedAt: now }));
});

test("the owner can't be removed; managers can remove helpers", async () => {
  await assertFails(deleteDoc(doc(real("owner"), `circles/${C}/members/owner`)));
  await assertFails(deleteDoc(doc(guest("h2"), `circles/${C}/members/h1`)));
  await assertSucceeds(deleteDoc(doc(real("owner"), `circles/${C}/members/h2`)));
  await assertFails(getDoc(doc(guest("h2"), `circles/${C}/settings/main`)));
});

test("a new invite code shuts out the old link", async () => {
  await assertSucceeds(setDoc(doc(real("owner"), `circles/${C}/secrets/invite`), { code: "n".repeat(24) }));
  await assertFails(join(guest("h3"), "h3", CODE));
  await assertSucceeds(join(guest("h3"), "h3", "n".repeat(24)));
});

test("each person's circle list is theirs alone", async () => {
  await assertSucceeds(setDoc(doc(guest("h1"), "users/h1"), { circles: [C], updatedAt: now }));
  await assertFails(getDoc(doc(guest("h2"), "users/h1")));
  await assertFails(setDoc(doc(guest("h2"), "users/h1"), { circles: [], updatedAt: now }));
});

test("one family can't see another family's circle", async () => {
  await assertSucceeds(makeCircle(real("otherOwner"), "otherOwner", "circleB"));
  await assertFails(getDoc(doc(guest("h1"), "circles/circleB/settings/main")));
  await assertFails(getDoc(doc(real("owner"), "circles/circleB")));
  await assertFails(join(guest("h1"), "h1", CODE, "helper", "circleB"));
});

// In-memory stand-in for Firebase, used for ?demo links, screenshots and testing.
// Nothing here is saved: reload the page and it starts fresh.
export function makeDemo(asHelper) {
  const store = new Map();           // path -> data
  const listeners = new Set();       // functions re-run after every write
  const clone = o => JSON.parse(JSON.stringify(o));
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };

  // ---- sample family ----
  const F = "families/demo";
  const me = asHelper
    ? { uid: "demo-helper", isAnonymous: true, email: null, emailVerified: false, providerData: [], displayName: "" }
    : { uid: "demo-parent", isAnonymous: false, email: "maya@example.com", emailVerified: true, providerData: [], displayName: "Maya" };
  store.set(F, { name: "Maya & Sam", ownerUids: ["demo-parent"], ownerEmails: ["maya@example.com"], createdAt: Date.now() });
  store.set(F + "/settings/main", {
    startDate: day(-6), born: true, babyName: "June", momName: "Maya", partnerName: "Sam", kidName: "Theo",
    family: "Maya · Sam · Theo · baby June", welcome: "Thank you for helping us through these first weeks. Every meal, load of laundry and hour with Theo means the world.",
    address: "12 Example Lane", visitNotes: "Please wash your hands when you arrive.\nIf you're feeling even a little sick, please sit this one out.",
    kidNotes: "Theo naps 1–3 pm. He loves the swings at Elm Park and anything with trucks.",
    meals: { enabled: true, types: ["dinner"], every: 1, dropoff: "Between 5 and 6 pm", household: "2 adults and a 3-year-old",
      allergies: "No peanuts, please.", loves: "Soups, curries, anything with rice", avoid: "Very spicy food", instructions: "Leave it in the cooler by the door and send a text." }
  });
  const needs = [
    { id: "n1", cat: "baby", title: "Hold June so Maya can nap", date: day(0), start: "13:00", dur: 120, spots: 1, priority: true, note: "" },
    { id: "n2", cat: "laundry", title: "", date: day(1), start: "10:00", dur: 90, spots: 1, priority: false, note: "Machine is in the basement." },
    { id: "n3", cat: "kid", title: "Park with Theo", date: day(2), start: "10:00", dur: 120, spots: 1, priority: false, note: "" },
    { id: "n4", cat: "cleaning", title: "Kitchen reset", date: day(3), start: "11:00", dur: 60, spots: 2, priority: true, note: "" }
  ];
  needs.forEach(({ id, ...n }) => store.set(F + "/needs/" + id, n));
  store.set(F + "/people/p-ana", { name: "Aunt Ana", updatedAt: Date.now(), items: [
    { id: "i1", kind: "meal", mealType: "dinner", date: day(0), start: "17:30", dur: 30, dish: "Chicken & rice soup", note: "" },
    { id: "i2", kind: "help", cat: "kid", title: "Library with Theo", date: day(1), start: "09:30", dur: 120, note: "" }] });
  store.set(F + "/people/p-jo", { name: "Jo (neighbor)", updatedAt: Date.now(), items: [
    { id: "i3", kind: "meal", mealType: "dinner", date: day(1), start: "17:30", dur: 30, dish: "Veggie lasagna", note: "Contains dairy" },
    { id: "i4", kind: "help", needId: "n4", cat: "cleaning", title: "Kitchen reset", date: day(3), start: "11:00", dur: 60, note: "" }] });
  store.set(F + "/contacts/p-ana", { phone: "555-0101" });

  // ---- tiny Firestore look-alike ----
  const notify = () => setTimeout(() => listeners.forEach(f => f()), 0);
  const snapDoc = p => { const v = store.get(p); return { id: p.split("/").pop(), exists: v !== undefined, data: () => clone(v), metadata: {} }; };
  const childrenOf = p => [...store.keys()].filter(k => k.startsWith(p + "/") && !k.slice(p.length + 1).includes("/"));
  const snapColl = p => ({ docs: childrenOf(p).map(snapDoc), metadata: {} });
  const watch = (fn, next) => { const f = () => { try { next(fn()); } catch (e) { console.warn(e); } }; listeners.add(f); setTimeout(f, 0); return () => listeners.delete(f); };
  const db = {
    doc: p => ({
      set: async d => { store.set(p, clone(d)); notify(); },
      update: async d => { store.set(p, { ...(store.get(p) || {}), ...clone(d) }); notify(); },
      delete: async () => { store.delete(p); notify(); },
      get: async () => snapDoc(p),
      onSnapshot: next => watch(() => snapDoc(p), next)
    }),
    collection: p => ({ onSnapshot: next => watch(() => snapColl(p), next), get: async () => snapColl(p) }),
    query: (p, field, val) => ({ get: async () => ({ docs: childrenOf(p).map(snapDoc).filter(d => (d.data()[field] || []).includes(val)), metadata: {} }) })
  };

  // ---- auth look-alike ----
  let user = me; const authCbs = new Set();
  const fire = () => setTimeout(() => authCbs.forEach(cb => cb(user)), 0);
  const signedIn = email => { user = { uid: user.uid, isAnonymous: false, email, emailVerified: true, providerData: [], displayName: "" }; fire(); return { created: false }; };
  const auth = {
    current: () => user,
    onChange: cb => { authCbs.add(cb); setTimeout(() => cb(user), 0); return () => authCbs.delete(cb); },
    guest: async () => { user = { uid: "demo-guest", isAnonymous: true, email: null, providerData: [] }; fire(); },
    google: async () => signedIn("you@gmail.com"),
    apple: async () => signedIn("you@icloud.com"),
    sendLink: async () => {}, finishLink: async () => false,
    password: async email => signedIn(email),
    setPassword: async () => {}, reset: async () => {}, verify: async () => {},
    reload: async () => user,
    deleteAccount: async () => { user = null; fire(); },
    signOut: async () => { user = null; fire(); }
  };
  return { db, auth };
}

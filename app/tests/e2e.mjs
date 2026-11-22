// End-to-end: the real app against the Firebase emulators.
// Owner starts a circle -> helper joins with the invite link and signs up -> stranger is shut out
// -> new invite link turns off the old one -> owner deletes the circle.
import http from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { chromium } from "playwright";

const ROOT = new URL("..", import.meta.url).pathname, PORT = 5173, SHOTS = join(ROOT, "shots");
await mkdir(SHOTS, { recursive: true });
const types = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".webmanifest": "application/manifest+json" };
http.createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  try { const b = await readFile(join(ROOT, p === "/" ? "index.html" : p)); res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
}).listen(PORT);

const BASE = `http://127.0.0.1:${PORT}/index.html?emu=1`;
const browser = await chromium.launch();
let failures = 0, step = 0;
async function check(name, fn) {
  try { await fn(); console.log("ok  -", name); }
  catch (e) { failures++; console.log("FAIL-", name, "\n     ", String(e.message || e).split("\n")[0]); }
}
async function phone() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); page.errors = [];
  page.on("pageerror", e => page.errors.push(String(e)));
  page.on("dialog", d => d.dismiss());
  return page;
}
const shot = (page, n) => page.screenshot({ path: join(SHOTS, `${String(++step).padStart(2, "0")}-${n}.png`), fullPage: false });
const tab = (page, t) => page.click(`#tabs [data-tab=${t}]`);

const owner = await phone();
await owner.goto(BASE);
let invite = "";
await check("landing page shows", async () => { await owner.getByText("Start a circle for a new mom").waitFor({ timeout: 20000 }); await shot(owner, "landing"); });
await check("owner makes an account and starts a circle", async () => {
  await owner.click("[data-act=startsetup]");
  await owner.fill("form[data-form=pw] input[name=email]", "ana@example.com");
  await owner.fill("form[data-form=pw] input[name=pw]", "secret123");
  await owner.click("form[data-form=pw] [type=submit]");
  await owner.locator("form[data-form=newcircle]").waitFor({ timeout: 15000 });
  await owner.fill("input[name=mom]", "Ana"); await owner.fill("input[name=partner]", "Ben"); await owner.fill("input[name=kid]", "Lily");
  await owner.fill("input[name=startDate]", "2027-01-10"); await owner.fill("input[name=dueText]", "in early January");
  await owner.fill("input[name=allergies]", "No peanuts please"); await owner.fill("input[name=yourName]", "Ana");
  await shot(owner, "setup");
  await owner.click("form[data-form=newcircle] [type=submit]");
  await owner.getByText("Your circle is ready").waitFor({ timeout: 15000 });
  invite = (await owner.locator("#sheet .invite-box").innerText()).trim();
  await shot(owner, "ready");
  await owner.click("#sheet [data-act=close]");
  if (!/#c=.+&k=.{24}$/.test(invite)) throw new Error("bad invite link " + invite);
  await shot(owner, "manage-invite");
});
await check("the app speaks the family's names", async () => {
  await tab(owner, "prep"); await owner.getByText("Hang Out With Lily").first().waitFor();
  await owner.getByText("Give Ben a Hand With the Yard").first().waitFor();
  await tab(owner, "home"); await owner.getByText("Baby is expected in early January").waitFor();
  await shot(owner, "home");
});

const helper = await phone();
await check("helper joins with the invite link", async () => {
  await helper.goto(invite);
  await helper.getByText("You’re invited to help").waitFor({ timeout: 20000 });
  await helper.fill("form[data-form=join] input[name=pname]", "Aunt Maria");
  await shot(helper, "join");
  await helper.click("form[data-form=join] [type=submit]");
  await helper.locator("#tabs [data-tab=home]").waitFor({ timeout: 15000 });
  if (await helper.locator("#tabs [data-tab=elena]").count()) throw new Error("helper should not see Manage");
});
await check("helper signs up to stock the freezer", async () => {
  await tab(helper, "prep");
  await helper.click("#prep-freezer [data-o=dropoff]");
  await helper.click("[data-act=pickdish] >> nth=1");
  await helper.fill("form[data-form=prep] input[name=pname]", "Aunt Maria");
  await helper.click("form[data-form=prep] [type=submit]");
  await helper.locator(".success").waitFor({ timeout: 15000 });
  await shot(helper, "signed-up");
  await helper.click(".success [data-act=close]");
});
await check("owner sees the helper's sign-up and can make her a manager", async () => {
  await tab(owner, "elena");
  await owner.getByText("Drop off a freezer meal").first().waitFor({ timeout: 15000 });
  await owner.locator(".row", { hasText: "Aunt Maria" }).locator("[data-act=togglemgr]").click();
  await helper.locator("#tabs [data-tab=elena]").waitFor({ timeout: 15000 });
  await shot(owner, "people");
  await owner.locator(".row", { hasText: "Aunt Maria" }).locator("[data-act=togglemgr]").click();
  await helper.locator("#tabs [data-tab=elena]").waitFor({ state: "detached", timeout: 15000 });
});

const stranger = await phone();
await check("a stranger with the circle address but no code is shut out", async () => {
  await stranger.goto(invite.replace(/&k=.*/, ""));
  await stranger.getByText("This circle is private").waitFor({ timeout: 20000 });
  await shot(stranger, "private");
});
await check("a new invite link turns off the old one", async () => {
  await tab(owner, "elena");
  await owner.click("[data-act=newinvite]");
  await owner.waitForFunction(old => !document.querySelector(".invite-box").innerText.includes(old), invite.split("&k=")[1]);
  const late = await phone();
  await late.goto(invite);
  await late.getByText("You’re invited to help").waitFor({ timeout: 20000 });
  await late.fill("form[data-form=join] input[name=pname]", "Late Larry");
  await late.click("form[data-form=join] [type=submit]");
  await late.getByText("doesn't work anymore").waitFor({ timeout: 15000 });
});
await check("owner deletes the circle and everyone loses access", async () => {
  await owner.click("[data-act=askdelcircle]");
  await owner.fill("form[data-form=delcircle] input[name=confirm]", "DELETE");
  await owner.click("form[data-form=delcircle] [type=submit]");
  await owner.getByText("Start a circle for a new mom").waitFor({ timeout: 20000 });
  await helper.getByText("This circle is private").waitFor({ timeout: 20000 });
  await shot(helper, "after-delete");
});
for (const [n, p] of [["owner", owner], ["helper", helper], ["stranger", stranger]])
  if (p.errors.length) { failures++; console.log("FAIL- page errors on", n, p.errors.slice(0, 3)); }
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
await browser.close(); process.exit(failures ? 1 : 0);

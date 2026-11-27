// Fills the Privacy Policy and Terms in from config.js, so there's only one place to edit.
import * as C from "./config.js";
const v = { business: C.BUSINESS_NAME || "", place: C.BUSINESS_PLACE || "", email: C.SUPPORT_EMAIL || "" };
document.querySelectorAll("[data-fill]").forEach(el => {
  const k = el.dataset.fill, val = v[k];
  if (!val) { el.classList.add("missing"); return; }
  if (k === "email") { el.innerHTML = ""; const a = document.createElement("a"); a.href = "mailto:" + val; a.textContent = val; el.appendChild(a); }
  else el.textContent = val;
});
const d = document.querySelector(".draft");
if (d && v.business && v.email) d.remove();

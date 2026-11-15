#!/usr/bin/env python3
"""Build The First 40 Days calendar feed.

Usage: python3 build_ics.py data.json
data.json = {"settings": {...settings/main doc...}, "needs": [{"id":..., ...}], "people": [{"id": uid, "data": {...}}]}
(exported from The First 40 Days app's database). Writes feed/<token>.ics.
Phone numbers, the home address and allergy notes are deliberately left out:
this file is public.
"""
import json, sys, os, hashlib
from datetime import datetime, timedelta, timezone

TOKEN = "aR5SXx0iAMyxzaGMWc4VX44y"
ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "feed", TOKEN + ".ics")
JSON_OUT = os.path.join(ROOT, "schedule.json")

CATS = {
    "talulah": "Time with Talulah", "tallulah": "Time with Talulah", "baby": "Hold the baby",
    "laundry": "Laundry", "cleaning": "Tidy & clean", "cook": "Cook a meal here",
    "serve": "Serve a meal", "errands": "Groceries & errands", "company": "Hang out",
    "night": "Early or late help", "other": "Something else",
}
MEALS = {"breakfast": "Breakfast", "lunch": "Lunch", "dinner": "Dinner"}

VTZ = """BEGIN:VTIMEZONE
TZID:America/New_York
BEGIN:DAYLIGHT
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
TZNAME:EDT
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
TZNAME:EST
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
END:VTIMEZONE""".split("\n")


def esc(t):
    return str(t or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\r\n", "\\n").replace("\n", "\\n")


def fold(line):
    out, cur, n = [], "", 0
    for ch in line:
        b = len(ch.encode("utf-8"))
        if n + b > 73:
            out.append(cur); cur, n = " " + ch, 1 + b
        else:
            cur += ch; n += b
    out.append(cur)
    return "\r\n".join(out)


def local(date, time):
    d = datetime.strptime(f"{date} {time or '17:00'}", "%Y-%m-%d %H:%M")
    return d


def stamp(d):
    return d.strftime("%Y%m%dT%H%M%S")


def event(uid, title, date, start, dur, desc, mod):
    s = local(date, start)
    e = s + timedelta(minutes=int(dur or 60))
    seq = int(hashlib.md5((title + date + str(start) + str(dur) + desc).encode()).hexdigest()[:6], 16) % 100000
    lines = [
        "BEGIN:VEVENT", f"UID:{uid}@first40days", f"DTSTAMP:{mod}", f"LAST-MODIFIED:{mod}", f"SEQUENCE:{seq}",
        f"DTSTART;TZID=America/New_York:{stamp(s)}", f"DTEND;TZID=America/New_York:{stamp(e)}",
        "SUMMARY:" + esc(title),
    ]
    if desc:
        lines.append("DESCRIPTION:" + esc(desc))
    lines += ["BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + esc(title), "TRIGGER:-PT1H", "END:VALARM", "END:VEVENT"]
    return lines


def main(path):
    data = json.load(open(path))
    needs = data.get("needs") or []
    people = data.get("people") or []
    mod = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    settings = data.get("settings") or {}
    events, claimed, pub = [], {}, []
    for p in people:
        d = p.get("data") or {}
        name = (d.get("name") or "A helper").strip()
        first = name.split()[0] if name else "A helper"
        for i in d.get("items") or []:
            if i.get("needId"):
                claimed[i["needId"]] = claimed.get(i["needId"], 0) + 1
            if i.get("kind") == "meal":
                meal = MEALS.get(i.get("mealType"), "Meal")
                title = f"🥘 {first}: {meal}" + (f" — {i['dish']}" if i.get("dish") else "")
                desc = "\n".join(x for x in [f"{name} is bringing {meal.lower()}.", f"Dish: {i['dish']}" if i.get("dish") else "", f"Note: {i['note']}" if i.get("note") else "", "From The First 40 Days"] if x)
                events.append(event(i["id"], title, i["date"], i.get("start") or "17:00", i.get("dur") or 30, desc, mod))
                pub.append({"id": i["id"], "kind": "meal", "date": i["date"], "start": i.get("start") or "17:00", "dur": 30, "meal": i.get("mealType") or "dinner", "dish": i.get("dish") or "", "who": first})
            else:
                label = i.get("title") or CATS.get(i.get("cat"), "Helping out")
                desc = "\n".join(x for x in [f"{name}: {CATS.get(i.get('cat'), 'Helping out')}", f"Note: {i['note']}" if i.get("note") else "", "From The First 40 Days"] if x)
                events.append(event(i["id"], f"{first}: {label}", i["date"], i.get("start"), i.get("dur") or 60, desc, mod))
                cat = "talulah" if i.get("cat") == "tallulah" else (i.get("cat") or "other")
                pub.append({"id": i["id"], "kind": "help", "date": i["date"], "start": i.get("start") or "10:00", "dur": int(i.get("dur") or 60), "cat": cat, "label": label, "who": first})
    for n in needs:
        if claimed.get(n["id"], 0) >= int(n.get("spots") or 1):
            continue
        label = n.get("title") or CATS.get(n.get("cat"), "Help needed")
        title = ("★ " if n.get("priority") else "") + "Open: " + label
        desc = "\n".join(x for x in ["Elena asked for help with this. Sign up in The First 40 Days app.", f"Note: {n['note']}" if n.get("note") else ""] if x)
        events.append(event("need-" + n["id"], title, n["date"], n.get("start"), n.get("dur") or 60, desc, mod))
        cat = "talulah" if n.get("cat") == "tallulah" else (n.get("cat") or "other")
        pub.append({"id": "need-" + n["id"], "kind": "open", "date": n["date"], "start": n.get("start") or "10:00", "dur": int(n.get("dur") or 60), "cat": cat, "label": label, "priority": bool(n.get("priority")), "spots": int(n.get("spots") or 1) - claimed.get(n["id"], 0)})

    cal = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//The First 40 Days//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
           "X-WR-CALNAME:The First 40 Days", "X-WR-TIMEZONE:America/New_York",
           "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H", *VTZ]
    for e in sorted(events, key=lambda x: x[5]):
        cal += e
    cal.append("END:VCALENDAR")
    body = "\r\n".join(fold(l) for l in cal) + "\r\n"

    # Only rewrite when the events changed (ignore the timestamps) so the repo isn't spammed with commits.
    def strip(t):
        return "\n".join(l for l in t.splitlines() if not l.startswith(("DTSTAMP", "LAST-MODIFIED")))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    changed = False
    if not (os.path.exists(OUT) and strip(open(OUT, encoding="utf-8", newline="").read()) == strip(body)):
        with open(OUT, "w", encoding="utf-8", newline="") as f:
            f.write(body)
        changed = True

    # Public page data. Deliberately no phone numbers, address or allergy notes.
    meals = settings.get("meals") or {}
    page = {
        "startDate": settings.get("startDate") or "",
        "born": bool(settings.get("born")),
        "babyName": settings.get("babyName") or "",
        "family": settings.get("family") or "",
        "welcome": settings.get("welcome") or "",
        "visitNotes": settings.get("visitNotes") or "",
        "meals": {"enabled": meals.get("enabled", True), "types": meals.get("types") or ["dinner"],
                  "every": int(meals.get("every") or 1), "dropoff": meals.get("dropoff") or ""},
        "events": sorted(pub, key=lambda e: (e["date"], e["start"])),
    }
    old = None
    if os.path.exists(JSON_OUT):
        try:
            old = json.load(open(JSON_OUT, encoding="utf-8"))
            old.pop("updated", None)
        except Exception:
            old = None
    if old != page:
        page["updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        with open(JSON_OUT, "w", encoding="utf-8") as f:
            json.dump(page, f, ensure_ascii=False, indent=1)
        changed = True
    print(("updated" if changed else "unchanged") + f" ({len(events)} events)")


if __name__ == "__main__":
    main(sys.argv[1])

#!/usr/bin/env python3
"""Read the app's public data from Firestore (REST, no login) and write data.json for build_ics.py."""
import json, sys, urllib.request
BASE = "https://firestore.googleapis.com/v1/projects/thefirst40days-2656f/databases/(default)/documents/"

def val(v):
    if "stringValue" in v: return v["stringValue"]
    if "integerValue" in v: return int(v["integerValue"])
    if "doubleValue" in v: return v["doubleValue"]
    if "booleanValue" in v: return v["booleanValue"]
    if "nullValue" in v: return None
    if "arrayValue" in v: return [val(x) for x in v["arrayValue"].get("values", [])]
    if "mapValue" in v: return {k: val(x) for k, x in v["mapValue"].get("fields", {}).items()}
    if "timestampValue" in v: return v["timestampValue"]
    return None

def get(path):
    with urllib.request.urlopen(BASE + path, timeout=30) as r:
        return json.load(r)

def coll(name):
    out, token = [], ""
    while True:
        j = get(f"{name}?pageSize=300" + (f"&pageToken={token}" if token else ""))
        for d in j.get("documents", []):
            out.append({"id": d["name"].rsplit("/", 1)[1], "data": {k: val(x) for k, x in d.get("fields", {}).items()}})
        token = j.get("nextPageToken")
        if not token:
            return out

try:
    settings = {k: val(x) for k, x in get("settings/main").get("fields", {}).items()}
except Exception:
    settings = {}
needs = [{"id": d["id"], **d["data"]} for d in coll("needs")]
people = coll("people")
json.dump({"settings": settings, "needs": needs, "people": people}, open(sys.argv[1], "w"))
print(f"{len(needs)} requests, {len(people)} helpers")

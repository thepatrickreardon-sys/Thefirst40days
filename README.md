# The First 40 Days — calendar feed

Hosts the subscribable calendar feed for The First 40 Days app (Elena's postpartum support schedule).

- `feed/<name>.ics` — the calendar file. Subscribe to its GitHub Pages link in Apple Calendar or Google Calendar.
- `build_ics.py` — rebuilds the feed from the app's data. A scheduled Claude task runs it every couple of hours and pushes changes.

Phone numbers, the home address and allergy notes are intentionally left out because this feed is public.

"""Save a copy of the live data the site shows, for when those feeds are down.

    python tools/snapshot.py

Writes assets/snapshot.json: the GitHub calendar (home page) and the F1 standings (~/life),
exactly as the live APIs return them. The pages always try the live feed first; a visitor's
browser also keeps the last good answer it saw. This file is only the floor under both, shown
with an "as of" date. Run it before each deploy so that date stays recent.
"""
import datetime
import json
import os
import urllib.request

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GH = 'https://github-contributions-api.jogruber.de/v4/swilled'
F1 = 'https://api.jolpi.ca/ergast/f1'
year = datetime.date.today().year


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'portfolio-snapshot'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


snap = {
    'taken': datetime.date.today().isoformat(),
    'github': {'last': get(f'{GH}?y=last'), 'year': get(f'{GH}?y={year}')},
    'f1': {
        'cur': get(f'{F1}/current/driverStandings.json'),
        'next': get(f'{F1}/current/next.json'),
        'prev': get(f'{F1}/2025/driverStandings.json'),
    },
}
out = os.path.join(root, 'assets', 'snapshot.json')
with open(out, 'w', encoding='utf-8') as f:
    json.dump(snap, f, separators=(',', ':'))
print(f'{out}: {os.path.getsize(out) // 1024} KB, taken {snap["taken"]}')

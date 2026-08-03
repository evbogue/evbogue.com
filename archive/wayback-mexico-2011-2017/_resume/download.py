#!/usr/bin/env python3
import json, os, re, sys, time, urllib.request, urllib.error

PLAN = sys.argv[1]
OUT  = sys.argv[2]            # archive/wayback-mexico-2011-2017
LOG  = sys.argv[3]
DELAY = 0.7

plan = json.load(open(PLAN))

def slugdir(path):
    if path == '/':
        return None                      # homepage handled separately
    s = path.strip('/').replace('/', '__')
    s = re.sub(r'[^A-Za-z0-9._\-]', '_', s)
    return s[:120] or 'index'

def log(msg):
    with open(LOG, 'a') as f:
        f.write(msg + '\n')

os.makedirs(os.path.join(OUT, 'homepage'), exist_ok=True)
os.makedirs(os.path.join(OUT, 'pages'), exist_ok=True)

manifest = []
total = len(plan)
ok = skip = fail = 0
log(f"START {time.ctime()}  {total} versions to fetch")

for i, e in enumerate(plan, 1):
    ts = e['first_ts']
    path = e['path']
    sd = slugdir(path)
    if sd is None:
        rel = os.path.join('homepage', f"{ts}.html")
    else:
        os.makedirs(os.path.join(OUT, 'pages', sd), exist_ok=True)
        rel = os.path.join('pages', sd, f"{ts}.html")
    dest = os.path.join(OUT, rel)
    rec = {'path': path, 'file': rel, 'first_ts': ts,
           'timestamps': e['timestamps'], 'digest': e['digest'],
           'original': e['original'],
           'wayback_url': f"https://web.archive.org/web/{ts}/{e['original']}"}

    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        skip += 1; rec['status'] = 'skipped-exists'; manifest.append(rec); continue

    url = f"https://web.archive.org/web/{ts}id_/{e['original']}"
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'evbogue-archive-recovery/1.0'})
            with urllib.request.urlopen(req, timeout=45) as r:
                data = r.read()
            with open(dest, 'wb') as f:
                f.write(data)
            ok += 1; rec['status'] = 'ok'; rec['bytes'] = len(data)
            break
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError) as ex:
            if attempt == 2:
                fail += 1; rec['status'] = f'fail:{ex}'
                log(f"FAIL {path} {ts} :: {ex}")
            else:
                time.sleep(2 * (attempt + 1))
    manifest.append(rec)
    if i % 100 == 0:
        log(f"  {i}/{total}  ok={ok} skip={skip} fail={fail}")
        json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
    time.sleep(DELAY)

json.dump({'generatedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
           'window': '2011-2017 (Mexico years)',
           'source': 'wayback-cdx evbogue.com* collapse=digest',
           'totalVersions': total, 'ok': ok, 'skipped': skip, 'failed': fail,
           'records': manifest},
          open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
log(f"DONE {time.ctime()}  ok={ok} skip={skip} fail={fail}")

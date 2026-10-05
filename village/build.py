#!/usr/bin/env python3
"""Assemble village/dist/index.html : le moteur (index.src.html) + le snapshot
de données + les sprites encodés en data URI. Le résultat n'est pas commité
(données personnelles et assets sous licence) : il sert à publier l'artifact.
Usage : python3 build.py [snapshot.json] [out.html]
"""
import base64, json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
snap_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, 'data', 'snapshot.json')
out_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, 'dist', 'index.html')
src = open(os.path.join(here, 'index.src.html'), encoding='utf-8').read()
snap = json.load(open(snap_path, encoding='utf-8')) if os.path.exists(snap_path) else {}
wpath = os.path.join(here, 'data', 'weather.json')
if os.path.exists(wpath) and 'weather' not in snap:
    snap['weather'] = json.load(open(wpath, encoding='utf-8'))
data = json.dumps(snap, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
assets = {}
for name, fn in [('atlas', 'atlas.png'), ('water', 'water.png'), ('fire', 'campfire.png'), ('chests', 'chests.png'), ('icons1', 'icons1.png'), ('icons2', 'icons2.png')]:
    p = os.path.join(here, 'assets', fn)
    if os.path.exists(p):
        assets[name] = 'data:image/png;base64,' + base64.b64encode(open(p, 'rb').read()).decode()
    else:
        assets[name] = 'assets/' + fn
html = src.replace('/*__DATA__*/', data, 1)
start = html.index('/*__ASSETS__*/')
end = html.index('/*__ASSETS_END__*/', start)
html = html[:start] + '/*__ASSETS__*/ ' + json.dumps(assets) + ' ' + html[end:]
os.makedirs(os.path.dirname(out_path), exist_ok=True)
open(out_path, 'w', encoding='utf-8').write(html)
print('wrote', out_path, round(os.path.getsize(out_path) / 1024), 'KB')

#!/usr/bin/env python3
"""Assemble dist/index.html : la page (index.src.html) + le snapshot de données
(data/snapshot.json, non versionné) et la météo (data/weather.json si présente).
Usage : python3 build.py
"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'index.src.html'), encoding='utf-8').read()
snap_path = os.path.join(HERE, 'data', 'snapshot.json')
data = json.load(open(snap_path, encoding='utf-8')) if os.path.exists(snap_path) else {}
for name in ('weather', 'youtube'):
    wpath = os.path.join(HERE, 'data', name + '.json')
    if os.path.exists(wpath):
        try: data[name] = json.load(open(wpath, encoding='utf-8'))
        except Exception as e: print(name, 'ignoré :', e)
payload = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
out = src.replace('/*__DATA__*/{}', payload, 1)
# sprites (dossier assets/, non versionné) en data URI
import base64, glob
assets = {}
for f in sorted(glob.glob(os.path.join(HERE, 'assets', '*.png'))):
    assets[os.path.splitext(os.path.basename(f))[0]] = 'data:image/png;base64,' + base64.b64encode(open(f, 'rb').read()).decode('ascii')
out = out.replace('/*__ASSETS__*/{}', json.dumps(assets), 1)
if not assets: print('attention : aucun sprite dans assets/, la scène restera vide')
# la page « Novembre, la partie » (dossier novembre/, non versionné : contenu personnel), embarquée telle quelle dans un cadre à droite
nov_path = os.path.join(HERE, 'novembre', 'index.html')
nov = open(nov_path, encoding='utf-8').read() if os.path.exists(nov_path) else ''
if nov:
    boot = '<script>try { if (window.parent && window.parent !== window && window.parent.claude) window.claude = window.parent.claude; } catch (e) {}</script>'
    nov = nov.replace('<body>', '<body>' + boot, 1) if '<body>' in nov else boot + nov
out = out.replace('/*__NOV__*/""', json.dumps(nov, ensure_ascii=False).replace('</', '<\\/'), 1)
if not nov: print('attention : novembre/index.html absent, le cadre de droite restera vide')
os.makedirs(os.path.join(HERE, 'dist'), exist_ok=True)
dest = os.path.join(HERE, 'dist', 'index.html')
open(dest, 'w', encoding='utf-8').write(out)
print('écrit', dest, len(out) // 1024, 'Ko')

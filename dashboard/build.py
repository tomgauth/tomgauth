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
os.makedirs(os.path.join(HERE, 'dist'), exist_ok=True)
dest = os.path.join(HERE, 'dist', 'index.html')
open(dest, 'w', encoding='utf-8').write(out)
print('écrit', dest, len(out) // 1024, 'Ko')

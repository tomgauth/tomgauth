#!/usr/bin/env python3
"""Lit le flux Atom public de la chaîne YouTube (pas de clé API) et écrit un petit JSON :
titres, dates et nombre de vidéos publiées depuis le début du trimestre. Le dashboard
complète ce relevé par le décompte de Tom (kpi_live.videos) quand le flux a du retard.
Usage : python3 fetch_youtube.py <sortie.json> [date_debut AAAA-MM-JJ]
"""
import json, os, sys, time, urllib.request, datetime as dt
import xml.etree.ElementTree as ET

CHANNEL = "UCvVafVKjq6rA3bL4yGcaB8w"  # De Prof à Pro
out = sys.argv[1] if len(sys.argv) > 1 else "youtube.json"
since = sys.argv[2] if len(sys.argv) > 2 else "2026-09-01"
URL = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL}"

last = None
for attempt in range(5):
    try:
        with urllib.request.urlopen(URL, timeout=60) as r:
            xml = r.read()
        break
    except Exception as e:  # noqa: BLE001
        last = e
        print(f"tentative {attempt + 1} échouée : {e}", file=sys.stderr)
        time.sleep(5 * (attempt + 1))
else:
    raise last

ns = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015", "media": "http://search.yahoo.com/mrss/"}
root = ET.fromstring(xml)
title = root.findtext("a:title", default="", namespaces=ns)
videos = []
for e in root.findall("a:entry", ns):
    pub = e.findtext("a:published", default="", namespaces=ns)[:10]
    videos.append({"id": e.findtext("yt:videoId", default="", namespaces=ns), "title": e.findtext("a:title", default="", namespaces=ns), "published": pub})
videos.sort(key=lambda v: v["published"], reverse=True)
data = {"fetched_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "channel": title, "channel_id": CHANNEL,
        "since": since, "count_since": sum(1 for v in videos if v["published"] >= since), "videos": videos[:15],
        "note": "Flux Atom public : les 15 dernières vidéos au maximum."}
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
json.dump(data, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("écrit", out, data["count_since"], "vidéos depuis", since)

#!/usr/bin/env python3
"""Récupère la météo de Berlin (Open-Meteo, gratuit, sans clé) et écrit un JSON
compact : conditions actuelles, prévisions 7 jours, historique 150 jours.
Tourne dans GitHub Actions (le container de dev n'a pas accès à Open-Meteo).
"""
import json, os, sys, urllib.request, datetime as dt

LAT, LON = 52.52, 13.405
out = sys.argv[1] if len(sys.argv) > 1 else "weather.json"

def get(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r)

today = dt.date.today()
start = (today - dt.timedelta(days=150)).isoformat()
end_hist = (today - dt.timedelta(days=2)).isoformat()

fc = get(
    "https://api.open-meteo.com/v1/forecast"
    f"?latitude={LAT}&longitude={LON}"
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m,cloud_cover,precipitation"
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,daylight_duration,sunshine_duration,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max"
    "&timezone=Europe%2FBerlin&forecast_days=7&past_days=2"
)
hist = get(
    "https://archive-api.open-meteo.com/v1/archive"
    f"?latitude={LAT}&longitude={LON}&start_date={start}&end_date={end_hist}"
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunshine_duration,precipitation_sum,daylight_duration"
    "&timezone=Europe%2FBerlin"
)

def rows(d):
    t = d["daily"]["time"]
    keys = [k for k in d["daily"] if k != "time"]
    return [{"date": t[i], **{k: d["daily"][k][i] for k in keys}} for i in range(len(t))]

history = {r["date"]: r for r in rows(hist)}
for r in rows(fc):
    if r["date"] <= today.isoformat():
        history.setdefault(r["date"], r)  # les jours récents viennent du forecast (past_days)

result = {
    "fetched_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "place": "Berlin",
    "lat": LAT, "lon": LON,
    "current": fc.get("current"),
    "daily": rows(fc),
    "history": sorted(history.values(), key=lambda r: r["date"]),
}
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
json.dump(result, open(out, "w"), ensure_ascii=False, separators=(",", ":"))
print("ok", out, len(result["history"]), "jours")

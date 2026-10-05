# Village de Tom

Un tableau de bord de vie en pixel-art : la vie de Tom représentée par un village RPG
(moteur canvas 16 px, sprites Super Retro World). La végétation suit la santé mentale
des 14 derniers jours, chaque client payeur de 2026 a sa maison, les PNJ sont les amis,
participants et l'équipe, et chaque bâtiment ouvre un panneau de données.

## Fichiers

- `index.src.html` : le moteur et l'interface (aucune donnée personnelle dedans).
- `build.py` : injecte `data/snapshot.json` et les sprites (`assets/`) en data URI
  → `dist/index.html`, la page publiée comme artifact privé. `data/snapshot.json`,
  `assets/` et `dist/` sont ignorés par git (données perso, licence des sprites).
- `tools/build_data.py` : transforme les exports bruts (réponses JSON des outils Coda,
  Todoist, Calendar) en snapshot compact.
- `tools/fetch_weather.py` + `.github/workflows/weather.yml` : météo de Berlin
  (Open-Meteo) écrite dans `data/weather.json` deux fois par jour. Le planning cron
  ne tourne que sur la branche par défaut ; sur une autre branche, lancer le
  workflow à la main (workflow_dispatch).

## Données en direct

Dans l'artifact, la page utilise la capacité `mcp` de claude.ai pour relire, avec
le consentement du spectateur : Coda (Daily Form, Daily Review, Weekly Goals),
GitHub (`village/data/weather.json`), Todoist et Google Calendar. Sans ces
connecteurs, elle affiche le snapshot embarqué.

## Reconstruire

```
python3 village/tools/build_data.py <dossier_exports> village/data/snapshot.json <dossier_extras>
python3 village/build.py
```

Les sprites viennent des packs Super Retro World (Gif @gif_not_jif, Noiracide
@Noiracide, Romi @DessRomaric) : à déposer dans `village/assets/` (atlas.png,
water.png, campfire.png, chests.png, icons1.png, icons2.png), jamais à redistribuer.

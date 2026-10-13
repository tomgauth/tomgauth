# Tableau de bord

Page unique, style RPG pixel-art, façon Momentum : horloge, météo de Berlin, village qui
reflète la semaine, quêtes à trois horizons (trimestre, semaine, jour), bien-être, trésorerie,
alimentation et agenda.

## Structure

- `index.src.html` : la page, sans aucune donnée personnelle.
- `build.py` : injecte `data/snapshot.json` (+ `data/weather.json`) dans `dist/index.html`.
- `tools/build_data.py` : convertit les réponses brutes des connecteurs (Coda `table_rows_read`,
  Todoist, Google Calendar) en snapshot compact. Usage :
  `python3 tools/build_data.py <dossier_resultats> data/snapshot.json <dossier_extras>`.
- `tools/fetch_weather.py` et `tools/fetch_youtube.py` + `.github/workflows/weather.yml` :
  Open-Meteo et le flux Atom de la chaîne YouTube, deux fois par jour, écrits dans
  `data/weather.json` et `data/youtube.json` puis commités (la page les lit via le connecteur GitHub).
- `chrome-extension/` : ouvre le tableau de bord à chaque nouvel onglet Chrome (voir son README).
- `assets/` (non versionné) : sprites du pack Cute Fantasy Free de Kenmi, embarqués en data URI
  par `build.py`. La licence du pack interdit la redistribution, d'où l'exclusion du dépôt.

`data/snapshot.json`, `assets/` et `dist/` sont ignorés par git : le dépôt est public, les données restent
locales ou dans l'artifact Claude.

## Le village

| Élément | Ce qu'il représente |
| --- | --- |
| Arbres | santé mentale (bonheur, stabilité, anxiété, énergie sur 14 jours) |
| Fleurs | bonheur de la semaine |
| Maisons, fenêtres allumées | vie sociale, événements sociaux |
| Grange, tracteur, caisses | heures de travail, rythme hebdo, tâches du jour |
| Champs côté 2PaP | ventes, leads, vidéos, webinaires du trimestre |
| Champs côté SOLV | encaissements et marge du mois |
| Puits | trésorerie perso (mois d'avance) |
| Étang, couleur de l'herbe | sommeil |
| Lampadaires | série Todoist |
| Moutons | jours où tu as parlé à des amis |
| Ciel, soleil, lune, nuages, pluie | heure réelle et météo réelle de Berlin |

## Mise à jour

Dans Claude, la page interroge les connecteurs du lecteur (Coda, Todoist, Google Calendar,
GitHub) toutes les 24 h et au clic sur « Rafraîchir ». Hors Claude, `dist/index.html` est une
page statique à reconstruire avec `build.py` après un nouveau snapshot.

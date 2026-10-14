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

Sprites : pack Cute Fantasy Free (Kenmi). Une seule carte pour les 90 jours : un arrondissement par
mois (une ligne), un quartier par semaine (une colonne), tous reliés par les routes. Six modèles de
quartier (maisons à gauche ou à droite, champs ou parc en bas, route verticale qui fait un crochet).
La caméra zoome sur le quartier de la semaine ou recule sur tout le village (boutons, molette,
glisser, double-clic). La frise sous la scène reconstruit le village à n'importe quelle date.

Ce qui s'accumule sur la semaine, ce qui se lit en moyenne :

| Élément | Ce qu'il représente |
| --- | --- |
| Maisons (jusqu'à 4, par étapes de construction) | jours avec un événement social dans la semaine (un étage par jour, trois étages par maison) |
| Parc : jusqu'à 20 fleurs | bonheur moyen sur 7 jours |
| Arbres, souches, couleur des feuilles | santé mentale sur 14 jours |
| Mare, couleur de l'herbe | sommeil moyen sur 7 jours |
| Atelier : caisses | heures Toggl de la semaine (une caisse pour 4 h) |
| Champs 2PaP | avancement des quêtes du trimestre à cette date |
| Champs SOLV | encaissements SOLV du mois à cette date |
| Enclos : moutons, cochons, vaches | milliers d'euros encaissés dans la semaine, ventes 2PaP de la semaine, clients qui ont payé dans la semaine |
| Poules dans la rue | tâches Todoist terminées dans la semaine (une pour dix) |
| Lampadaires | jours de la semaine à 10 tâches ou plus (un pour deux) |
| Habitants | toi et l'équipe |
| Lumière, ombres de nuages, pluie, neige | heure et météo réelles de Berlin, météo historique pour les dates passées |

## Mise à jour

Dans Claude, la page interroge les connecteurs du lecteur (Coda, Todoist, Google Calendar,
GitHub) toutes les 24 h et au clic sur « Rafraîchir ». Hors Claude, `dist/index.html` est une
page statique à reconstruire avec `build.py` après un nouveau snapshot.

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

Sprites : pack Cute Fantasy Free (Kenmi). Chaque élément est cliquable et explique ce qu'il mesure.
Le village couvre les 90 jours du trimestre : un arrondissement par mois, un quartier par semaine.
Par défaut on voit le quartier de la semaine en cours ; « Tout le village » montre les treize quartiers,
les futurs encore en friche. La frise sous la scène permet de revoir le village à n'importe quelle date
(données Daily Form, argent, ventes, vidéos et météo telles qu'elles étaient ce jour-là).

| Élément | Ce qu'il représente |
| --- | --- |
| Maisons (1 ou 2), fenêtres allumées le soir | vie sociale, événements sociaux de la semaine |
| Fleurs devant les maisons | bonheur moyen de la semaine |
| Arbres, souches | santé mentale sur 14 jours (bonheur, stabilité, anxiété, énergie) |
| Atelier clôturé, caisses | travail : tâches terminées aujourd'hui, heures Toggl |
| Champs 2PaP (gauche) | avancement des quêtes du trimestre (ventes, leads, vidéos, webinaires) |
| Champs SOLV (droite) | encaissements SOLV du mois contre le mois précédent |
| Mare, couleur de l'herbe | sommeil |
| Enclos : vaches, cochons, moutons | clients payants, ventes 2PaP du trimestre, milliers d'euros encaissés ce mois |
| Poules dans la rue | tâches Todoist terminées aujourd'hui (une pour trois) |
| Lampadaires | série Todoist (un par tranche de trois jours) |
| Habitants qui se promènent | toi et l'équipe |
| Lumière, ombres de nuages, pluie, neige | heure réelle et météo réelle de Berlin |

## Mise à jour

Dans Claude, la page interroge les connecteurs du lecteur (Coda, Todoist, Google Calendar,
GitHub) toutes les 24 h et au clic sur « Rafraîchir ». Hors Claude, `dist/index.html` est une
page statique à reconstruire avec `build.py` après un nouveau snapshot.

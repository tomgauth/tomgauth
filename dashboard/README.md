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

Sprites : packs Cute Fantasy Free et Premium (Kenmi), non versionnés (licence sans redistribution).
Un bourg qui s'étend sur les 90 jours. Au milieu, le centre-ville compte le trimestre entier ; de la
place partent trois avenues, une par mois (septembre à l'ouest, octobre à l'est, novembre au sud).
Le long de chacune, un quartier pousse chaque semaine, en alternant les côtés. Les avenues ne vont
que jusqu'au dernier quartier construit : en remontant la frise, on voit la ville grandir. Chaque
mois a son style (bois et chênes, pierre et bouleaux dorés, calcaire et sapins). La caméra a trois
vues (quartier de la semaine, centre-ville, tout le village), plus molette, glisser, double-clic.

Le centre-ville :

| Élément | Ce qu'il représente |
| --- | --- |
| Mairie et ses 14 drapeaux | démarches Cap Berlin (vert fait, jaune en attente, gris à faire) |
| Banque et coffres d'or | trésorerie hors Wise SOLV, un coffre par mois d'avance à 2 500 € |
| Taverne, clients sur les bancs | événements sociaux des 30 derniers jours |
| Guirlandes au sud de la place | trois événements sociaux ou plus sur 30 jours |
| Étang : canards, cygne | nuits à 80 % ou plus sur 7 jours ; cygne si la moyenne dépasse 90 % |
| Fontaine au milieu de l'étang | coule si le bonheur moyen sur 7 jours est à 5/10 ou plus |
| Rue du marché : étals et Chloé | ventes 2PaP du trimestre (un étal par vente, six emplacements) |
| Grange et bottes de foin | leads du trimestre (une botte pour 50) |
| Moulin | vitesse des ailes = tâches Todoist sur 7 jours (pleine vitesse à 10 par jour) |
| Serre et tonneaux fleuris | vidéos YouTube publiées (douze emplacements) |
| Feux de veillée | webinaires tenus (trois emplacements) |
| Promeneurs autour de l'étang | vie sociale du mois |

Chaque quartier (ce qui s'accumule sur la semaine, ce qui se lit en moyenne) :

| Élément | Ce qu'il représente |
| --- | --- |
| Maisons (jusqu'à 4, par étapes de construction, cheminées qui fument) | jours avec un événement social dans la semaine (un étage par jour, trois étages par maison) |
| Parc : jusqu'à 20 fleurs, papillons | bonheur moyen sur 7 jours (papillons à partir de 6/10) |
| Arbres, souches, couleur des feuilles | santé mentale sur 14 jours |
| Mare, couleur de l'herbe, canard | sommeil moyen sur 7 jours (canard à 80 % et plus) |
| Atelier : caisses | heures Toggl de la semaine (une caisse pour 4 h) |
| Champs 2PaP et fermiers au travail | avancement des quêtes du trimestre ; un fermier dès 15 tâches dans la semaine, deux dès 45 |
| Champs SOLV | encaissements SOLV du mois à cette date |
| Enclos : moutons, cochons, vaches | milliers d'euros encaissés dans la semaine, ventes 2PaP de la semaine, clients qui ont payé dans la semaine |
| Poules dans la rue | tâches Todoist terminées dans la semaine (une pour dix) |
| Lampadaires | jours de la semaine à 10 tâches ou plus (un pour deux) |
| Habitants | toi, plus un par événement social de la semaine |
| Lumière, ombres de nuages, pluie, neige | heure et météo réelles de Berlin, météo historique pour les dates passées |

## Mise à jour

Dans Claude, la page interroge les connecteurs du lecteur (Coda, Todoist, Google Calendar,
GitHub) toutes les 24 h et au clic sur « Rafraîchir ». Hors Claude, `dist/index.html` est une
page statique à reconstruire avec `build.py` après un nouveau snapshot.

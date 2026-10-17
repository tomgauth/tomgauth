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
Un bourg serré. Au milieu, le centre-ville compte le trimestre entier ; autour, un quartier par mois
(septembre à l'ouest, octobre à l'est, novembre au sud). Dans un quartier, les maisons de toutes les
semaines du mois se rangent par ordre de construction, les premières au plus près de la place ;
chacune a son allée jusqu'à la rue et une plaque avec le lundi de sa semaine. La forêt recouvre ce
qui n'est pas encore bâti. Un ruisseau traverse le quartier de septembre (pont, grenouilles, oies),
des chevaux paissent au nord, des abeilles tournent autour des ruches ; le sol a des taches de prairie
et les routes quelques renflements. Vues : « Ce mois-ci », « Centre-ville », « Tout le village ». La molette
fait défiler la page ; Ctrl + molette, le pincement ou les boutons + et − zooment.

Aucun montant n'apparaît sur la page : l'argent se lit en mois d'avance, en pourcentages ou en moutons.

Le centre-ville :

| Élément | Ce qu'il représente |
| --- | --- |
| Mairie et 14 drapeaux sur la place | démarches Cap Berlin (vert fait, jaune en attente, gris à faire) |
| Banque et coffres d'or | mois d'avance sur le budget perso, un coffre par mois |
| Taverne et clients en terrasse | événements sociaux des 30 derniers jours |
| Guirlandes | trois événements sociaux ou plus sur 30 jours |
| Étang : canards, cygne | nuits à 80 % ou plus sur 7 jours ; cygne si la moyenne dépasse 90 % |
| Fontaine au milieu de l'étang | coule si le bonheur moyen sur 7 jours est à 5/10 ou plus |
| Rue du marché, six étals | un étal déballé avec Chloé par vente 2PaP, les autres bâchés |
| Poulailler, grange et foin | leads du trimestre (une botte pour 50) |
| Moulin | tâches Todoist sur 7 jours (vitesse des ailes) |
| Serre et tonneaux fleuris | vidéos YouTube publiées |
| Feux de veillée | webinaires tenus |

Chaque quartier mensuel :

| Élément | Ce qu'il représente |
| --- | --- |
| Une maison par semaine : petite maison, maison à étage, grande, très grande, auberge | 0, 1, 2, 3, 4+ événements sociaux dans la semaine ; une cabane en plus à partir de 2 ; plaque avec le lundi, drapeau jaune sur la semaine en cours |
| Poules en liberté | leads gagnés dans le mois (une pour dix) |
| Grand enclos : moutons, cochons, vaches | milliers d'euros encaissés dans le mois, ventes 2PaP du mois, clients qui ont payé |
| Mare, canard | sommeil moyen du mois (canard à 80 % et plus) |
| Champs 2PaP, épouvantail, fermiers | avancement des quêtes du trimestre ; fermiers selon les tâches Todoist du mois |
| Champs SOLV | encaissements SOLV du mois comparés au précédent |
| Parc : jusqu'à 20 fleurs, papillons | bonheur moyen du mois |
| Arbres et souches | santé mentale du mois |
| Habitants | toi, plus un par événement social du mois |

## Mise à jour

Dans Claude, la page interroge les connecteurs du lecteur (Coda, Todoist, Google Calendar,
GitHub) toutes les 24 h et au clic sur « Rafraîchir ». Hors Claude, `dist/index.html` est une
page statique à reconstruire avec `build.py` après un nouveau snapshot.

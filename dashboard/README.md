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
Une île : une côte qui ondule, une plage tout autour, la mer animée à perte de vue. Au milieu, le centre-ville compte le trimestre entier ; autour, un quartier par mois
(septembre à l'ouest, octobre à l'est, novembre au sud). Dans un quartier, les maisons de toutes les
semaines du mois se rangent par ordre de construction, les premières au plus près de la place ;
chacune a son allée jusqu'à la rue et une plaque avec le lundi de sa semaine. La forêt recouvre ce
qui n'est pas encore bâti. Un ruisseau né dans le marécage traverse le quartier de septembre (pont, grenouilles, oies), une rivière de quatre cases
traverse novembre (ponts de pierre, capybaras) et s'étale en éventail sur la plage jusqu'à la mer, un marécage dort dans les bois au nord, la mer borde l'est avec sa plage ;
des chevaux de toutes les robes paissent au nord-est, des souris et des cochons traînent près de la grange, des abeilles tournent autour des ruches ; le sol a des taches de prairie
et les routes quelques renflements. Vues : « Ce mois-ci », « Centre-ville », « Tout le village », et « ▶ Time-lapse » qui rejoue le
trimestre jour par jour en plein écran (Échap ou Stop pour sortir). Un clic ouvre une bulle à côté de
l'élément ; le survol donne juste son nom. La molette
fait défiler la page ; Ctrl + molette, le pincement ou les boutons + et − zooment.

Tout se construit sous tes yeux. Une maison prend deux jours : le plan et la palissade le lundi, les murs le
mardi, la maison finie le mercredi (et un jour de travaux à chaque nouvel événement de la semaine) ; son allée
arrive avec le plan, la rue s'allonge de maison en maison. Les équipements d'un quartier arrivent au fil du mois
(enclos le 3e jour, mare le 4e, champs le 6e, parc le 8e, place le 10e, ruche le 12e ; la boulangerie et le camp
ouvrent trois jours après la première note d'alimentation ou la première séance), le centre-ville au fil des
premières semaines (mairie, banque, taverne, lampadaires, fontaine, marché, moulin, grange, poulailler, serre,
veillées), les statues le jour de chaque cap. Les jours d'événement social ou de cap franchi, un feu d'artifice
éclate au-dessus de la maison ou de la place. La lumière a quatre temps : matin doré, journée, soir orangé, nuit
bleue, sans ombres de nuages.

Le village vit à l'heure de Berlin et avec sa météo : le relevé s'il a moins de 90 minutes, sinon la prévision heure par heure embarquée (7 jours), et un relevé en direct d'Open-Meteo toutes les 3 heures quand le navigateur le permet. Tout le monde se lève à 7 h. Au coucher du soleil, la moitié des gens rentre
et les fermiers quittent les champs ; à 20 h les poules se regroupent et s'endorment au pied des maisons ;
à partir de 21 h il ne reste qu'un promeneur avec sa lanterne, les bêtes dorment en tas. Sous la pluie,
la moitié des gens reste chez soi et les autres sortent le parapluie, la terrasse de la taverne se vide,
les bêtes des enclos (et les chevaux, dans leur paddock) se serrent sous leur abri. La terrasse a trois
tables : les clients arrivent, s'assoient un moment et repartent. En time-lapse, la caméra se pose sur ce
qui se construit, les routes poussent case par case depuis le réseau existant et les bêtes arrivent une à une.

Aucun montant n'apparaît sur la page : l'argent se lit en mois d'avance, en pourcentages ou en moutons.

Le centre-ville :

| Élément | Ce qu'il représente |
| --- | --- |
| Mairie et 14 drapeaux sur la place | démarches Cap Berlin (vert fait, jaune en attente, gris à faire) |
| Banque et coffres d'or | mois d'avance sur le budget perso, un coffre par mois |
| Taverne et clients en terrasse | événements sociaux des 30 derniers jours |
| Guirlandes | trois événements sociaux ou plus sur 30 jours |
| Étang : canards, cygnes blancs, cygne noir | nuits à 80 % ou plus sur 7 jours ; un cygne blanc par nuit à 90 % ou plus ; cygne noir après une nuit sous 70 % |
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
| Potager : quatre planches (joie, énergie, stabilité, calme) | un plant par jour, grand si la note du jour est bonne : carottes, maïs, choux, fraises |
| Verger : un arbre fruitier par semaine | santé mentale de la semaine ; fruits à partir de 74 % |
| Habitants | un par événement social du mois (au moins un, né du jour le plus social) |

Le corps et les caps franchis :

| Élément | Ce qu'il représente |
| --- | --- |
| Boulangerie (septembre), guinguette (octobre), primeur (novembre) | qualité moyenne de l'alimentation du mois : niveau 0 à 4, plus de pains, de tables, de fleurs et de lampions quand tu manges mieux ; les clients attablés sont les bons jours (7/10 et plus) |
| Camp d'entraînement du quartier : ring, tente, petits soldats | un soldat par séance de Muay Thai du mois (bleus en septembre, rouges en octobre, dorés en novembre) ; deux s'affrontent sur le ring, six répètent leurs gestes, les autres font le tour au pas ; ils dorment sous la tente la nuit et sous la pluie |
| Vitesse des gens nés dans le mois | grandes marches (90 minutes et plus) du mois : jusqu'à deux fois plus vite à quinze marches |
| Montagne du nord-ouest et son sentier | un cairn par marche depuis le 1er septembre, plus haut pour 90 minutes et plus |
| Statues autour de l'étang | un cap franchi (départ pour Berlin, premier webinaire, première vente, première vidéo, premier sparring, semaine parfaite de Muay Thai, dix séances…), les six plus récents |
| Stèles au pied du moulin | chaque centaine de leads |
| Banderole de l'entrée sud | les trois derniers caps, à tour de rôle |

L'eau et le relief : le ruisseau part du marécage, descend le long de septembre puis file en diagonale, par
zigzags, jusqu'au confluent (tracé 4-connexe peint au pinceau 2 x 2, donc sans coupure) ; celui de l'étang sort de
sous la place et longe l'avenue ; ils font la rivière, large de quatre cases, qui traverse novembre (trois ponts
de pierre) et s'ouvre en trois bras pour entrer dans la mer. Toutes les eaux et la mer comptent comme une seule
eau pour l'autotile : aucune berge entre elles, et sur le sable l'eau n'a pas de bord. Les chemins qui arrivent
sur le sable s'y fondent de la même façon. L'île elle-même est une superellipse à bosses et à baies (une baie à
l'est pour le port, une au nord derrière la mairie, une à l'ouest), la forêt a des bois denses et des clairières
(bruit continu), des bottes de foin dans les clairières, des rochers sur les plages et dans l'eau peu profonde.
Les rues ondulent d'une case tous les sept ou huit pas, toujours du côté opposé aux façades, et l'avenue
s'élargit par endroits ; elles restent droites aux ponts, devant la petite place et à l'entrée de la grande. La montagne est faite de trois plateaux
aux coins arrondis ; une cascade naît d'un bassin sur le premier plateau, tombe dans une vasque dont le bief
rejoint le ruisseau.

Le port : au bout de l'avenue d'octobre, un ponton de planches (dessiné dans le sol, rien ne passe dessous) entre
dans la mer, avec sa lanterne, ses caisses, une barque amarrée et un pêcheur ; l'île de l'été a son propre ponton
et sa barque. Aucune barque au large : une barque a un point d'amarrage.

L'île de l'été (juin à août), à l'est : une maisonnette par mois (à étage quand la vie sociale moyenne dépassait
5/10), des fleurs devant selon le bonheur, de la fumée quand l'énergie était là, une mare dont la taille suit les
nuits, un puits, quatre stèles pour les caps de l'été (goals90, sans aucun montant), un ponton, un pêcheur et un
habitant né le jour le plus heureux de l'été. Clic sur l'île pour la légende comparative.

L'espace entre bâtiments : chaque rangée connaît ses emprises réservées (coin repas, ruisseau) ; une maison qui
n'y tient plus passe dans une autre rangée plutôt que d'écraser un voisin. Les cabanes annexes viennent après toutes
les maisons, en bout de rue, s'il reste de la place. Des haies ferment l'arrière de chaque rangée de maisons
bâties et séparent deux voisines. Une montagne en terrasses au nord-ouest, un marécage
dans les bois du nord. Les pêcheurs suivent la règle du bouchon : il tombe 25 px à droite et 15 px sous les
pieds, dans l'eau, les pieds sur la terre.

La place et ses gens : le café est une maison au coin nord-ouest (une tasse sur le mur pour dix cafés du
trimestre, son chemin descend jusqu'à l'avenue), bancs de bois, pigeons clairs sur la place et dans l'herbe des
parcs, parterre en cœur qui fleurit à chaque soirée à deux et banc des amoureux la semaine où il y en a eu une,
bûcherons face à leur arbre, mineur face à son filon, porteurs de caisses du marché à la taverne par la place, et
le crieur de la Gazette qui fait le tour de la place en sautillant (« GAZETTE ! ») : un clic sur lui ouvre le journal. Dans les bois du sud-ouest, des
ombres (slimes) rôdent, plus nombreuses quand le calme baisse ; à partir de quatre, une s'approche du camp.

La Gazette de l'île (bouton 📰 dans la barre, ou le crieur sur la place) : le journal de la semaine regardée. La
une raconte les événements (sans prénom), une interview d'un habitant (ses propres phrases, déjà tamisées), puis l'économie du village (ventes contre le rythme attendu, la veillée qu'on attend),
le poulailler, les nuits, le baromètre des humeurs, l'assiette, le camp, les cérémonies de statues, les rumeurs
d'ombres, le café, la météo et le mot du maire (le cap de la Weekly). Les illustrations sont dessinées avec les
sprites du village.

Les habitants et les intérieurs :

Chaque personnage est né un jour qui comptait : les gens des quartiers d'un événement social du mois, les
fermiers des plus grosses journées de tâches, les pêcheurs des meilleures nuits, les promeneurs des jours
les plus joyeux. Un clic sur l'un d'eux l'arrête et ouvre sa fiche : date de naissance, notes de ce jour-là
(joie, énergie, calme, stabilité, sommeil), un caractère tiré de ces notes et des humeurs du Daily Form,
ce que le journal disait ce jour-là, et une question sur tes objectifs du moment.

Un clic sur une maison fait entrer dedans. La pièce a la taille de la maison : une petite maison n'a qu'un
lit, une table et un coffre ; une auberge a son comptoir, ses tables et ses clients. Les gens dedans sont
nés cette semaine-là. Les objets racontent la semaine :

| Objet | Ce qu'il raconte |
| --- | --- |
| Lit (couleur des draps) | sommeil moyen, meilleure nuit |
| Fenêtre | météo de la semaine (ou Gap, avant Berlin) |
| Calendrier | santé mentale jour par jour : les hauts et les bas |
| Horloge | heures de travail notées |
| Feu (allumé à 6/10) | énergie moyenne |
| Plantes | jours de joie à 7/10 ou plus |
| Tapis (bleu, jaune, rose) | calme moyen |
| Table | les grandes tâches (MIT) de la semaine |
| Coffre | le vœu de la semaine (Focus de la Weekly) |
| Bibliothèque | la leçon de la semaine |
| Lampe | ce qui a résisté : la question de la semaine |
| Tableau | la victoire de la semaine |

Ce qui vient du journal passe au tamis : une ligne qui contient un prénom, un montant ou un sujet intime
est écartée en entier, les événements sociaux sont racontés sans les noms. Les prénoms des habitants suivent
les lieux : septembre n'a que des prénoms français, à partir d'octobre un mélange berlinois (surtout allemand,
avec du turc, du russe, du polonais, de l'italien et un peu de français).

Langue : le bouton EN / FR de la barre du haut bascule l'interface (dates, panneaux, légendes, fiches des
habitants, Gazette) ; le choix est mémorisé dans le navigateur. Les enseignes du village restent en français, et
ce que tu as écrit toi-même (objectifs, citations du journal) n'est pas traduit.

## Son et mode jeu

Le son est entièrement synthétisé (Web Audio, rien à charger) et ne joue que ce qui est à l'écran : vagues quand
la mer est visible, ruisseau quand l'eau douce l'est, oiseaux dans les bois denses (jamais la nuit), coups de hache
et de pioche des ouvriers visibles, feux d'artifice, portes à l'entrée et à la sortie des maisons. Bouton 🔈 / 🔊
dans la barre du haut, choix mémorisé.

Le bouton 🎮 Jouer pose un héros au nord de la place : flèches ou ZQSD pour marcher (collisions avec les
bâtiments, l'eau et les haies), E ou Entrée pour parler à l'habitant d'à côté ou entrer dans la maison devant
laquelle on se tient, Échap pour quitter. La fenêtre de dialogue propose Saluer, Provoquer, Demander : la réponse
vient des données de l'habitant (jour de naissance, caractère, notes du jour déjà tamisées). Dans Claude, la
capacité « sample » reformule cette réponse avec le modèle à partir de ces seules données, sans prénom ni somme.

## Interface

Les cadres, boutons, rubans et icônes viennent du pack Cute Fantasy UI (`assets/ui_*.png`, injectés en variables
CSS au chargement) : légende sur parchemin avec un ruban pour le titre, infobulle sur petit cadre, boutons pilule,
icônes devant les jauges des habitants.

## Mise à jour

Dans Claude, la page interroge les connecteurs du lecteur (Coda, Todoist, Google Calendar,
GitHub) toutes les 24 h et au clic sur « Rafraîchir ». Hors Claude, `dist/index.html` est une
page statique à reconstruire avec `build.py` après un nouveau snapshot.

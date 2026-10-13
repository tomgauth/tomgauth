# Nouvel onglet Chrome

Chrome ne permet pas de taper une URL de « nouvel onglet » dans ses réglages : il faut une
extension. Celle-ci fait une seule chose, elle ouvre le tableau de bord à chaque nouvel onglet.

1. Télécharge ce dossier `chrome-extension` sur ton ordinateur.
2. Dans Chrome, ouvre `chrome://extensions`, active « Mode développeur » (en haut à droite).
3. Clique « Charger l'extension non empaquetée » et choisis le dossier.
4. Ouvre un nouvel onglet : le tableau de bord s'affiche (connecté à claude.ai, les données se
   rafraîchissent toutes les 24 h via tes connecteurs).

Pour changer l'adresse, modifie `DASHBOARD_URL` dans `newtab.js` puis clique « Actualiser » sur
l'extension. Alternative sans extension maison : l'extension « New Tab Redirect » du Chrome Web
Store, avec la même URL.

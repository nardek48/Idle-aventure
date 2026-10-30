# v3.592.0 — Quoi de neuf après une mise à jour

Choix A de Seb (30/10), après l'atelier `atelier/quoi-de-neuf.html`.

## Ce qui change
- Après une mise à jour, une fenêtre centrée « Quoi de neuf » liste ce qui a changé depuis la dernière version vue sur cet appareil : la plus récente en haut, 5 lignes au plus, puis « Tout voir » et « Compris ».
- Elle s'ouvre une seule fois, partie chargée, héros libre : jamais sur l'accueil, en combat, en Petite Aventure, ni par-dessus une autre fenêtre.
- Nouveau joueur : rien (il découvre tout). Joueur déjà avancé sans repère sur l'appareil (première fois avec cette version) : les nouveautés depuis les bandeaux illustrés (v3.581.0).
- « Tout voir » ouvre la liste complète, groupée par version. Paramètres › Partie › Mises à jour : « Voir les nouveautés » la rouvre.
- Le repère (dernière version vue) est une préférence de l'appareil, pas une donnée de la partie.

## Pour chaque version à venir
Une ou deux lignes pour le joueur en tête de `newsEntries()` (`js/ui/news-view.js`), seulement si la version change quelque chose de visible.

## Fichiers
- **Nouveau fichier** : `js/ui/news-view.js` (nouveautés, fenêtre, liste). Ajouté à `index.html` et au précache de `sw.js`.
- `js/main/pwa.js` (lien dans la carte Mises à jour), `css/05-overlays.css`, `js/lang/en.js` (15 textes).

## Contrôles
`round-harness` 5 600 OK, 0 échec (deux passes), avec un contrôle nouveau [389] (ordre des versions, comparaison, icônes présentes). `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` complet 142 OK ; audit i18n 100 %. Sous Chromium, iPhone et Mac : nouveau joueur, aucune fenêtre ; joueur avancé, la fenêtre une fois (5 lignes), « Tout voir » groupé par version, pas de retour au lancement suivant ; lien présent dans Paramètres › Partie.

# v3.581.0 — Bandeaux illustrés : Camp, Quêtes, Village et Héros

Décision de Seb du 30/10, après les ateliers `atelier/bandeau-camp.html`, `atelier/bandeaux-mondes.html` et `atelier/bandeaux-jeu.html` (rendu sur les vrais écrans).

## Ce qui change
- Les écrans Camp, Quêtes, Village et Héros (fiche principale) ouvrent sur une illustration en bandeau, à la place de la ligne de titre.
- Téléphone : 150 px de haut. Grand écran : l'image entière (format 3:1, 322 px sur un Mac 1440 × 900).
- En faisant défiler, le bandeau se replie et ne garde que son titre (44 px sur téléphone, 56 px en grand écran).
- Les fenêtres (tutoriels, fiches, menus) passent toujours au-dessus.

## Les images suivent la progression
- **Camp** et **Quêtes** suivent le monde où vit le héros (`WorldManager.worldIndex`) : le camp de l'expédition change de décor et grossit à chaque monde, le tableau des missions le suit.
- **Village** et **Héros** restent à Aeswyn et grandissent avec le monde le plus loin atteint (`game.worldsEverReached`). Revenir en Forêt ne fait pas reculer le village.
- Le camp porte un nom par monde, repris par le bandeau du haut en grand écran : Campement d'Aeswyn, Camp de l'oasis, Camp des colonnes, Camp de la veille, Camp des cendres, Le dernier camp.
- Blasons des images : le cerf est celui d'Aeswyn (le village), l'arbre celui de l'expédition (Héros, Quêtes).

## Fichiers
- **Nouveau fichier** : `js/ui/screen-banner.js` (choix de l'image, du titre et de la phrase ; repli). Ajouté à `index.html` et au précache de `sw.js`.
- **Nouvelles images** (24) : `images/Banners/camp_<monde>.webp`, `quetes_<monde>.webp`, `village_1` à `village_6.webp`, `heros_1` à `heros_6.webp`, en 2172 × 724, WebP qualité 78, 5,4 Mo au total. Chargées à la visite, comme les autres images (pas de précache).
- `js/ui/kframe-decorator.js` : pose le bandeau quand le cadre déclare `data-kf-banner`.
- `camp-view.js`, `quests-view.js`, `village-view.js`, `heros-view.js` : déclarent leur bandeau ; `hud-view.js` : nom du camp dans le bandeau du haut.
- `css/00-kbtn.css` (bandeau), `css/10-grand-ecran.css` (titre plus grand en grand écran), `js/lang/en.js` (16 textes en anglais).

## Contrôles
`round-harness` 5 573 OK, 0 échec (deux passes), avec un contrôle nouveau [385] : 24 images distinctes et présentes, retour en Forêt, nom du camp au Désert. `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P11 15 OK ; icônes : aucune absente ; audit i18n : 100 %, 0 appel non littéral. Mesures au pixel sous Chromium (iPhone 390 × 844 et Mac 1440 × 900) : bandeau à 340 × 150 et 966 × 322, titre replié entièrement visible, fenêtre de tutoriel au-dessus du bandeau, aucune erreur ni image en 404.

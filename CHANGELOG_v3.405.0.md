# Aethervale v3.405.0 — Retouches avant le mode PC

Décisions de Seb du 01/10/2026.

## Petites Aventures : en-tête
- Le lieu (« Désert oublié · Départ ») et le butin passent **sur une ligne au-dessus** des barres. Les barres PV et Souffle prennent toute la largeur restante à côté du portrait.
- Sur grand écran, l'en-tête est limité à 460 px de large, en haut à gauche : il garde le format mobile au lieu de s'étirer.
- Fichiers : `js/ui/pa2-view.js` (`pa2HudHTML`), `css/04-panel-pa2.css`.

## Bibliothèque
- Bestiaire, Codex et Tutoriels sont réunis dans une page **Bibliothèque**, avec un rail en haut (comme Quêtes). La barre du bas Bestiaire/Codex disparaît.
- Menu : une seule porte « Bibliothèque » à la place de « Bestiaire & Codex » et « Tutoriels » (4 cases).
- Tant que le Bestiaire n'est pas débloqué par l'Histoire, la Bibliothèque ne montre que les Tutoriels, sans rail.
- Les onglets internes `bestiary` et `tutorials` ouvrent tous deux la Bibliothèque. Le cadre est posé par `buildBestiaryHTML` ; `buildTutorialsHTML` ne rend plus que le contenu.
- Fichiers : `js/ui/bestiary-view.js`, `js/ui/tutorials-view.js`, `js/ui/ui-root.js`, `js/ui/menu-view.js`.

## Bulles « à faire »
- **Donjon** : visible tant qu'il reste des sorties du jour dans un donjon débloqué. Le nombre affiché correspond au total des sorties restantes. Un toucher ouvre Donjons. Masquée sur l'écran Donjons.
- **Petite aventure** : visible quand celle du jour est disponible dans le monde où tu es, ou en cours. Un toucher l'ouvre (par la carte vivante si le monde en a une). Masquée pendant l'aventure.
- Ordre : talents, petite aventure, donjon, sac. **Trois situations au plus**, plus le fil rouge (avant : deux).
- Donjons et petite aventure ne sont recalculés qu'une fois par seconde (le dock est rendu à chaque image).
- Fichier : `js/ui/hud-dock-view.js`.

## Textes
- en.js : +« Bibliothèque », +« Ta petite aventure t'attend », +« Une petite aventure est disponible », +« Une sortie de donjon disponible / {n} sorties… » ; −« Bestiaire & Codex ».

## Technique
- Aucun fichier protégé touché. Aucun nouveau fichier.
- `sim/design-audit.js` : variables `VW`/`VH` pour capturer en grand écran (ex. `VW=1280 VH=800`).
- Harnais : section [178] ; [169] (ordre des bulles), [TUTOS] et le compte du menu mis à jour. Round 3633 OK ×2, boot 4, création 44, parcours 139, campagne 38, i18n 100 %.

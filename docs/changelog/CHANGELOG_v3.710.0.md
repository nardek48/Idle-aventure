# v3.710.0 — Coque du téléphone : bandeau du haut et barre du bas du kit de Seb

Atelier `atelier/kit-coque-3.html` validé par Seb le 05/11 (« on peut intégrer en jeu »). Aucun état sauvegardé nouveau, aucun fichier JS/CSS ajouté.

## Livré

- **Bandeau du haut (téléphone)** : plaque avec le château, portrait dans l'anneau (par-dessus le cadre, touche → Héros › Résumé), écusson du niveau, jauges PV et XP (cœur, étoile), capsule d'or et « + ». Mesures relevées au pixel sur la maquette de Seb, ramenées à 390 × 100 px et posées en % (suit la largeur, 320 à 430 px). Le bandeau montre 87 px, le losange et l'écusson débordent sur le contenu ; le premier bloc de l'écran touche le bas de la plaque.
  - `js/ui/hud-view.js` : `hudCoqueHTML()` ajouté dans `.hud-band` ; `renderHudBand` écrit aussi `hk-gold`, `hk-hp-*`, `hk-xp-*`, `hk-lvl` ; `renderCombatHeroMini` pose le portrait `hk-pt-img`. Les ids de l'ancien bandeau sont gardés (format large).
  - `css/02-layout.css` : bloc `.hk-*`, actif sous `html:not(.wide-mode)` seulement. Le format large garde le bandeau de pierre (vérifié à 1280 px).
- **« + » de l'or** : ouvre « Ton or peut servir » (`openOrInvestFromHud` → `openOrInvestWindow`). Il pulse tant qu'une dépense n'a pas été montrée (`orInvestState().fresh`), il est atténué quand rien n'est payable. Sur téléphone, la bulle dorée du dock disparaît (`js/ui/hud-dock-view.js`) ; elle reste au format large.
- **Barre du bas (téléphone)** : panneau du kit, 94 % de large (404 px au plus), six icônes de la planche de Seb, séparateurs dorés, libellé Alegreya sous l'icône, halo qui monte du bord et lueur sous l'onglet actif. Les icônes passent par `content: url()` sur l'image : le rail du format large garde les siennes.
- **Images** (`images/UI/coque/`, 16 fichiers WebP, 171 Ko, hors précache) : plaque, anneau, ecusson, capsule-or, plus, jauge, jauge-pv, jauge-xp, barre, lueur, onglet-camp/quetes/carte/village/heros/menu. Découpées dans les planches de Seb ; son damier « imprimé » a été retiré par couleur (quelques liserés clairs possibles). À remplacer par des PNG à vraie transparence quand Seb les aura.
- Couleurs du bloc passées sur les jetons de la palette les plus proches ([182]).
- Quoi de neuf : une ligne FR + EN ; clé anglaise « Or à investir ».
- `tools/harness/round-harness.js` : [476] (nouveau, 5 contrôles) : éléments du bandeau, 16 pièces sur disque et utilisées, téléphone seul, hors précache, « + » et bulle d'or au format large seulement.

## Contrôles

- `node --check` sur chaque JS modifié.
- `round-harness.js` : 6 625 OK, 0 échec (deux passes) ; `boot-harness.js` 4/0 ; `hero-creation-harness.js` 44/0 ; `parcours-harness.js` 232/0.
- `missing-icons.js` : liste inchangée (8 lignes, antérieures).
- Captures Chromium à 390 et 320 px (Camp, Village, Héros) et 1280 px (format large inchangé).

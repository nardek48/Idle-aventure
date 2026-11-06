# v3.719.0 — Pack de boutons de Seb : cuivre (principal), parchemin (secondaire)

Atelier `atelier/boutons-pack.html` validé par Seb le 06/11 (« c'est parfait tu peux intégrer »). Aucun état sauvegardé nouveau, aucun fichier JS/CSS ajouté.

## Livré

- **Composant bouton** (`.kbtn`, `.settings-btn`, `css/00-kbtn.css`) : les boutons du pack de Seb, découpés en trois (bouts de 22 px avec le losange et le biseau, milieu étiré, `border-image … fill`). Parchemin par défaut (encre brune), cuivre pour `.primary` (texte crème). Police Alegreya 15 px.
  - **Largeur au texte** : `width: fit-content`, 140 px au moins, 100 % au plus. Plus de boutons à 100 % ni à 260 px.
  - **Deux lignes** : un bouton qui contient un `<small>` prend la version haute du pack (60 px) ; « Offrir (+n Aether) » et « Vendre (+n or) » passent la somme en dessous (`btnDeuxLignes`, `js/ui/equipment-view.js`). Caravane et Grand Ouvrage (libellé + `<small>`) suivent.
  - **Deux boutons côte à côte** (pieds de feuille et de fenêtre, Paramètres, actions d'étape, fiche de bâtiment, Labyrinthe, PA…) : centrés, même largeur (celle du plus long, 140 px au moins, moins sur 320 px). Un bouton seul dans ces rangées reprend sa largeur au texte.
  - **États** : pressé = léger enfoncement et assombrissement ; désactivé = désaturé (inchangé) ; danger = parchemin, texte rouge foncé (le contour rouge v3.590.0 est retiré).
  - Retirés : le secondaire filaire (v3.402.0), le fond crème sous un bouton désactivé (il se voyait dans les coins coupés), les fonds propres du Labyrinthe et du format large pour les secondaires.
- **Contextes ajustés** : fiche d'objet (`.eq-detail-action`, plus de 100 %), Paramètres (`.set-card`), Caravane et Grand Ouvrage (`.car-go`, `.car-back`, `.go-go`), écran titre (centré), colonne étroite de l'équipement porté (`.hs-edetail-act`, 128 px : sans minimum), format large (`10-grand-ecran.css`).
- **Images** (`images/UI/buttons/`, chargées à la demande, hors précache) : `btn-cuivre-1l`, `btn-cuivre-2l`, `btn-parch-1l`, `btn-parch-2l` (WebP, 132 et 180 px de haut, 78 Ko en tout).
- Quoi de neuf : une ligne FR + EN.
- `tools/harness/round-harness.js` : [175] mis à jour (le secondaire filaire n'existe plus) ; [480] (nouveau, 7 contrôles).

## Restent hors du composant

- Pastilles d'achat dorées `.kbuy` (Boutique, Apothicaire) : inchangées, comme convenu.
- Format large : « Voir le tableau complet » de la carte Missions (`.cw-btn`) et « Tout récolter » de la Chronique (`.chr-harvest`) ont leurs propres classes et gardent leur style.

## Contrôles

- `node --check` sur chaque JS modifié.
- `round-harness.js` : 6 653 OK, 0 échec (deux passes) ; `boot-harness.js` 4/0 ; `hero-creation-harness.js` 44/0 ; `parcours-harness.js` 232/0.
- Captures Chromium à 390 et 320 px (Camp, Quêtes, fenêtre de l'or, Taverne, objet du sac, Paramètres, Grand Ouvrage, écran titre) et 1280 px : aucun bouton ne déborde.

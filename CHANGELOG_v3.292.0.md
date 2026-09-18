# v3.292.0 — Carte vivante plein écran, avec zoom

Dernier lot de l'équilibrage de la Forêt. Il intègre dans le jeu les ateliers A1, A2 et A3
de la carte vivante, validés par Seb sur iPhone le 18/09/2026.

## 1. Plein écran

- Seul le menu du bas reste à l'écran. Le HUD, le cadre décoré, le titre et les deux boutons
  du bas disparaissent. C'est la classe `body.living-map-active` qui produit cet effet ; elle
  n'est posée que sur l'onglet Carte, quand une carte vivante est ouverte.
- L'en-tête devient une rangée d'éléments posés sur la carte :
  - le bouton retour ‹, qui ramène à la carte du monde ;
  - les pastilles « secteurs libérés », Sève et Palissade ;
  - le bouton **i**, qui ouvre la popup du monde ;
  - le bouton ◎, qui recentre la carte sur le foyer.
- La carte s'ouvre en cadrage « Couvrant » : elle remplit toute la hauteur disponible, soit
  **2,4 fois la taille d'avant** sur un iPhone.

## 2. Zoom et déplacement

- **Glisser** : la carte suit le doigt, avec un élan au lâcher.
- **Pincer** : le point situé sous les doigts reste en place.
- **Double tap** : zoom ×1,8. Au zoom maximum, un double tap ramène au cadrage d'ouverture.
- **Limites** : zoom maximum **×2** (décision Seb) ; la carte ne descend jamais sous le
  cadrage « Couvrant », donc jamais de bandes noires.
- La carte peut descendre de 112 pt sous l'en-tête, pour dégager ce qui est dessiné tout en
  haut de l'image.
- Les pastilles des secteurs gardent leur taille de 44 pt à tous les zooms. Leurs noms
  passent de 9,5 à 11 px.
- **Robustesse** :
  - les gestes sont écoutés au niveau du document : un `renderPanel` déclenché en cours de
    glissé ne casse ni le geste ni la vue (taille et position conservées dans `lmxView`) ;
  - `touch-action: none` est posé sur toute la carte ; `.lm-map` est un conteneur de
    défilement, et sans cette règle le navigateur reprendrait le pincement.

## 3. Volet du secteur

- Le panneau qui se trouvait sous la carte devient un volet qui monte du bas et s'arrête
  au-dessus du menu. Son contenu (`buildLivingMapPanelHTML`) n'a pas changé ; seul le texte
  est plus grand.
- Il se ferme avec ✕ ou par un tap sur la carte. Un tap qui termine un glissé ne compte pas.
- Toucher un secteur le recadre au milieu de la partie visible, entre l'en-tête et le volet.
  Au retour d'une expédition, la carte se rouvre recadrée sur le secteur joué.

## 4. Légende et repère hors écran

- **Légende** : le bouton **?** en bas à gauche l'ouvre. Elle montre les sept états avec leur
  vraie pastille et remonte avec le volet.
- **Repère hors écran** : quand l'expédition en cours se déroule sur un secteur invisible à
  l'écran, une pastille orange au bord l'indique, avec une flèche vers lui. La toucher recadre
  la carte sur le secteur.

## 5. Image du Désert

- `images/Maps/desert.jpg` : l'image proposée par Seb, en 1254 px (JPEG q85, 481 Ko). Elle
  n'est **branchée nulle part** : elle attend le chantier du Désert.
- Décision de Seb : le foyer du Désert est **renommé** plutôt que de retoucher l'image, dont
  le centre montre un campement et non un portail. Le nom proposé est « Le camp du Portail »,
  à confirmer au chantier du Désert.
- Positions relevées sur l'image, en % de sa largeur et de sa hauteur (atelier A3b), à reporter
  dans le document de conception du Désert :

| Secteur | x | y | Anneau | Voisins |
|---|---|---|---|---|
| Foyer (centre) | 49,4 | 47 | — | anneau 1 |
| Le puits sec | 39 | 30 | 1 | verrerie, oasis |
| La caravane renversée | 63 | 29,5 | 1 | verrerie, marché de sel |
| Les stèles penchées | 40 | 63 | 1 | lit du fleuve, oasis |
| Le champ de scarabées | 60,5 | 63,5 | 1 | tour de guet |
| La verrerie ensevelie | 49,5 | 16,5 | 2 | puits, caravane, bête, Temple |
| L'oasis basse | 19 | 35 | 2 | puits, stèles, bête |
| Le marché de sel | 83 | 34 | 2 | caravane, Temple |
| La tour de guet | 75,5 | 54 | 2 | scarabées, trône |
| Le lit du fleuve | 19,5 | 60 | 2 | stèles, trône |
| La bête sous la dune | 25 | 12,5 | 3 | oasis, verrerie |
| La porte du Temple | 81 | 10 | 3 | verrerie, marché de sel |
| Le trône de sable | 51 | 81 | 3 | lit du fleuve, tour de guet |

## Tests (`round-harness.js`)

- **Section [58]** : le contrôle « panneau d'accueil sans sélection » est remplacé par
  « aucun volet sans sélection, carte plein écran ». Tous les autres contrôles de la vue
  (classes des nœuds, brume, liens, mur, bouton Partir) passent **sans modification**.
- **Nouvelle section [88]**, 9 contrôles : cadre plein écran, en-tête, légende repliée puis
  ouverte, volet et sa croix, demande de recadrage, repère hors écran, retour à la carte du
  monde, tap de fin de glissé ignoré.
- **Contrôle hors harnais**, sur le jeu réel (Chromium en mode mobile, 390 × 844) :
  ouverture en Couvrant, pincement ×2, vue conservée après un `renderAll()`, classe du corps
  retirée à la fermeture, aucune erreur de page.

## Fichiers

Modifiés :
- `sw.js`
- `js/core/constants.js`
- `js/ui/living-map-view.js`
- `css/04-panel-living-map.css`
- `js/ui/ui-root.js` (une ligne : synchronisation de la classe du corps dans `switchTab`)
- `round-harness.js`

Nouveau : `images/Maps/desert.jpg`.

Aucun fichier protégé n'est modifié.

## Contrôles

| Contrôle | Résultat |
|---|---|
| round-harness.js | 2536 à 2538 OK, 0 échec sur 3 passages* |
| boot-harness.js | 4 OK, 0 échec |
| hero-creation-harness.js | 44 OK, 0 échec |
| sim/forest-bench.js --diff | écart nul |
| node --check | tous les fichiers modifiés |

\* La section [85] v3.287.0 est sautée : ce lot n'est pas intégré au projet. Le nombre de
contrôles réussis varie d'un passage à l'autre, et cette variation existait déjà avant ce lot.

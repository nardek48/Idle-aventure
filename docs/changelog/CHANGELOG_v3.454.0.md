# Aethervale v3.454.0 — Crypte, lot C-3 : acte II « Les Sépulcres »

Texte de l'acte II validé par Seb le 19/10/2026 (document « Crypte — Acte II »), avec l'option A pour l'ennemi qui réveille (le Nécromancien). Cartes de Seb du 19/10 : deux cartes de Petite Aventure, la carte vivante. S'applique sur la v3.453.1.

## Les cinq étapes
6. **La lampe de Sarkel** — première Petite Aventure de la Crypte :
   - **l'obscurité** : on ne voit que la rangée devant soi ;
   - **la Lanterne de Sarkel** : gratuite, une mèche, deux rangées de plus pendant 3 pas ;
   - **le gardien qui dort** : on fait le tour (destination atteinte sans son coffre) ou on le réveille.
7. **Ceux qu'on laisse** — la **carte vivante de la Crypte** (14 couloirs autour de la Veillée) :
   - **les gisants** : au départ, on les laisse ou on les réveille (×1,3 de difficulté, +2 Cire de sépulcre à la destination) ;
   - **Le réveil** : un échec ne reprend rien, le couloir reste hostile (×1,25) jusqu'au lendemain ;
   - l'obélisque tenu donne un pas de Lanterne de plus.
8. **Celui qui appelle** — **l'appel du Nécromancien** : il annonce, puis réveille au tour suivant le dormeur le plus proche de se lever (sans or en plus), et ne frappe pas ce tour-là. C'est un soutien (réglage « Cible »). Actif partout dans la Crypte à partir de cette étape, où son tutoriel l'explique : l'acte I ne change pas.
9. **Les alcôves du fond** — palier Rare : 7 emplacements Rares ou mieux (l'Épique compte), arme reforgée à 8 ; « Ce qui manque » dit où chercher.
10. **Ceux qui sont tenus** — fin de l'acte : la chaîne, la porte basse.

Les étapes 6 à 8 donnent chacune une pièce Rare. Plafond de talents de l'acte II : 17.

## Mesures (banc)
- **Petite Aventure** (`pa2-bench --crypte`, 100 runs, héros niv. 17) : avec les ennemis des cartes à ×0,7, 85 à 89 % de destinations atteintes, 3 à 9 % de KO, 3,7 min. Comparaison Ruines : 92 à 99 %, 1 à 8 %.
- **Quêtes** (`crypte-acte2-bench.js`, nouveau, 20 runs, sans potion, en laissant dormir) :
  - « Celui qui appelle » à PV ×1,6, puissance ×4,0 : 100 % de réussite, 3,7 à 5,2 rounds, 43 à 70 % des PV restants ;
  - « Ceux qui sont tenus » au profil du palier, ×1,8 / ×4,4 : 95 à 100 %, 3,7 à 5,1 rounds, 54 à 72 % des PV restants.
- Même limite qu'à l'acte I : viser 25 à 35 % des PV restants fait mourir le Chevalier sans potion. Le réglage est gardé un cran au-dessus.
- **Palier** : au profil de campagne (arme du Cœur, cinq Rares, reforge 8), les trois pièces des étapes 6 à 8 suffisent presque à le passer. Le risque est qu'il soit trop facile plutôt que trop long ; à juger en jeu.

## Code
- **Petite Aventure** : `pa2-content.js` (Lanterne, gardien qui dort, textes de la Crypte, accroche « la lampe qui manque »), `pa2-maps.js` (`crypte_1`, `crypte_2`), `scene-nodes.js` (5 gabarits), `scene-templates.js` (`petite_aventure_crypte`), `pa2-run.js` (obscurité, Lanterne, faire le tour, gisants), `pa2-view.js`.
- **Carte vivante** : `living-maps.js` (`crypt`), `living-map-system.js` (`isHostile`, Le réveil, départ avec gisants réveillés), `living-map-view.js` (choix laisser / réveiller), `expeditions-view.js` (vignette).
- **L'appel** : `sleep-system.js` (`onCall`), `enemies.js` (le Nécromancien : `support`, `calls`), `combat-states.js` et `combat-screen-view.js` (état « Appel »).
- **Histoire** : `story-quests.js` (étapes 6 à 10, palier, récompenses), `adventure-quests.js` (`aq_crypte_appel`, `aq_crypte_chaines`), `world-caps.js` (talents 17).
- Mémoire : *Mèche longue* (+2 pas de Lanterne) et *Cire chaude* sont maintenant actives.
- `en.js` (204 textes), `data-fields.js`.
- Images ajoutées (non précachées, comme toutes les images) : `Maps/pa2/crypte_1.jpg`, `Maps/pa2/crypte_2.jpg`, `Maps/crypte.jpg`. **Aucun fichier JS ou CSS ajouté** ; aucun fichier protégé touché.
- Outils : `pa2-bench.js --crypte [--reveiller]`, `crypte-acte2-bench.js` (nouveau), harnais [242], contrôle des icônes v2 avec une liste « à fournir ».

## Images à fournir (icône générique en attendant)
`Icons/scene/items/item_lantern.png` (la Lanterne de Sarkel), `Icons/combat_status/calling.png` (l'état « Appel »).

## Limites connues
- Le robot de campagne (`campagne-harness`) s'arrête après `crypte_05` : il ne sait pas encore jouer les étapes 6 à 10.

## Contrôles
- `node --check` ; `round-harness` 4360 OK, 0 échec (5 passes), nouvelle section [242] ; boot 4/4, création 44/44, parcours P11 15/15 ; i18n 0 manquant, 0 orphelin.

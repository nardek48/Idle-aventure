# v3.720.0 — Pastilles d'achat cuivre (P1), actions de ligne, deux lignes automatiques

Atelier `atelier/boutons-pastilles.html`, choix de Seb le 06/11 (« P1 c'est cohérent avec le jeu »). Suite de v3.719.0. Aucun état sauvegardé nouveau, aucun fichier ajouté.

## Livré

- **Pastille P1** (`css/00-kbtn.css`) : le bouton cuivre du pack en miniature (36 px de haut, bouts de 18 px, 96 px de large au moins), texte crème, chiffres alignés (`lining-nums tabular-nums`). Pour tous les prix (`.kbuy` : Boutique d'équipement, Amélioration, Potions, Éclats de l'Enchanteresse) et les deux actions de ligne qui avaient leur propre style : « Préparer » des Potions (`.btn-buy.potion-craft-btn`, bleu) et « Relancer » de l'Enchanteresse (`.forge-row-btn`, orange plat). Pressé : enfoncé et assombri ; non payable : désaturé (inchangé).
- **Deux lignes automatiques** (`js/ui/ui-root.js`) : un bouton du pack dont le libellé passe sur deux lignes reçoit `is-2l` et prend la version haute (60 px). Mesure par lignes du texte (`Range.getClientRects`), à chaque changement de taille (`ResizeObserver`) ; les nouveaux boutons sont repérés après chaque ajout d'éléments à la page (`MutationObserver`), les boutons retirés ne sont plus observés. Dans une rangée de deux boutons, le voisin prend la même version.
  - Corrige le défaut de v3.719.0 : dans la fenêtre « Niveau », « Placer les points » débordait du bouton une ligne à 390 et 320 px.
- **Format large** (`css/10-grand-ecran.css`) : « Tout récolter » de la Chronique (`.chr-harvest`) et « Voir le tableau complet » de la carte Missions (`.cw-btn`) passent au parchemin du pack, comme sur téléphone.
- Quoi de neuf : une ligne FR + EN.
- `tools/harness/round-harness.js` : [175] (pastille cuivre au lieu de la pièce d'or), [265] (`ResizeObserver`, `MutationObserver` en liste blanche des API du navigateur), [480] (sélecteur deux lignes) mis à jour ; [481] (nouveau, 4 contrôles).

## Contrôles

- `node --check` sur chaque JS modifié.
- `round-harness.js` : 6 657 OK, 0 échec (deux passes) ; `boot-harness.js` 4/0 ; `hero-creation-harness.js` 44/0 ; `parcours-harness.js` 232/0.
- Captures Chromium à 390 et 320 px (fenêtre Niveau, Boutique, Potions, Relance, Amélioration) et 1280 px : aucun débordement.

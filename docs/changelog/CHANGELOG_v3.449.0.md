# Aethervale v3.449.0 — « Comme la dernière fois »

Prochain chantier décidé le 10/10. Décision de Seb du 12/10 : option A (un bouton, rien n'est recoché sans le demander), souvenir gardé dans la sauvegarde du héros. Accord de Seb pour toucher `save-system.js`. S'applique sur la v3.448.11.

## Ce qui change
- **Préparation de sortie** : un bouton **« Comme la dernière fois »**, juste avant les Objets, avec la liste du dernier départ (« Potion de Force, Huile de lame »).
- Un toucher recoche les **potions à bonus** et les **objets de combat** du dernier départ, s'ils sont en stock (et dans la limite des places d'objets).
- Ce qui ne peut pas être repris est nommé : « Plus en stock : Huile de lame ». Une potion déjà bue pour la sortie n'est pas recochée.
- Le souvenir n'est pris qu'au départ (« Partir »), et seulement si le départ emportait au moins une potion à bonus ou un objet : un départ « à vide » n'efface pas le précédent.
- Le mode, les règles, la cible, la potion automatique et l'équipe étaient déjà gardés d'un départ à l'autre : rien ne change pour eux.

## Sauvegarde (nouvel état)
- `game.lastSortiePrep = { buffs: [...], items: [...] }`, propre à chaque héros :
  - `core/state.js` : `null` par défaut ;
  - `save-system.js` (protégé, accord de Seb) : `buildSaveData`, `restoreBaseState` (`restoreLastSortiePrep` écarte les identifiants inconnus), `fullResetState`.
- Note : `hardResetState`, cité par CLAUDE.md, n'existe plus dans le code ; les points réels sont les trois ci-dessus et l'état initial.

## Code
- `js/ui/sortie-prep-view.js` : `buildSortiePrepAgainHTML`, `sortiePrepAgain`, souvenir pris dans `confirmSortiePrep`.
- `css/04-panel-sortie-prep.css` : `.sp-again`.
- `js/lang/en.js` : 2 textes.
- `tools/harness/round-harness.js` : section [236] (8 contrôles).
- Aucun fichier ajouté.

## Contrôles
- Chromium (390 × 844) : premier départ (Potion de Force, Huile de lame), rechargement de la page, seconde préparation → bouton présent, l'Huile recochée ; avec une seule Huile consommée, « Plus en stock : Huile de lame ».
- Round : **4 276 OK**, 0 échec, sur trois passes. Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK. Campagne : 59 OK. i18n : 100 %, 0 orphelin.

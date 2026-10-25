# v3.485.0 — Textes en dur, rations des patrouilles, ménage de la sauvegarde

Les trois points proposés après la refonte de l'économie. Seb a validé les trois (« Tu peux faire les 3 points directement ») et donné son accord pour les fichiers protégés.

## 1. Textes français en dur
- L'outil d'audit annonçait environ 85 textes en dur. Après tri, presque tous étaient déjà traduits : l'outil ne reconnaissait pas un `_t(...)` dont les paramètres contiennent eux-mêmes des parenthèses.
- **Deux vrais textes en dur, corrigés :**
  - Journal de la carte vivante : il affichait des identifiants bruts (« Carte : steles -> recouvert (noms déterrés) »). Il affiche maintenant le nom du secteur et son état, traduits (« Carte : Pont du gué — Recouvert. »).
  - Phase de boss sans libellé propre : « change de rythme » passe par la traduction (« changes pace »).
- **Outil `tools/audit/i18n-audit.js` :**
  - il retire les appels entiers, parenthèses imbriquées comprises ;
  - il ignore les messages de développement (`console.*`, `TouchDebug.note`) ;
  - il ignore les textes voulus en français (le nom « Français » et la bascule de langue) ;
  - « × » et « ÷ » ne comptent plus comme du français ;
  - nouvelle option `--hardcoded` : la liste détaillée des textes en dur.
- Résultat : 0 texte en dur sur les écrans du joueur (avant : ~85 annoncés).

## 2. Patrouilles : les ingrédients de rations à part
- Les ingrédients de rations (10 viandes en Forêt, 15 viandes + 1 pain ensuite) sont tirés à part du butin.
- Un rappel avant la fin ne les verse jamais, y compris au Campement ou dans un autre secteur qui donne déjà de la viande. Avant, ils se mêlaient au butin et le rappel en versait une part.
- **Correction d'un défaut de la v3.484.0 :** au chargement, une patrouille partie avant la mise à jour perdait sa Viande séchée en route. Elle arrive maintenant en viande (1 = 5).

## 3. Ménage
- `save-system.js` ne recrée plus `farine: 0`. Fichier protégé, modifié avec l'accord de Seb ; changement minimal : 3 valeurs par défaut et 1 garde.
- L'audit CSS signalait 3 classes (`t-now`, `tt-class-archer`, `tt-class-mage`). Elles sont utilisées : leur nom est construit dans le code. Rien n'est retiré.

## Code
- `systems/living-map-system.js` : journal de `setState`.
- `systems/boss-moment-system.js` : libellé de repli traduit.
- `systems/patrol-system.js` : `roll` rend `ration` ; `start` le garde ; `collect` le verse ; `restore` garde `ration` et convertit les ressources retirées.
- `systems/save-system.js` : plus de Farine.
- `lang/en.js` : 2 textes ajoutés.
- Aucun fichier ajouté. Nouvel état : `ration` dans chaque patrouille en cours (`game.patrols`). Il passe par la sauvegarde existante, et `PatrolManager.restore` le relit.

## Outils
- `round-harness.js` :
  - nouvelle section [307] (7 contrôles : rations à part au tirage, rappel au Campement, patrouille finie, chargement d'une patrouille d'avant le lot S, journal de la carte, libellé de boss, sauvegarde) ;
  - section des patrouilles mise à jour.
- `tools/audit/i18n-audit.js` : voir le point 1.

## Contrôles
- round-harness 4911 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
- i18n : 100 %, aucun orphelin, 0 texte en dur sur les écrans du joueur.

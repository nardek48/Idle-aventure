# v3.709.0 — Tir perforant « traverse » ; icônes de l'Amélioration (forest_03)

Décisions de Seb (05/11). Aucun état sauvegardé nouveau, aucun fichier ajouté.

## Corrigés / livrés

- **Tir perforant (Rôdeur), trait « traverse »** : la flèche traverse, le premier ennemi debout autre que la cible (ni mort, ni à terre, ni endormi) reçoit le même coup : même dégât avant réductions (critique, talents, miroir et « Un pas de côté » compris), même critique, sans effets ni second déclenchement des talents de critique. Seul face à un ennemi : rien ne change. Mécanique reprise à l'identique du banc `tools/sim/tir-perforant-bench.js` (variante « traverse »).
  - Donnée : `traverse: true` sur `archer_piercing_shot` (`js/data/class-skills.js`) ; moteur : `applyDamageAction` note le premier coup, puis `applyTraverse` (`js/systems/class-combat-system.js`, non protégé). `combat-engine.js` n'a pas été modifié.
  - Description FR/EN : « Inflige 200% des dégâts. La flèche traverse : un second ennemi debout reçoit le même coup. Coûte 50 Concentration. » (clé anglaise remplacée, `js/lang/en.js`). Mesuré dans Chromium : fiche de compétence 3 lignes à 320 et 390 px (2 en anglais à 390), Grimoire 4 lignes à 320, 3 à 390, aucun débordement.
  - Écran de combat (Chromium, 390 px, deux ennemis) : un chiffre flottant sur chaque ennemi, chacun dans la boîte de son ennemi.
  - `ignoreAffinity` gardé : il n'est pas mort, il exempte encore Tir perforant du malus « sans arme » (−20 %). Le retirer changerait une règle (à trancher par Seb).
  - Pronostic (`combat-forecast-system.js`) inchangé : il compte le kit par `damageMultiplier` moyen (sans même compter les 3 coups de Rafale), et ce multiplicateur sert aussi à la mise à l'échelle des ennemis et aux Petites Aventures. Le gain va aux ennemis secondaires : sur la cible principale, +0 à +1 % au banc (Dragon 10 277 → 10 388 dégâts/round).
- **IMG-FOREST03** : tutoriel de forest_03 « L'Amélioration », Précision prend `images/Icons/improvement_icons/accuracy.webp` et Volonté `images/Icons/improvement_icons/will.webp` (celles d'Héros › Stats) au lieu de `stat_critical.webp` en double. `js/data/story-quests.js` **(protégé)**, deux chemins d'icône.
- Quoi de neuf : une ligne FR + EN (`js/ui/news-view.js`, `js/lang/en.js`).
- `tools/harness/round-harness.js` : [475] (nouveau, 10 contrôles) : trait porté par Tir perforant seul, second ennemi touché du même coup, troisième intact, mort ignoré, à terre et endormi ignorés, seul ennemi inchangé, Tir précis inchangé, description et clé anglaise, icônes de forest_03 sans double et présentes sur disque.

## Mesures

`node tools/sim/tir-perforant-bench.js . --variante actuel` après intégration, mêmes sauvegardes et tirages que le relevé de décision (variante « traverse ») :

| Contenu | Avant (jeu v3.708) | Banc « traverse » | Jeu v3.709 |
|---|---|---|---|
| D4 Liche (niv. 22, 40 runs) | 100 %, 2 897 dégâts/round, part TP 11 % | 100 %, 3 057, 18 % | 100 %, 3 046, 17 % |
| D5 Wyrm (niv. 26, 40 runs) | 95 %, 10 151, 14 % | 100 %, 10 845, 19 % | 100 %, 10 850, 19 % |
| Dragon (niv. 26, 120 runs) | 78 %, 10 068, 18 % | 91 %, 11 297, 27 % | 91 %, 11 297, 27 % |

Dragon identique au banc ; D4 et D5 à 0,4 % près (le banc jouait « traverse » après quatre autres variantes dans le même processus).

## Hors version du jeu

- `tools/sim/tir-perforant-bench.js` : note « depuis v3.709.0, actuel inclut traverse ».

Contrôles : round 6 620 OK (2 passes, avant 6 610), boot 4 OK, création 44 OK, parcours 232 OK, i18n 100 % / 0 orphelin. `node --check` sur chaque JS modifié. Fichier protégé touché : `js/data/story-quests.js` (accord de Seb). Aucun fichier ajouté.

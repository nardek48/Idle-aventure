# v3.630.0 — Tour, lot T-4a : acte IV, « Seul », la faille, la silhouette

Première moitié de l'acte IV « La Question » (étapes 16 à 18, textes validés par Seb). Après l'étape 18 : « La suite de l'histoire arrive bientôt… ». Seconde moitié (T-4b) : la vision, la Question (prix par axe), Azhem, l'épilogue.

## Décisions de Seb (02/11)
- **Prix des bascules de la Question** : un prix par axe (sera codé en T-4b).
  - Basculer Donner/Garder rend Le fil bleu.
  - Basculer Soi/Aeswyn : un ancien manque au dernier feu.
- **Silhouette à 30 %** : le bouclier de boss existant (2 rounds à −50 %). Le vrai round intouchable viendra dans un deuxième temps (il touche `combat-engine.js`).

## Les trois étapes
16. **Seul** : `aq_tour_seul`, trois rencontres sans compagnon. Tutoriel « Seul ».
17. **La faille** : parcours de cinq paliers (`faille_tour`, coût 1 Grande ration), seul.
    - Piste provisoire, image à générer (`images/Maps/parcours/tour_faille.webp`).
18. **La silhouette** : `aq_tour_silhouette`, boss d'Histoire seul. Tutoriel « La silhouette ».
    - **100 %** : elle prend le trait de ta classe.
      - Chevalier : enragée.
      - Rôdeur : blindée. Au banc, la corruption rendait le combat impossible quel que soit le réglage.
      - Mage : elle fait taire.
    - **60 %** : le miroir (comme le Reflet).
    - **30 %** : la lumière passe à travers elle (bouclier de 2 rounds).
    - Fiche de boss propre (base Archimage, `images/Boss/silhouette.webp` à générer, icône générique en attendant). L'Archimage garde son image.

## Seul (TW5)
- `TowerSystem.isSolo()` : une quête ou un parcours marqué `solo` en cours, alors `CompanionManager.partyIds()` est vide.
- Correctif nécessaire : un ennemi seul (boss de quête) ne reconstruit pas le groupe au départ. Les compagnons du combat précédent restaient donc en jeu. `spawnRunEnemy` rafraîchit maintenant le groupe pour une quête « seul ».

## Équilibrage (banc `montagne-acte3-bench.js --quetes`, sauvegardes de fin d'acte III)
- **Seul** : PV ×2,75, puissance ×6,5. Réussite de 94 à 100 %. À ×3,5 / ×8, le Mage tombe à 25 %.
- **La silhouette** : PV ×3,75, puissance ×1. Avec le contre de sa classe au Grimoire, 100 % de réussite pour les trois classes. Au-delà, le combat bascule net (×4,5 / ×1,1 : Chevalier 0 %, Rôdeur 25 %). Sans le contre de la rage, le Chevalier tombe à 63 %.
- Campagne au robot (`--joueur`, contre posé avant la silhouette) : 26 contrôles, 0 échec pour les trois classes.

| PV en fin de quête | Chevalier | Rôdeur | Mage |
| --- | --- | --- | --- |
| Seul | 50 % | 46 % | 53 % |
| La silhouette | 11 % (3 potions) | 51 % | 67 % |

## Code
- `systems/tower-system.js` : `isSolo`, `onBossPhase`, `TOWER_CLASS_ARCHETYPE`, miroir porté par `foe.mirror`.
- `systems/companion-system.js` : `partyIds` vide quand on est seul.
- `systems/boss-moment-system.js` : phases de la Tour.
- `systems/adventure-quest-system.js` : groupe rafraîchi pour un boss seul.
- `data/bosses.js` : `silhouette`.
- `data/adventure-quests.js` : `aq_tour_seul`, `aq_tour_silhouette`.
- `data/scene-templates.js`, `scene-nodes.js` et `pa2-maps.js` : la faille.
- `data/story-quests.js` : `tour_16` à `tour_18`.
- `lang/en.js` : 47 textes.
- Aucun fichier protégé, aucun fichier ajouté.

## Outils
- `round-harness.js` : [425].
- `campagne-harness.js` :
  - gestes `tour_16` à `tour_18` ;
  - `REGLE_EN_TETE` : le contre d'un boss gardé en tête du Grimoire malgré l'entretien.
- `montagne-acte3-bench.js` : `--qboss` pour tout boss de quête, combats sans fin comptés à part, rounds moyens.

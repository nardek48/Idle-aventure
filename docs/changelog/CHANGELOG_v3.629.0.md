# v3.629.0 — Tour, lot T-3 : l'acte III « Ce qu'elle a appris »

Étapes 11 à 15 (textes validés par Seb). Après l'étape 15 : « La suite de l'histoire arrive bientôt… ».

## Les cinq étapes
11. **Le Sommet interdit** : le donjon 6 s'ouvre. Atteindre le campement (après la vague 8). Tutoriel « Le miroir ».
12. **Le reflet** : vaincre le Reflet, boss du Sommet. Récompense : une pièce Légendaire.
13. **Le Légendaire complet** : les **7 emplacements en Légendaire** (TW7). La **Forge 7** (Verre de faille) s'ouvre à cette étape. Tutoriel « Le Légendaire complet ».
14. **Aeswyn d'avant** : choix `copie`.
   - *Le laisser debout* (axe donner) : le Sommet interdit devient plus dur (×1,2) et rapporte deux fois plus de Givre bleu.
   - *Le défaire* (axe garder) : +6 Verres de faille.
15. **Le haut de l'escalier** : `aq_tour_haut`, quatre rencontres.

## Le Sommet interdit (donjon 6)
- Givre bleu ×3, ennemis de la Tour, **le Gardien qui répète à la vague 8**, campement après la 8e.
- Boss **le Reflet** (base archmage, vampirique). Image à générer (déjà listée) : vrai chemin gardé, icône générique en attendant.
- **Le miroir (TW2)** : le Reflet et le Gardien qui répète gardent ta dernière technique. La même, utilisée juste après contre eux, perd 25 %.
  - Règle retenue : « même technique que la précédente », pas « deux rounds de suite », à cause des recharges.

## Équilibrage (banc `montagne-acte3-bench.js --donjon 6`, sauvegardes à l'entrée de l'étape 11)
- Le premier réglage (difficulté 30, Reflet 1/1) laissait 75 à 91 % des PV : le Sommet était trop facile.
- Monter seulement la difficulté faisait du Reflet un mur pour le Chevalier : sa vampirisation gagne la course aux soins.
- Réglage retenu : **difficultyMult 70, Reflet puissance 0,6 / endurance 0,5**. PV en fin de sortie, avec la règle « ennemi vampirique » au Grimoire :

| Chevalier | Rôdeur | Mage |
| --- | --- | --- |
| 42 %, 100 % de victoires | 93 % | 73 % |

  - Sans la règle « ennemi vampirique », le Chevalier ne gagne que 56 % du temps : le contre est la leçon du boss.
- `aq_tour_haut` : PV ×4,5, puissance ×9. Réussite de 94 à 100 % ; au-delà, la quête bascule net (×6 : Chevalier 8 %).
- Campagne au robot (`--joueur`, reprise à l'entrée de la Tour) : 23 contrôles, 0 échec pour les trois classes. Acte III en 0,1 à 0,8 h simulée.
- Le Rôdeur reste très à l'aise partout : à juger en jeu.

## Code
- `systems/tower-system.js` : miroir (`isMirror`, `mirrorMult`, `noteSkill`), effets du choix copie (`summitHardMult`, `summitLootMult`).
- `systems/class-combat-system.js` : le miroir est lu avant les dégâts d'une technique et noté après.
- `systems/dungeon-system.js` (protégé, accord de Seb) : échelle des vagues et Givre bleu multipliés selon le choix copie.
- `data/dungeon.js` : le donjon 6 est ouvert par l'Histoire (`tour_11`).
- `data/story-quests.js` : `tour_11` à `tour_15`, `STORY_PALIER_TOUR_COMPLET`, `STORY_COPIE_TEXTS`, axe `copie`.
- `data/adventure-quests.js` : `aq_tour_haut`.
- `lang/en.js` : 58 textes.
- Aucun fichier ajouté.

## Outils
- `round-harness.js` : [424] ; [32b], [47b], [292], [353], [420] mis à jour.
- `campagne-harness.js` :
  - gestes `tour_11` à `tour_15` (`--defaire` pour le choix copie) ;
  - le robot avisé pose aussi la règle « ennemi vampirique ».
- `montagne-acte3-bench.js` : options `--donjon`, `--miroir`, `--plus-regle cond:slot`.

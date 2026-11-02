# v3.626.0 — Tour, lot T-1 : acte I « Le pied de la Tour »

Le chapitre VI s'ouvre à la fin de la Montagne. Ses cinq premières étapes suivent « Chapitre VI : textes » v0.1, validé par Seb (02/11/2026, sans modification).

## Les cinq étapes
1. **Vers le nord** : la route du nord, un parcours de quatre paliers (la plaine grise, l'air immobile, deux gardiens, la porte ouverte). Deux Grandes rations. Le monde est posé à l'arrivée (`travelOnSuccess` vers la Tour, drapeaux `towerReached` et `towerCrossingCompleted`). L'ouverture du chapitre VI (trois planches, « La Question ») se joue à la fin de l'étape.
2. **Ce qui garde le pied** : cinq rencontres avec les gardiens (`aq_tour_pied`).
3. **La porte que personne n'a construite** : le dernier camp, 400 Bois et 2 Grandes rations donnés depuis la carte d'étape (« Dresser le camp »). Maddoc tient la porte.
4. **Le premier étage** : l'étage du sable, quatre rencontres avec les bêtes du Désert comme la Tour s'en souvient (`aq_tour_sable`). Le Désert n'a pas de règle de combat propre : l'écho passe par ses ennemis.
5. **Celui qui attend** : le Veilleur revient. Premier choix pesant de la Tour, clé `braise` :
   - *La garder* (Garder + Aeswyn) : à la Tour, chaque combat gagné rend 5 % des PV ;
   - *La poser sur le palier* (Donner + Soi) : à la Tour, +10 % de dégâts.
   Les deux effets figurent dans Héros › « Ce que tu portes ».

Après l'étape 5 : « La suite de l'histoire arrive bientôt… ».

## Équilibrage (au banc, sans potion)
Banc `tools/sim/tour-acte1-bench.js` sur les vraies sauvegardes d'entrée de la Tour des trois classes (campagne `SAVE_MONDES`). Réglage retenu : PV ×2,5, puissance ×6.

| Quête | Réussite (Ch. / Rô. / Ma.) | PV restants | Rounds par combat |
| --- | --- | --- | --- |
| Le pied de la Tour | 100 / 100 / 100 % | 94 / 97 / 79 % | 7,5 / 4,3 / 6,7 |
| L'étage du sable | 100 / 100 / 100 % | 90 / 95 / 94 % | 7,8 / 4,4 / 6,8 |

- **Plus facile que la cible** (25 à 35 % des PV) : à puissance ×8, le Mage tombe d'un coup (17 % de réussite au pied) ; plus de PV allongerait des combats déjà longs pour le Chevalier (les gardiens résistent à l'épée). À juger en jeu.
- Le Golem arcanique seul (résiste à la magie, réduit au silence) écrasait le Mage : la troisième rencontre du pied est un Hybride (faible à la magie).
- **Campagne au robot** (`--combats --joueur`, réglage plus dur d'avant le banc) : les trois classes passent les cinq étapes, 107 contrôles, 0 échec.

## Code
- `data/story-quests.js` : chapitre `tower`, récompenses `tour_01` à `tour_05` (provisoires), choix `braise` et ses textes, axe dans `STORY_CHOICE_AXES`.
- `data/scene-templates.js` : `traversee_tour` ; `data/scene-nodes.js` : trois gabarits de la route ; `data/pa2-maps.js` : piste provisoire `tour_route` (image à générer).
- `data/adventure-quests.js` : `aq_tour_pied`, `aq_tour_sable`.
- **Nouveau fichier** `systems/tower-system.js` (règles de la Tour : la braise), lu par `VeinSystem.bladeMult` et `VeinSystem.onVictory`, déjà appelés par le moteur ; ajouté à `index.html` et au précache de `sw.js`. Aucun fichier protégé touché.
- `data/chapter-openings.js` : ouverture du chapitre VI (images à générer, fond animé en attendant).
- `data/worlds.js` : la Tour suivie comme la Montagne (ajustement au héros, ennemis des quêtes) ; `systems/provisions-system.js` : Ration moyenne à la Tour.
- `ui/heros-screens-view.js` : les deux effets de la braise.
- `lang/en.js` : 100 textes ; `lang/data-fields.js` : `STORY_BRAISE_TEXTS`.

## Images manquantes (icône générique ou fond animé, vrais chemins gardés)
Givre bleu, Verre de faille, la braise d'Aeswyn, le fond de la route du nord (ajouté à « Images à générer »), les trois planches de l'ouverture.

## Outils
- `round-harness.js` : [421] ; [262], [353], [418] mis à jour.
- `campagne-harness.js` : le chapitre `tower` et ses gestes (route, quêtes, dernier camp, choix ; `--poser`).
- `tour-acte1-bench.js` : nouveau banc.

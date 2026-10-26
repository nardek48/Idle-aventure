# v3.498.0 — Chantier du héros, H4 : les reliques des compagnons

Fin de H4 (conception `systemes/Aethervale_Conception_Heros_v0_1.md`). Décisions de Seb du 26/10 : R1 (source : les patrouilles), emplacements aux paliers 5 / 15 / 25, six familles, atelier `atelier/reliques-compagnons.html` variante A (feuille du bas).

## Ce qui change en jeu
- **Trois emplacements de relique** par compagnon, ouverts aux paliers 5, 15 et 25 de son entraînement.
- **Source : les patrouilles.** Chaque heure terminée donne 4 % de chance (8 h : 28 %), et 24 h cumulées sans relique en garantissent une.
  - La famille est tirée au hasard ; le monde est celui du secteur patrouillé.
  - Force de la relique = rang du monde (Forêt 1 … Montagne 5).
  - Rien au rappel anticipé.
- **Six familles**, une seule par compagnon :

| Famille | Effet par rang | Rang 5 (Montagne) |
| --- | --- | --- |
| Croc | +3 % dégâts | +15 % |
| Écorce | +3 % PV | +15 % |
| Sceau | +6 % menace | +30 % |
| Sablier | recharge −1 (−2 au rang 5) | −2 |
| Talisman | le héros +1 % de dégâts, si le compagnon est présent | +5 % |
| Besace | +5 % butin de patrouille | +25 % |

- **Sablier, écart avec l'atelier** : « Prête au départ » ne servait à rien, les compétences partent déjà prêtes au 1er round. Il raccourcit donc la recharge, sans descendre sous 1 round.
- **Fiche du compagnon** : bloc « Reliques n / m » sous l'entraînement.
  - Emplacement fermé : cadenas et « Palier n ».
  - Emplacement vide : « + Équiper ».
  - Emplacement plein : icône, pastille du monde, nom et effet.
- **Feuille « Reliques »** : l'inventaire trié par famille puis par force.
  - Boutons Équiper, Retirer ou « Famille prise ».
  - Une relique portée par un autre compagnon lui est retirée (toast).
  - Retour à la fiche, sur le bloc des reliques.
- Butin de patrouille : la relique trouvée apparaît dans le récapitulatif.
- **Images** : les six icônes (`images/Icons/companions/relics/relic_<famille>.webp`) sont à fournir. L'icône générique s'affiche en attendant.

## Mesures
- **Fréquence** (vrai tirage, 2 000 essais sur 30 jours) :
  - 1 patrouille de 8 h par jour : 0,44 relique par jour, 3 par semaine ;
  - 4 patrouilles (8 + 4 + 8 + 4 h) par jour : 1,4 par jour, 10 par semaine ;
  - 6 patrouilles de 8 h par jour : 2,7 par jour, 19 par semaine.
- **Combat** : banc `montagne-acte3-bench.js`, sauvegardes de la campagne H4, compagnons au palier 25, sans potion, 30 runs par classe (Chevalier / Rôdeur / Mage).

| Gueule du volcan | Sans relique | Croc + Talisman + Sablier | Écorce + Sceau + Croc |
| --- | --- | --- | --- |
| PV restants après le Wyrm | 48 / 65 / 49 % | 59 / 68 / 63 % | 53 / 64 / 54 % |
| Rounds | 41 / 31 / 37 | 37 / 28 / 34 | 39 / 30 / 36 |
| Coups encaissés par le héros | 79 % | 79 % | 76 % |

  - Victoires inchangées (100 %).
  - Le jeu offensif rapporte le plus. Le Talisman de deux compagnons présents donne +10 % de dégâts au héros.

## Code
- **Fichier ajouté : `js/systems/companion-relic-system.js`**, dans `index.html` (après `companion-system.js`) et dans le précache de `sw.js`.
  - `CompanionRelics` : `slotsOpen`, `worn`, `active`, `equip`, `unequip`, `sum`, `cooldownCut`, `heroDamageBonus`, `rollPatrol`.
- `data/companions.js` : `COMPANION_RELIC_SLOTS_AT`, `COMPANION_RELIC_CHANCE_PER_H`, `COMPANION_RELIC_PITY_H`, `COMPANION_RELIC_FAMILIES`, `COMPANION_RELIC_ORDER`.
- `systems/companion-system.js` : Croc et Écorce dans `statsOf`, Sceau dans `buildActor`, Sablier dans `skillOf`, état `relics` sauvegardé et relu.
- `systems/talent-system.js` : Talisman dans `heroDamageMult`.
- `systems/patrol-system.js` : Besace dans `estimate`, tirage dans `collect`, ligne du récapitulatif.
- **Fichier protégé (accord de Seb)** : `systems/save-system.js`. `companionRelics` est câblé dans `buildSaveData`, `restoreBaseState` et `fullResetState`, avec sa valeur par défaut dans `core/state.js`.
- `ui/companions-view.js` (bloc et feuille), `ui/heros-screens-view.js` (feuille `relic`), `css/04-panel-companions.css`.
- `ui/heros-view.js` : changer de feuille repart en haut. La position de lecture n'est gardée que sur la même feuille.
- `lang/en.js` : 26 textes ajoutés.

## Outils
- `round-harness.js` : section [327] (emplacements, tirage et pitié, effets, une par famille, transfert, Talisman, sauvegarde).
- `montagne-acte3-bench.js` : option `--reliques f1,f2,f3` (ces familles, rang 5, sur chaque compagnon).

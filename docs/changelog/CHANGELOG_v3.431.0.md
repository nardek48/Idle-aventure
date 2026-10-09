# Aethervale v3.431.0 — Ruines, acte III (livraison 2) : la Clé de voûte, le Golem, la salle, Varrek

Fin de l'acte III des Ruines, « Le cœur de pierre ». Textes : document « Ruines — Acte III » v1.0 (validé par Seb le 09/10/2026). S'applique sur la v3.430.0.

## L'histoire : trois étapes de plus (ruines_13 à ruines_15)

| # | Étape | Ce qu'elle fait jouer |
| --- | --- | --- |
| 13 | La clé de voûte | Le palier Rare : 4 emplacements Rares sur 7 (l'arme du Fleuve compte), Forge 4, arme reforgée à 7. Tutoriel « Le palier Rare » |
| 14 | Ce que la cité ne finit pas | La quête : 3 rencontres, puis le Golem. Ensuite, le deuxième choix pesant des Ruines |
| 15 | Le garde scellé | Vaincre Varrek au bout du Sanctuaire |

- Fin de l'acte : « Fin de l'acte III — sous la ville, la carte est finie. »
- Récompenses provisoires :
  - étape 13 : 2 900 or ;
  - étape 14 : 3 000 or ;
  - étape 15 : 3 400 or, 4 Pierres errantes et 1 Clé de voûte.

## Le choix « salle » (Donner / Garder)
Il se pose depuis la carte d'étape, **une fois le Golem vaincu**. Il est noté au registre.

| Branche | Effet | Registre |
| --- | --- | --- |
| **Laisser la salle se fermer** | *La salle scellée* : un frein de 10 % sur l'Éboulement, sur toute la carte des Ruines, tant que la porte du Sanctuaire tient | Garder |
| **Rouvrir la salle** | *Le sceau de la salle* : un anneau Rare unique (critique 5, dégâts +10 %) | Donner |

Les textes de fin d'étape suivent la branche choisie.

## La Clé de voûte et la Forge 4
- **Clé de voûte** : 3 Pierres errantes et 10 Pierre, taillées au Tailleur de pierre. C'est le matériau du monde 3.
- **Forge 4** : 8 000 or, 3 Clés de voûte, Pierre et acier. Comme les trois premiers, ce niveau est aidé par l'Histoire : la Pierre et l'acier sont fournis.
- La Forge 4 ouvre la reforge jusqu'au niveau 8. Les niveaux 7 et 8 coûtent une, puis deux Clés de voûte, à la place de la Chitine.
- Plafonds aux Ruines :
  - Forge 3 → 4 ;
  - Terrain 11 (entraînement 130) et 13 points de talent, dès l'étape 11.
- Varrek a désormais sa propre ligne de journal quand il se relève : « Varrek se relève. Personne ne lui a dit de rester à terre. »

## Équilibrage (banc `tools/sim/ruines-acte3-bench.js`, 24 runs, Wenna + Maddoc)

| Combat | Chevalier | Rôdeur | Mage |
| --- | --- | --- | --- |
| Étape 14 · le Golem de quête (puissance ×2,9, endurance ×2,6) | 71-81 % | 79-81 % | 94-96 % |
| Étape 15 · Varrek (puissance ×0,72, endurance ×0,6) | 75 % | 58 % | 79 % |

- Le Golem de la quête a ses **propres multiplicateurs** (`eliteStatMult`), car le donjon et la quête ne mettent pas l'élite à la même échelle :
  - avec les chiffres du donjon, la quête tombait à 0-25 % de réussite ;
  - le Golem du donjon (vague 12) ne change pas.
- **Le Rôdeur reste à 58 % contre Varrek**, pour une cible de 60 % au moins. Je n'ai pas relancé le banc en boucle : à juger en jeu.
- Le palier n'est pas encore mesuré au robot de campagne. Le temps de farm (Pierres errantes pour 4 Clés, pièces Rares) reste à vérifier en jeu.

## Code
- `systems/elite-system.js` : `opts.statMult`, qui permet à une quête de caler son élite.
- `systems/adventure-quest-system.js` : passe `quest.eliteStatMult`.
- `systems/forge-system.js` : coût des reforges 7 et 8.
- `systems/rise-system.js` : `riseLine`.
- `systems/dungeon-system.js` (fichier protégé, accord du 09/10) : transmet `riseLine` au boss.
- Données :
  - `story-quests.js` : étapes, palier, textes de branche, axes, un choix de carte d'étape qui attend une condition (`ready`) ;
  - `adventure-quests.js`, `elites.js`, `village-buildings.js`, `world-caps.js`, `workshops.js`, `hunt-quests.js`, `living-maps.js`, `dungeon.js` ;
  - `lang/data-fields.js`.
- **Aucun fichier ajouté au jeu. Aucun nouvel état sauvegardé** : le choix passe par le registre existant, et la Forge par le village existant.

## Images à fournir (avec celles de la v3.430.0)
- `images/Icons/resources/cle_de_voute_icon.png` : la Clé de voûte.
- `images/Icons/quest_icons/elite/elite_golem.png` : désormais aussi l'icône de la quête de l'étape 14.

## Contrôles
- Round : **4 014 OK**, 0 échec, sur deux passes. Nouvelle section [207] (24 contrôles). Deux contrôles mis à jour : Forge 4 aux Ruines, étapes 11-12.
- Boot : 4 OK. Création du héros : 44 OK.
- i18n : 4 339 textes, 100 %, 0 orphelin. 58 nouvelles traductions anglaises.
- Chromium (390×844), vrai jeu : la carte du choix de la salle (texte, deux branches), console sans erreur.
- Parcours : 123 OK. L'échec P7 (besace de la Petite Aventure) est **antérieur à la v3.430.0**, inchangé.
- `node --check` sur tous les fichiers modifiés.

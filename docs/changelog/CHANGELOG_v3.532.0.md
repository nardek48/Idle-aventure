# v3.532.0 — Sève de l'Arbre-mère selon le monde atteint (audit, lot 10 : PLA-4)

Décision de Seb : option A du banc `atelier/arbre-mere.html`, mesurée sur 12 campagnes complètes au robot. L'option B, « Régler d'un coup » pour les élites, n'est pas retenue : la règle I4 reste inchangée.

## Ce qui change en jeu
- Une victoire contre une élite répétable rapporte 1 ressource de plus par monde atteint au-delà de celui de sa carte.
- Arbre-mère (Sève d'Aeswyn) : 2 en Forêt, 3 au Désert, 4 aux Ruines, 5 à la Crypte, 6 à la Montagne.
- Dard des profondeurs (Verre des dunes) : 2 au Désert, puis +1 par monde d'avance. Les élites répétables de la Montagne restent à 2.
- Le panneau de l'élite sur la carte affiche le vrai nombre (« Chaque victoire : +5 Sève d'Aeswyn »).
- Le frein du jour et les reforges ne changent pas (décision RE-4 gardée).

## Mesures (6 campagnes par lot, 3 classes × 2 tirages, `--combats`)
| | Avant | Après |
|---|---|---|
| Combats d'Arbre-mère par partie (médiane) | 63 (42 à 72) | **24** (16 à 27) |
| Durée de la partie (médiane) | 21,3 h | 19,7 h |
| Reforges en fin de partie | arme 12, armure 12, le reste 4–5 | identiques |
| Équipement final | épique partout | identique |
| Morts contre l'Arbre-mère | 0 | 0 |

Vérification sur le code livré (Chevalier, une campagne) : 24 combats d'Arbre-mère, 19,7 h, Forge 12/12.

## Code
- `data/living-maps.js` : `repeatableElite.sevePerWorldAhead = 1`.
- `systems/living-map-system.js` : `getRepeatSevePerWin`.
- `ui/living-map-view.js` : le panneau l'affiche.
- Harnais [351].
- Aucun état sauvegardé, aucun fichier protégé ni ajouté.

## Contrôles
- Round : 5 353 OK, 0 échec, sur deux passes.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 6 591 textes, 100 %, 0 orphelin.

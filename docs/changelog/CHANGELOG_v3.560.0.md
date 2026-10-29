# v3.560.0 — Potions de soin majeures : colporteur à 15, Apothicaire jusqu'au niveau 10

Retour de Seb, point 8 : à partir du Désert, le colporteur était à court de majeures (8 bues en 20 minutes au Désert, 12 en 2 heures aux Ruines).

## Changements
- **Colporteur : 15 potions de soin majeures par jour** au lieu de 10 (toujours 600 or pièce).
- **Apothicaire : niveau maximum 10** au lieu de 6, avec un niveau de plus à chaque monde (option N). La règle ne change pas : 4 préparations par jour au niveau 1, +2 par niveau.

| Monde | Niveau max | Préparations par jour | Coût du dernier niveau |
|---|---|---|---|
| Forêt | 2 → 3 | 6 → 8 | 365 or, 36 planches, 44 pierre |
| Désert | 6 → 7 | 14 → 16 | 2 469 or, 82 planches, 82 blocs, 192 pierre, 38 lingots |
| Ruines | 6 → 8 | 14 → 18 | 3 457 or, 115 planches, 115 blocs, 268 pierre, 53 lingots |
| Crypte | 6 → 9 | 14 → 20 | 4 840 or, 161 planches, 161 blocs, 376 pierre, 75 lingots |
| Montagne | 6 → 10 | 14 → 22 | 6 776 or, 225 planches, 225 blocs, 527 pierre, 105 lingots |

- Les niveaux 7 à 10 prolongent la courbe de coût existante (×1,40 par niveau). Ils consomment planches, blocs, pierre et lingots, ce qui offre un débouché aux ressources qui débordent (point 9).
- Au Désert, on peut avoir jusqu'à 15 + 16 = 31 majeures par jour, contre 24 avant. La limite de 2 potions par sortie ne change pas.

## Fichiers
- `js/data/potions.js` : `dailyBuyLimit` 10 → 15.
- `js/data/village-buildings.js` : Apothicaire `maxLevel` 10, palier de coût 3 à 9.
- `js/data/world-caps.js` : Apothicaire 3 / 7 / 8 / 9 / 10.
- `tools/harness/round-harness.js` : contrôles [76], [86] et [87] mis aux nouvelles valeurs, nouveau [375].

Campagne (Mage) : 101 étapes réussies, 17,3 h, 1 mort (le robot ne passe pas par l'Apothicaire : seul le colporteur joue ici).

Aucun fichier ajouté.

# CHANGELOG v3.227.0 — Recalibrage des mondes 1-3 (Lot 3, chantier Équipement multi-affixes)

Base : v3.226.0. Décision D3 (recalibrer les monstres plutôt que réduire les fourchettes).

## Ce qui change

- `WORLD_MULT_BY_WORLD` : `[1.264, 1.637, 1.917, 2.757, 5.418, 7.892]` →
  `[1.264, 2.03, 2.30, 4.19, 5.418, 7.892]`. PV des ennemis normaux et des boss : Désert +23 %,
  Ruines +20 %, Crypte +51 %. Forêt et mondes 4-5 inchangés.
- Mesure (`sim/world-bench.js`, nouveau) : avec un kit réaliste du monde et ses affixes, on
  retrouve les rounds par ennemi de v3.223.0 à ±0,3 (Désert 5,7 / 3,8 / 3,4 · Ruines 6,8 / 5,5 /
  4,2 · Crypte 6,1 / 5,2 / 4,6 pour Chevalier / Rôdeur / Mage).
- `sim/forest-bench-ref.json` ré-enregistrée sur cette version (Chevalier identique à v3.223.0).

## Fichiers modifiés

- `js/systems/progression-system.js` — **PROTÉGÉ, périmètre confirmé par Seb** : la table, 1 ligne.
- `sim/world-bench.js` — nouveau (`--runs N`, `--mult "a,b,c,d,e,f"` pour essayer une autre table).
- `sim/forest-bench-ref.json` — référence mise à jour.
- `round-harness.js` — bloc [36], 5 assertions.
- `sw.js` — `CACHE_VERSION` 3.227.0.

## Documents (hors ZIP, fournis à part)

- `Aethervale_MAJ_Equilibrage_v3_224_0_a_v3_227_0.docx` — complément au Guide v3.207.0.
- `Aethervale_Design_Equipement_Affixes_v1_3.docx` — état livré, points ouverts O9-O12.

## Tests

- `round-harness.js` : 1609 OK, 0 échec. `boot-harness.js` : 4 OK. `node --check` partout.

## À tester sur iPhone

- Une partie au Désert ou aux Ruines : combats plus longs qu'en v3.226.0 avec le même kit
  (~+20 % de PV ennemis), retour au ressenti de v3.223.0 une fois équipé d'objets à affixes.
- Une partie en Forêt : strictement rien ne change.

## Points ouverts

O9 (Chevalier sous la cible de 40 %), O11 (Précision/Volonté universelles quasi mortes),
O12 (mondes 4-5) — voir le document de conception v1.3.

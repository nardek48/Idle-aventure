# v3.744.0 — Élites recalées après la Forge des mondes

Décision Seb 08/11 (option C), banc `tools/sim/forge-mondes-bench.js --kinds elite` (60 parties, Forge pleine).

- `elite-system.js` : `ELITE_HP_BY_WORLD = { crypt: 1.2, mountain: 1.2, tower: 1.25 }`, `ELITE_POWER_BY_WORLD = { tower: 1.15 }`,
  appliqués dans `EliteManager.make` (élites de carte et de quête) ; Désert et Ruines inchangés (le Rôdeur du Désert décroche dès +10 %).
- Victoires élite (Chevalier / Rôdeur / Mage) : Crypte 75/98/98 (avant la Forge des mondes ≈ 72/95/93), Montagne 73/92/98 (≈ 63/80/90),
  Tour 87/83/100 (≈ 82/83/100). Puissance Tour ×1,3 essayée : 65/62/100, écartée.
- Banc : options `--elite-hp` et `--elite-pow`. Harnais : 2 contrôles.

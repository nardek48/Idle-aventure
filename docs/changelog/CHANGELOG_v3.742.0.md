# v3.742.0 — Boss courts allongés, phases annoncées après une victoire

Décisions Seb 07/11 (piste 3 « boss courts », banc `tools/sim/boss-courts-bench.js`, 100 parties par cas).

## Boss plus longs (V3 : PV ×1,5, puissance ×0,8, trait plus tôt)
- **Basilic** (`dungeon.js`, donjon 1) : statMult 1,2/1,5 → 1,8/1,2 ; rage 25 % → 50 %. 13-20 rounds, rage jouée 6-11 rounds.
- **Sphinx** (donjon 2) : 0,8/1,6 → 1,2/1,28 ; phases 66/33 % → 75/50 %. 15-20 rounds.
- **Varrek** (donjon 3) : 0,6/0,58 → 0,9/0,46 ; nouvelle phase Blindé à 50 % « il ferme sa garde » (« Varrek lève son écu scellé. Les coups glissent. »). 19-25 rounds.
- **Nezzam** (`aq_desert_trone`) : bossHpMult 4 → 6, bossPowerMult 1,4 → 1,12 ; phases 60/30 % → 75/50 %. 24-33 rounds.
- **Orc** (`aq_forest_depths`, version douce) : bossId `orcwarlord` posé, bossHpMult 1,75 (×1,25), Blindé à 50 % « il serre sa garde » (« Il ramasse son bouclier. Il ne rit plus. »). 7-11 rounds, ≥ 85 % de victoires sans préparer.
- Donjons rejoués ≈ +10 % de durée.

## Pronostic : les phases d'un boss déjà vaincu
- `combat-forecast-view.js` : `etLaterPhaseTraits` ; un boss vaincu annonce ses traits de phase en cours de combat (étiquette « phase », « en cours de combat : « … » »). Jamais vaincu : surprise (décision v3.378.0 conservée pour le premier combat).
- « Tout préparer » pose d'abord les règles des phases (banc : Rôdeur +9 à +20 pts).
- `sortie-prep-view.js` : libellé « en cours de combat ».

## Divers
- `data-fields.js` : `DUNGEONS.*.boss.phases.*.line` au registre i18n ; 4 textes EN.
- Harnais : seuils mis à jour ([85 bis], [115], [154], [226], [318]) + contrôle « Nezzam jamais vaincu : phases cachées ».

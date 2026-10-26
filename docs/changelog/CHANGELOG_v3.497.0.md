# v3.497.0 — Chantier du héros, H4 partie C : les rangs des compétences des compagnons

Suite de H4 (conception `systemes/Aethervale_Conception_Heros_v0_1.md`). Décisions de Seb du 26/10 : option C-a avec les effets proposés, puis S1 pour le rang 5 de Sarkel.

## Ce qui change en jeu
- **Rangs de la compétence signature** de chaque compagnon, du rang 0 au rang 5.
  - Le rang r s'ouvre au monde r−1, comme pour les sorts du héros.
  - Prix : 500 / 2 500 / 7 500 / 15 000 / 40 000 or, et 2 matériaux du monde par rang (Résine durcie, Verre trempé, Clé de voûte, Cire consacrée, Obsidienne taillée), soit 65 500 or par compagnon.
- **Effets** :

| Compagnon | Compétence | Rang 0 → rang 5 |
| --- | --- | --- |
| Wenna | Pansement serré | soin 18 % → 28 % |
| Maddoc, le tronc | Planté | se soigne de 12 % → 22 % |
| Maddoc, l'affût | Tir ajusté | ×2,5 → ×3,5 |
| Edda | Le dernier trait | ×1,5 → ×2 |
| Ysolt | Pas encore | une charge de plus au rang 3 |
| Sarkel | Coup de pioche | rang 3 : +1 Cendre vive à la 1re taille du combat ; rang 5 : une 2e taille par combat |

- **Fiche du compagnon** : sous la compétence, des pastilles de rang, le gain (« Soin 22 % → 24 % »), le prix avec le stock et le bouton « Monter au rang n ». La description donne la valeur du rang.

## Mesures
Banc `montagne-acte3-bench.js`, sauvegardes de la campagne H4, 30 runs par classe (Chevalier / Rôdeur / Mage).
- **Wenna au rang 5** : PV restants du héros contre le Wyrm, avec potions, de 50 / 59 / 49 % à 57 / 64 / 57 %.
  - Sans potion : de 40 / 56 / 36 % à 53 / 62 / 50 %.
  - Contre le Dragon ancien : de 56 / 48 / 46 % à 66 / 62 / 52 %.
  - Victoires inchangées (100 %).
- **Cendre vive par sortie de la Gueule** : 18,2 au rang 0, 21,1 au rang 3 (+16 %).
  - Au rang 5 : 29,1 (+60 %) avant S1, **26,4 (+45 %) avec S1**.

## Code
- `data/companions.js` : `COMPANION_SKILL_RANK_MAX`, `COMPANION_SKILL_RANK_PRICES`, `COMPANION_SKILL_RANKS`.
- `systems/companion-system.js` :
  - `skillOf` (compétence au rang, copie ; la donnée d'origine n'est jamais modifiée) ;
  - `skillRank`, `skillRankMax`, `skillRankStatus`, `buySkillRank` ;
  - les charges et l'usage de la compétence lisent le rang ;
  - la Cendre en plus de Sarkel ;
  - état `skillRank` sauvegardé et relu.
- `ui/companions-view.js` : `buildCompanionSkillRankHTML`, `companionSkillDescRanked`, `companionBuySkillRank`. Les styles des rangs du héros (`.pc-skill-*`) sont réutilisés.
- `lang/en.js` : 6 textes ajoutés.
- Aucun fichier ajouté, aucun fichier protégé.

## Outils
- `round-harness.js` : section [326] (prix, effets par compagnon et par voie, charges, achat, monde, sauvegarde).
- `montagne-acte3-bench.js` : options `--wenna-soin` et `--comp-rang N`, qui affiche la Cendre vive par sortie.

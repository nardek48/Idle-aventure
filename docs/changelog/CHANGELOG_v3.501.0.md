# v3.501.0 — Audit d'équilibrage, P5 : l'acte I de la Montagne plus long

Décision de Seb du 26/10 : durcir les actes I et II de la Montagne (« j'ai fait toute la Montagne facile », partie jouée avant v3.499.0).

## Ce qui change en jeu
PV des rencontres des trois quêtes de l'acte I, +40 % ; la puissance ne change pas.

| Quête | Étape | PV des rencontres |
| --- | --- | --- |
| Ce qui affleure (`aq_montagne_pentes`) | montagne_02 | ×1,6 → ×2,24 |
| Celui qui taille (`aq_montagne_sarkel`) | montagne_03 | ×1,5 → ×2,1 |
| Ça ne fond pas (`aq_montagne_veines`) | montagne_04 | ×1,5 → ×2,1 |

L'acte II (Tri, Ouvrage) ne change pas : il était déjà dans la cible.

## Écart avec l'option B proposée
B (PV +40 % et puissance +15 % sur les actes I et II) a été mesurée sur des héros pris à l'entrée de chaque étape : trop dure. Sans potion, l'Ouvrage ne passait plus qu'à 40 % pour le Chevalier, et l'acte I à 40–55 % pour le Mage. C'est la puissance qui tuait : seuls les PV montent, et seulement à l'acte I.

## Mesures (sans potion, 20 runs, héros « appliqué », Chevalier / Rôdeur / Mage)
- **PV restants en fin d'étape** : de 47–69 / 47–60 / 31–44 % à **38–66 / 31–46 / 26–31 %** (cible 25 à 35 %).
- **Rounds par combat** : de 3,7–4,7 à **4,3–6,0**.
- **Mage** : réussite sans potion de 90–95 % à 75–90 % ; avec potions, aucune mort dans les campagnes.
- **Campagnes de contrôle** : 6 campagnes (3 classes × 2), 0 mur, 0 échec, 0 mort à l'acte I.

## Code
- `data/adventure-quests.js` : `aq_montagne_pentes`, `aq_montagne_sarkel`, `aq_montagne_veines`.
- `tools/sim/montagne-acte1-bench.js` : `--set q:pv,puissance` et `--quete q` ; les deux quêtes de l'acte II (Tri, Ouvrage) mesurables.
- Aucun fichier ajouté, aucun fichier protégé.

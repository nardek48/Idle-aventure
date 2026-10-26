# v3.499.0 — Audit d'équilibrage, P1 : la fin de la Montagne plus dure et plus longue

Suite de l'audit d'équilibrage du chantier du héros (`equilibrage/Aethervale_Audit_Equilibrage_Heros_v3_498_0.html`). Décision de Seb du 26/10 : appliquer P1.

## Ce qui change en jeu

| Contenu | Avant | Après |
| --- | --- | --- |
| Gueule du volcan (`difficultyMult`) | 30 | 38 |
| Wyrm de cendres, endurance | 0,78 | 0,94 (puissance inchangée, 0,66) |
| Quête de l'étape 14, Les triés, Le Dragon ancien : PV des rencontres | ×2,6 | ×3,1 |
| Même trois quêtes : puissance des rencontres | ×6,5 | ×7 |
| Dragon ancien, PV | ×2,5 | ×3,5 (puissance inchangée, 0,75) |

## Écart avec l'option B du rapport
L'option B avait été mesurée sur les héros de **fin** de campagne (entraînement à 200). La campagne de contrôle a montré un mur à montagne_15 : à l'acte III, l'entraînement plafonne à 170, et la puissance +15 % du Wyrm le rendait imbattable (Chevalier 0 %, Rôdeur 13 %). Réglage refait sur des héros pris à l'entrée de montagne_15 pour l'acte III, et sur les fins de campagne pour l'acte IV.

## Mesures (avec potions, 30 runs, Chevalier / Rôdeur / Mage)
- **Gueule du volcan**, héros à l'entrée de montagne_15 :
  - appliqué : Wyrm battu à 100 / 100 / 97 %, PV en fin de Gueule 48 / 52 / 51 % → **38 / 42 / 43 %**, rounds 51 / 40 / 35 → 67 / 52 / 42 ;
  - investi : 100 / 93 / 97 %, PV 54 / 56 / 58 % → **36 / 37 / 49 %**.
- **Quête de l'étape 14** : PV restants 54 / 48 / 49 % (appliqué), 59 / 51 / 53 % (investi), sans défaite.
- **Les triés** : 90 à 100 % de réussite, 45 à 65 % des PV.
- **Le Dragon ancien** : 97 à 100 % de réussite, **37 à 55 %** des PV (avant : 44 à 61 %).
- **Campagnes de contrôle** : 6 campagnes (3 classes × 2), 0 mur, 0 échec. Le robot meurt plus souvent contre le Wyrm quand il pousse jusqu'à lui avant son étape (montagne_12 et 13), comme pour le Basilic et le Sphinx ; il le bat à son étape.

## Code
- `data/dungeon.js` : Gueule du volcan et Wyrm.
- `data/adventure-quests.js` : `aq_montagne_salle_ronde`, `aq_montagne_tries`, `aq_montagne_dragon`.
- Aucun fichier ajouté, aucun fichier protégé.

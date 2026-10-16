# Aethervale v3.452.0 — Crypte, lot C-2 : acte I « La descente »

Le chapitre IV s'ouvre à la fin des Ruines. Texte de l'acte I relu d'ensemble et validé par Seb le 16/10/2026 (document « Crypte — Acte I » v0.2 : « alcôve » au lieu de « niche », cibles 25 à 35 % des PV en fin d'étape). Images fournies par Seb à la fin du chantier : icône générique en attendant. S'applique sur la v3.451.0.

## Les cinq étapes
1. **Là où ils sont couchés** — le **passage entre les mondes** : Sarkel emmène le héros sous les Ruines (parcours de quatre paliers, deux Rations moyennes). Au palier 3, trois morts, un dort. À l'arrivée, la Crypte devient le monde de résidence.
2. **Ici, on ne repose pas** — cinq rencontres aux Sépulcres silencieux ; tutoriel « Les morts qui dorment ».
3. **Le carquois vide** — **Ysolt**, quatrième compagnon, rôle *Garder le sommeil* ; sa compétence **Pas encore** retarde de deux rounds le réveil d'un dormeur, une fois par combat. Choix de composition « deux sur quatre » ; tutoriel. Quatre rencontres avec elle.
4. **Les morts n'achètent pas** — le **Marché de la Crypte** s'ouvre à la caravane (Cire de sépulcre).
5. **Ce que portent les morts** — premier choix (Soi / Aeswyn) :
   - *Le dû des morts* : un mort réveillé puis vaincu rapporte **+75 %** d'or au lieu de +50 % ;
   - *La veillée d'Aeswyn* : chaque mort laissé dormir à la fin d'un combat rapporte **1 Cire de sépulcre** au village.

Après l'étape 5 : « La suite de l'histoire arrive bientôt… » (actes II à IV aux lots C-3 à C-5).

## Mesures
Banc dédié `tools/sim/crypte-acte1-bench.js` (profil de fin des Ruines, 30 runs, sans potion, en laissant dormir) :
| Étape | Réussite (Ch. / Rô. / Ma.) | Rounds par combat | PV restants |
|---|---|---|---|
| 2 · Sépulcres (Wenna, Maddoc) | 100 / 100 / 100 % | 4,9 à 5,7 | 43 / 58 / 50 % |
| 3 · Ysolt, Wenna | 77 / 97 / 90 % | 3,6 à 4,0 | 39 / 43 / 33 % |
| 3 · Ysolt, Maddoc | 97 / 100 / 97 % | 3,7 à 4,3 | 53 / 58 / 52 % |

Campagne complète (`campagne-harness --combats --avise`, trois classes, potions comprises) : les cinq étapes réussies du premier coup, sans mort, 0 à 2 potions ; PV en fin d'étape : descente 40 à 48 % (avant l'ajustement final de la descente, ×2,4 → ×2,7), Sépulcres 14 à 55 %, Ysolt 36 à 70 %.
Limite constatée : sans potion, viser 25 à 35 % des PV pour toutes les classes fait mourir le Chevalier (il finit toujours plus bas que le Rôdeur). Réglage retenu un cran au-dessus, à juger en jeu.

## Code
- `js/data/story-quests.js` : chapitre `crypt` (5 étapes), récompenses, choix `portent` (registre Soi / Aeswyn), `storyYsoltInParty`.
- `js/data/scene-templates.js` (`traversee_crypte`), `js/data/pa2-maps.js` (piste provisoire de `crypte_descente`).
- `js/data/adventure-quests.js` : `aq_crypte_sepulcres`, `aq_crypte_ysolt` (dormeurs déclarés par rencontre).
- `js/data/companions.js`, `js/systems/companion-system.js` : Ysolt, *Pas encore*, Ysolt gardée dans le groupe pendant son étape.
- `js/systems/caravan-system.js` : Marché de la Crypte. `js/systems/sleep-system.js` : *La veillée d'Aeswyn*.
- `js/lang/en.js`, `js/lang/data-fields.js` : anglais. Outils : `campagne-harness.js` joue la Crypte, `crypte-acte1-bench.js` ajouté.
- Aucun fichier ajouté au jeu ; aucun fichier protégé touché.

## Images à fournir (icône générique en attendant)
`Companions/ysolt.png`, `Icons/companions/ysolt_pas_encore.png`, `Icons/combat_status/asleep.png`, `Icons/resources/cire_sepulcre_icon.png`, `Icons/resources/cire_consacree_icon.png`, `Maps/parcours/crypte_descente.jpg` (fond de la descente ; sa piste sera relevée sur l'image).

## Contrôles
- `node --check` ; `round-harness` 4306 OK, 0 échec (3 passes), nouvelle section [240] ; boot 4/4, création 44/44, parcours P11 15/15 ; i18n 0 manquant, 0 orphelin.
- Écran Compagnons vérifié à 320 px avec quatre compagnons.

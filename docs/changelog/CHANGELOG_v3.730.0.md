# v3.730.0 — Contre protecteur et contre rapide (06/11/2026)

Décision de Seb (06/11) : profil P5 (= P1 + P3) du banc des leviers du contre (`tools/sim/charge-bench.js --leviers`), la Charge restant à ×1,30. Accord de Seb pour `combat-engine.js` (modification minimale de `enemyStrikeCompanion`). `save-system.js` inchangé : la marque est un champ `groupe` de `game.classActiveDefense`, déjà sauvegardé.

## Changé
- **Contre protecteur (P1)** : une Défense de classe jouée en réponse à une annonce (Charge, Silence, Exaltation) couvre aussi les compagnons tant qu'elle est active (Garde et Barrière : même réduction ; Esquive : même tirage, frappe esquivée). Les talents déclenchés par un coup reçu ne jouent pas sur les compagnons.
- **Contre rapide (P3)** : une Charge contrée rend le tour : une attaque de base dans le même round, une seule (Grimoire, Tactique et conseil doré).
- Textes : Garde, Esquive, Barrière ; conseil de l'état Charge ; verdict « Contre parfait. » du Grimoire ; journal (« Garde : tu couvres aussi Wenna. », « Contre : tu frappes dans la foulée. », « Wenna esquive la frappe de … »).

## Mesures (banc, 200 parties par cellule, mêmes graines)
| Montagne (« Les pentes »), avec contre | Avant (P0) | Après |
|---|---|---|
| Chevalier | 84,0 % | 95,0 % |
| Rôdeur | 91,0 % | 95,0 % |
| Mage | 39,0 % | 59,0 % |
Écart « contre − sans contre » : devient positif pour les trois classes (Chevalier : coût du contre +2,8 → +1,0 round par quête ; Rôdeur −1,5 round et −0,17 KO de compagnon ; Mage −0,13 KO). Le jeu sans contre ne devient pas plus dur. Le jeu reproduit le banc à 1 point près (`leviers-jeu-200runs.txt`).

## À surveiller
- Bastion : le tour rendu pendant la Garde double sa Rage (déjà compté au banc).
- Le Mage reste à 59 % sur « Les pentes » : à régler à part.

## Contrôles
round-harness 6 952 OK, 0 échec (2 passes), dont la section [491] (25 contrôles) ; boot ; création du héros ; i18n 0 manquant, 0 orphelin ; parcours 235 OK.

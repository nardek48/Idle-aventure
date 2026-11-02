# v3.625.0 — Tour, lot T-0 : le socle

Premier lot du chapitre VI (Conception Tour v0.1, validée d'un bloc par Seb le 02/11). Rien ne change en jeu : la Tour ne s'atteint pas encore.

## Ce qui est posé
- **Plafonds de la Tour** (`WORLD_CAPS[5]`) : Atelier 10, Enchanteresse 3, Entrepôt 20, Palissade 10, zones 20, Terrain 18, Apothicaire 10, Taverne 6. La Forge 7 n'ouvre qu'à l'acte III (`forgeActStep: "tour_13"`). Sans cette ligne, tout se serait ouvert d'un coup à l'arrivée.
- **Terrain et talents** : une entrée d'acte I (`tour_01`), inchangée (18 et 23).
- **Matières** : *Givre bleu* (brute, « spéciale »), *Verre de faille* (raffinée, Fonderie : 3 Givre bleu + 1 Acier). Icônes à venir : icône générique en attendant, vrais chemins gardés.
- **Forge** : palier 7 du bâtiment (21 000 or, 480 Pierre, 170 Acier, 3 Verres de faille, provisoire) ; reforges 13 et 14 au Verre de faille, l'Obsidienne continue d'une unité.
- **Ajustement au héros** : référence `joueurMontagne` (fin de la Montagne, `montagne_20`), mesurée avec la campagne `--combats --joueur` : Chevalier 14 403 / 3 780, Rôdeur 13 034 / 2 694, Mage 13 328 / 3 413 ; moyenne **13 588 dégâts par round, 3 296 PV effectifs**. Les zones de la Tour s'y réfèrent.
- **Sommet interdit** : reste fermé.

## Le passage vers la Tour
Vérifié dans Chromium avec une partie avancée : `WorldTravel.arrive("tower")` fait de la Tour le monde de résidence (notée atteinte), les plafonds lus sont ceux de la Tour, les six onglets s'affichent, la sauvegarde se recharge sur la Tour (bandeau « Le dernier camp »), aucune erreur. La traversée jouable viendra avec l'acte I (T-1).

Remarque : tant que le chapitre VI n'existe pas, une étape inconnue compte comme atteinte ; la Forge 7 s'ouvrirait donc dès l'arrivée. Sans effet aujourd'hui (la Tour ne s'atteint pas), réglé de fait au lot T-1.

## À décider : l'échelle d'équipement de la Tour
`EQUIP_WORLD_SCALE[5]` vaut 18 (valeur d'héritage), contre 6 à la Montagne. Mesure sur les trois héros de fin de Montagne, Légendaire complet de la Tour (20 tirages par échelle, affinité de monde comprise) :

| Échelle | Chevalier (dégâts / PV eff.) | Rôdeur | Mage |
| --- | --- | --- | --- |
| fin de Montagne | 14 403 / 3 780 | 13 034 / 2 694 | 13 328 / 3 413 |
| ×6 | 26 964 / 4 319 | 22 843 / 3 626 | 29 683 / 3 788 |
| ×8 | 34 351 / 4 272 | 29 283 / 3 447 | 37 288 / 3 827 |
| ×10 | 41 621 / 4 049 | 35 874 / 3 466 | 44 197 / 3 852 |
| ×12 | 50 578 / 4 047 | 41 508 / 3 489 | 52 171 / 3 812 |
| ×18 | 71 879 / 4 112 | 58 865 / 3 611 | 82 120 / 3 603 |

Rien ne change dans cette version : le chiffre ne joue qu'une fois la Tour ouverte.

## Outils
- `round-harness.js` : [420] ; [120], [122], [308], [328], [375], [407] mis à jour (la Tour a désormais sa ligne).
- `campagne-harness.js` : `MESURE_TOUR=1` mesure, en fin de campagne, le héros équipé de Légendaires de la Tour pour chaque échelle (rien n'est gardé).
- Constat : le robot `--avise` ne monte pas l'Entrepôt ; avec le versement automatique du Grand Ouvrage (80 %), sa Pierre plafonne à 400 et il bute sur la Forge 6 (480) à `montagne_13`, pour les trois classes. Le robot `--joueur` passe les 101 étapes.

## Code
`data/world-caps.js`, `data/hunt-quests.js`, `data/workshops.js`, `data/village-buildings.js`, `systems/forge-system.js`, `data/worlds.js`, `ui/warehouse-view.js`, `lang/en.js` (6 textes). Aucun fichier protégé touché (la référence est une donnée, comme aux lots C-0 et M-0). Aucun fichier ajouté. Rien dans la sauvegarde.

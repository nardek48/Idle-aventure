# Passation du 09/11 (v3.750.0)

Pour reprendre dans une nouvelle conversation. Le code fait foi ; ce mot dit où on en est.

## Livré depuis le 08/11
- v3.747.0 : journal de test complété (boss « à terre », PV d'entrée, rounds, coup fatal en Petite Aventure, caravanes, or).
- v3.748.0 : Rafale sur une élite de carte, plus de double mort ni d'or en double (`combat-engine.js`, accord de Seb, `dealDamage` ignore un ennemi à 0 PV).
- v3.749.0 : préparation pressée à l'Apothicaire (piste D, atelier `atelier/apothicaire-pressee.html` : bouton « Presser » dans la ligne « Préparer », 1 000 or × rang du monde le plus loin atteint, ×2 par pressée du jour).
- v3.750.0 : journal de test, huit relevés de plus (préparations, achats de potions, issue des quêtes, équipement et PV max, objets de combat, groupe, matériaux clés, gisants au départ).
- Robot de campagne (`tools/sim/campagne-harness.js`) : corrections de l'audit A (Cire/Pierre/Cendre sans attente, chantier en deux essais, 2 places de Petite Aventure gardées, sortie du donjon à l'objectif, morts par contexte dans la synthèse) ; profil joueur par défaut = Forge bâtie en fabriquant (borne haute), `--forge-stock` / `--reforge-stock` pour la borne basse.

## Audit d'équilibrage A (08/11, 62/100)
Rapport : dépôt de conception, `Aethervale_Audit_Equilibrage_A_2026-11-08_v3746_0.md`, section 9 « Suites données ». Tout est tranché : Silhouette, Orc, durée de la Tour, Acier : rien à changer ; robot corrigé ; or de fin de partie : piste D livrée.

## Partie réelle de Seb (Rôdeur, Forêt → Tour, journaux du 07 au 09/11)
Environ 4 h 30 de jeu actif, 3 morts. Ruines et Crypte les plus longues (64-65 min), Montagne 31 min, Tour 17 min. Forge : 4 aux Ruines, 7/4/3/3/3/2/2 en fin de Montagne, 8/8/8/8/7/5/3 à la Tour. Or : 994 000 à la fin (≈ 1,2 M gagnés à la Tour). Silhouette : fuite volontaire au 1er essai (plus de potions), victoire au 2e à 40 % de PV.

## À suivre
- Prochain journal de Seb (v3.750) : prix de la pressée en vrai ; perte de PV max en passant aux pièces Légendaires en Tour (1 624 → 1 279), à expliquer avec la ligne « equipement ».
- Liche à 0,82 (v3.746) : vérifier en jeu qu'elle ne devient pas une formalité.
- Images à générer par Seb : forge_mondes.webp, pieces_loot.webp, competences_compagnons.webp (+ portraits, doubles, icônes de parcours).
- Audits possibles ensuite : B (textes et aides face aux nouvelles règles), C, D.

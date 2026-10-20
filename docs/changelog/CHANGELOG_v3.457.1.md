# Aethervale v3.457.1 — Bestiaire, route de la Crypte, audit des icônes, robot

Correctifs des points relevés le 20/10 (État des chantiers, §4). Seb a validé l'option A pour le temps de campagne, et les trois petits correctifs.

## Bestiaire : les boss de donjon comptés à part
- Un boss de donjon porte l'identifiant de son boss de base : la Liche des sépulcres est un `necrosupreme`, Varrek un `skeletonlord`, le Basilic un `slimeking`. Jusqu'ici, chaque Liche vaincue comptait donc comme une victoire sur le Nécromancien suprême, chaque Varrek comme une victoire sur le Seigneur squelette, chaque Basilic comme une victoire sur le Roi Slime.
- Désormais, le boss vaincu au bout d'un donjon est compté à part, dans `explorationProgression.dungeonBossKills`, par donjon. Le Bestiaire retire ces victoires de celles du boss de base, et les donne à la fiche du boss de donjon.
- Les victoires d'avant cette version ne peuvent pas être séparées : elles restent comptées sur le boss de base.
- Code :
  - `achievement-system.js`, dans le crochet de victoire, qui n'est pas un fichier protégé ;
  - `bestiary-view.js`.
- Les hauts faits gardent leur compte brut. « Ce que garde le sphinx » est donc inchangé.

## Route du Marché de la Crypte
- Dans la feuille Caravane, le Marché de la Crypte affichait la route des Ruines. Il montre maintenant la descente de la Crypte (`crypte_descente.jpg`), comme les patrouilles.

## Audit des icônes
- `tools/audit/missing-icons.js` charge maintenant aussi les fichiers de données, et vérifie les chemins construits au chargement.
- Il voit donc les icônes des hauts faits : **21 absentes**, celles des Ruines (10) et de la Crypte (10), plus celle de Nezzam sans potion. Avant, il annonçait « aucune image absente ».

## Temps de campagne (option A)
- Constat du 20/10 : 57 h en médiane, contre 50 h au lot C.
- Partie tracée (`TRACE_OBTAIN=resine_durcie,…`) :
  - le robot fait les mêmes reforges facultatives de l'arme et de l'armure, mais **une étape plus tôt**, grâce à l'or des nouveaux hauts faits ;
  - à ce moment-là, il n'a pas encore la Sève en stock. Il la cherche sur la carte, où l'Arbre-mère est limité chaque jour, et **attend le lendemain à ne rien faire**.
  - Un joueur continuerait l'Histoire. C'est un artefact du robot, pas un mur du jeu.
- Correctif du robot : pendant une reforge facultative, la Sève et la Chitine se prennent sans attendre le jour suivant. Faute de matériau, la reforge attend le passage suivant.
- Nouveau lot sur 6 parties : **médiane 54 h** (de 47 à 58 h) ; l'attente « carte : lendemain » passe de 13,7 à 9,4 h par partie. Le reste de l'attente vient des bâtiments qui demandent de la Résine (étapes 5 et 10 de la Crypte). L'écart restant avec le lot C tient dans la variance du lot C (de 43 à 54 h). Un mur aléatoire à forest_15 sur 1 partie sur 6 (Chevalier).

## Contrôles
- Harnais : section [251], 4 473 OK, 0 échec.
- L'audit i18n donne 0 manquant et 0 orphelin.

Aucun fichier protégé n'a été touché et aucun fichier n'a été ajouté au jeu. Pas de nouveau texte.

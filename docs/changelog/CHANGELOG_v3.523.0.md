# v3.523.0 — Pronostic des élites (audit, lot 7)

Audit du 27/10, lot 7 : COM-1, l'oubli de getReferenceEnemy, PLA-3 (option A). Les mesures viennent de deux bancs d'élites sur le vrai moteur (Grimoire et potion automatique des sauvegardes, 20 combats par case). Le diff a été relu sous trois angles, chaque constat soumis à une vérification adverse, et les 5 défauts confirmés sont traités. Aucun fichier protégé.

## Ce qui change en jeu
- **Quêtes d'élite** : le pronostic juge enfin l'élite, et non un ennemi ordinaire du lieu. Avant, le Golem, le Cœur, le Porte-couronne et la Pleureuse étaient tous « Sans danger » (0,02 à 0,23) : la fenêtre « Avant de partir » ne prévenait jamais. Là où le verdict est désormais « Risqué » ou pire, on ne gagne que 5 à 30 % des combats.
- **Rage, exaltation et bouclier des élites** comptés dans le pronostic :
  - dégâts de l'élite ×2,0 si elle est enragée, ×1,2 si elle est blindée ou à bouclier ;
  - dégâts du héros ×0,88 contre une élite, à cause de son bouclier.
  - Exemple : le Dard du Chevalier au frein ×1,5 était « Abordable » (0,83) pour 5 à 15 % de victoires ; il est maintenant « Hors de portée ».
- **Élites de carte (PLA-3)** : le panneau d'une élite connue et sa préparation de sortie montrent le verdict du prochain combat, frein du jour compris (« frein du jour compris (+50 %) » dans la préparation).
- La ligne du verdict dit « ~{a} rounds pour en venir à bout, ~{b} pour tomber » : tournure neutre, singulier géré.

## Mesures
- Banc de recalage : 189 cases d'élites (cartes et quêtes, sauvegardes au bon niveau : Forêt III, Ruines 14 et 18, Crypte 12, Montagne 9, fins de monde).
  - Verdicts hors de la bande d'échec réel : 55 avant le lot → **32** (27 trop doux, 5 trop durs).
  - L'Arbre-mère au frein : 7 erreurs → 3.
- Boss enragés (Varrek, Wyrm) : aucun facteur. Ils sont gagnés à 100 % et un facteur y créait de fausses alertes.
- Le facteur ne touche que l'élite évaluée par le pronostic : ni l'usure des vagues de donjon, ni les Petites Aventures, ni le Labyrinthe, ni « régler d'un coup ».
- Chromium à 320 et 390 px (Dard, sauvegarde du Chevalier, frein ×1,5) : la ligne tient dans le panneau (292 px) et dans la feuille, sans défilement horizontal, 0 erreur de page.

## Correctifs de la revue
- La Fileuse est jugée à sa force de duel : sa baisse « pour l'escorte » ne vaut qu'avec l'escorte, que le pronostic ne joue pas.
- Une quête d'élite n'a plus deux fois le même verdict (fenêtre du tableau, puis préparation). La ligne de la préparation est réservée aux élites de carte.
- Accord de la phrase à côté d'une élite au féminin (« la Pleureuse · ~3 rounds pour le vaincre »).
- Bouclier des élites et facteurs recalés sur les sauvegardes au bon niveau.

## Code
- `systems/elite-system.js` : `EliteManager.make`, l'élite construite sans entrer en combat (spawn s'en sert, comportement inchangé).
- `systems/combat-forecast-system.js` : `FORECAST_ELITE_DMG_MULT`, `FORECAST_ELITE_HERO_DMG_MULT`, `getEliteDmgMult`, cas d'élite dans `getReferenceEnemy`, `forMapElite`.
- `ui/combat-forecast-view.js` (options `who` et `brake`), `ui/living-map-view.js`, `ui/sortie-prep-view.js`.
- `en.js` : 1 clé ajoutée, 1 remplacée par sa forme plurielle.
- Harnais [343].
- Aucun fichier ajouté.

## Contrôles
- Round : 5 320 OK, 0 échec, sur deux passes.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 6 583 textes, 100 %, 0 orphelin.

## À trancher par Seb
- **Puce « Deux frappes ! » (COM-6)**, mesurée à niveau juste (18 247 arrêts du héros) :
  - elle s'allume sur 20 % des arrêts, et une seconde frappe ne suit que 62 % des fois ;
  - recommandation : ne l'afficher que si aucune autre annonce ne remplace la frappe et si les deux frappes prévues font au moins 20 % des PV. Elle tomberait alors à 9 % des arrêts, en gardant 97 % des vrais dangers et 97 % des morts ;
  - mais « Continuer l'attaque » s'arrête à chaque jauge pleine (`combat-engine.js`, protégé) : sans la puce, cet arrêt ne serait plus expliqué. Il faut ton accord pour une retouche minimale de ce fichier, ou garder la puce telle quelle.
- **Mère des dragonnets** : le pronostic reste trop doux (17 cases sur 55). Il additionne les PV des compagnons à ceux du héros, alors que le héros encaisse environ 70 % des coups. Corriger ce partage changerait tous les pronostics : c'est un chantier à part.
- **À signaler** : `data/elites.js` dit qu'une élite ne peut pas avoir l'archétype « bouclier », mais l'Arbre-mère l'a. Son exaltation n'a donc aucun effet en combat.

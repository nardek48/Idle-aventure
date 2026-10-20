# Aethervale v3.456.8 — Le Bestiaire en grand, et l'aperçu des créatures complété

Décision de Seb du 20/10/2026 : les cinq idées proposées pour l'aperçu sont toutes retenues. S'y ajoute la fiche en grand dans le Bestiaire.

## La fiche en grand d'une créature
- **Dans le Bestiaire**, toucher une créature ouvre sa fiche dans une feuille. On y trouve :
  - le grand portrait ;
  - le type (Créature, Élite ou Boss) et le nombre de victoires ;
  - la phrase de bestiaire, puis ce que fait la créature (soutien, appel, réveil sous les coups, endormissement, trait de combat) ;
  - ses résistances et faiblesses, et une estimation de ses PV, de ses dégâts et de ses chances de critique ;
  - **où la trouver** : aventures, donjons, quêtes et parcours, trois lieux au plus.
- **Créature pas encore rencontrée** : la fiche montre « ??? » et un grand « ? », mais dit déjà où la chercher.
- **Les résistances sont lisibles** : « Résiste : la magie », « Faible : l'épée, l'arc ». Avant, le jeu affichait sword, bow et magic.

## L'aperçu d'un monde sur la carte principale
1. Toucher une pastille ouvre la même fiche. Une pastille « ? » ouvre la fiche « ??? », qui dit où chercher.
2. Le lieu s'affiche aussi pour une créature inconnue, dans la fiche.
3. **Les boss de donjon ont leur fiche** : la Liche des sépulcres, Varrek et le Basilic.
   - Chacun était jusque-là confondu avec le boss sur lequel le donjon le construit : le Nécromancien suprême, le Seigneur squelette, le Roi Slime.
   - Il est rencontré quand son donjon est terminé.
   - Faite sans toucher `dungeon-system.js`.
4. **Le donjon du monde a sa ligne**, avec son vrai boss (la Liche pour l'Ossuaire, Varrek pour le Sanctuaire). Le boss d'une aventure reste « ? » tant qu'il n'est pas rencontré.
5. **Une pastille dorée « nouveau »** marque une créature rencontrée depuis la dernière ouverture de l'aperçu. Les créatures déjà vues sont notées dans `explorationProgression`, qui est déjà sauvegardé.

## Effets de bord
- Les hauts faits « Naturaliste » et les paliers du Bestiaire (25, 50 et 100 %) comptent les boss de donjon. Chaque monde concerné gagne une créature à rencontrer : la Forêt, les Ruines et la Crypte en ont une de plus.
- Le compteur de victoires du Nécromancien suprême inclut encore les Liches vaincues dans l'Ossuaire, car le donjon construit la Liche sur sa fiche. La fiche propre de la Liche, elle, est juste.

## Code
- `bestiary-view.js` :
  - entrées `donjon_<id>` ;
  - `bestiaryData`, `bestiaryMet`, `bestiaryKills` ;
  - `creatureWhere`, `creatureTraits` ;
  - `openCreatureSheet`, `closeCreatureSheet` ;
  - une carte de la liste est désormais un bouton.
- `map-view.js` : pastilles-boutons, pastille « nouveau », boss d'aventure caché, ligne du donjon.
- `achievements.js` : même règle « rencontrée » que le Bestiaire.
- CSS : `04-panel-bestiary.css` (la fiche) et `06-map.css` (les pastilles).
- `en.js` : 9 textes.
- Harnais : section [249].

Vérifié en captures à 390 px : fenêtre du monde, fiche rencontrée, fiche inconnue, fiche de la Liche, liste du Bestiaire et sa fiche. Aucun fichier protégé n'a été touché et aucun fichier n'a été ajouté.

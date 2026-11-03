# v3.632.0 — Tour, lot T-5 : Mémoire 21 à 24, hauts faits de la Tour

Dernier lot du chapitre VI (proposition validée d'un bloc par Seb le 03/11).

## Mémoire 21 à 24 (TW12)
Coûts : 310 / 360 / 420 / 490 Aether. Le plafond de la Tour passe à 24.

| Niv. | Thème | Garder | Donner |
| --- | --- | --- | --- |
| 21 | La braise | **Feu couvé** : +3 % des PV rendus par combat gagné à la Tour, avec ou sans la braise | **Braise vive** : +5 % de dégâts à la Tour |
| 22 | Les étages | **La redite apprise** : un étage raté n'est durci qu'à ×1,1 au lieu de ×1,25 | **L'escalier rend** : +1 Givre bleu par destination de l'escalier |
| 23 | Le reflet | **Geste caché** : le miroir ne retire que 15 % au lieu de 25 % | **Ce qui se répète** : Légendaire du Gardien qui répète à 45 % au lieu de 35 % |

**Jalon 24, La Question** : une option par réponse.
- *La forme prêtée* : +10 % contre les boss et les élites de la Tour.
- *Le pain d'abord* : les rations soignent 10 % de plus, au Camp et en Petite Aventure.
- *Ton nom* : +10 % de PV max à la Tour.
- *La braise tient* : +1 Givre bleu par sortie terminée du Sommet interdit.

Le jalon reste fermé tant que la Question n'est pas répondue (« S'ouvre une fois la Question répondue »). L'option de ta réponse porte l'étiquette « Ta réponse » ; les quatre restent prenables.

Mesure : Aether du robot en fin de Tour (campagne complète) : Chevalier 4 001, Rôdeur 3 140, Mage 3 749.
- Le niveau 24 demande 3 191 cumulés : atteint par le Chevalier et le Mage, le Rôdeur s'arrête au 23.
- Même logique qu'à la Montagne : le jalon se gagne en fin de chapitre.

Icônes : 10, ajoutées à « Images à générer ». Icône générique en attendant.

## Hauts faits de la Tour
Dix hauts faits, catégorie « Tour » à paliers 3 / 6 / 8. Titre au palier or : « Qui est monté jusqu'en haut ».
- Visibles (6 000 or) :
  - la silhouette ;
  - le Reflet ;
  - tous les étages libérés en même temps ;
  - le Gardien qui répète vaincu 5 fois ;
  - sept Légendaires portés ;
  - une Petite Aventure de la Tour menée au bout ;
  - le bestiaire de la Tour.
- Cachés (12 000 or) :
  - **Varier** : vaincre le Reflet sans que le miroir prenne une technique ;
  - **Seul, et sans boire** : terminer « Seul » sans potion ;
  - **La redite, reprise** : libérer un étage refait par la Tour.

## Campagne complète (de zéro, `--combats --joueur`)
- Les trois classes vont jusqu'à la fin de l'Histoire :
  - Rôdeur : 122 contrôles, 0 échec, 30,8 h simulées ;
  - Mage : 122 contrôles, 0 échec, 41,2 h simulées ;
  - Chevalier : bloqué une fois à l'étape 17 par une expédition que le robot avait laissée en cours (défaut du robot, corrigé), puis repris depuis l'entrée de la Tour : 28 contrôles, 0 échec.
- **Constat** : le chapitre VI se boucle en 3,3 à 3,9 h simulées, contre environ 9,5 h pour la Montagne. Il est court et plutôt facile au robot. À juger en jeu.

| PV en fin de quête | Chevalier | Rôdeur | Mage |
| --- | --- | --- | --- |
| L'étage du sable | 85 % | 50 % | 87 % |
| Le haut de l'escalier | 76 % | 71 % | 76 % |
| Seul | 54 % | 100 % | 43 % |
| La silhouette | 18 % (3 potions) | 45 % | 57 % |

## Code
- `data/memory.js` : niveaux 21 à 24, `requiresChoice`, valeurs.
- `systems/memory-system.js` : `isWaiting`, `souvenir` (La braise tient).
- `systems/tower-system.js` : effets de Mémoire de la Tour.
- Branchements :
  - `talent-system.js` : Ton nom ;
  - `camp-system.js` et `pa2-run.js` : Le pain d'abord, La redite apprise ;
  - `pa2-content.js` : L'escalier rend ;
  - `living-map-system.js` : Ce qui se répète, La redite reprise ;
  - `class-combat-system.js` : le miroir noté.
- `data/achievements.js` et `systems/achievement-system.js` : hauts faits et compteurs.
- `adventure-quest-system.js` : « Seul » sans potion.
- `ui/ascension-view.js` : verrou et « Ta réponse ».
- `lang/en.js` : 48 textes.
- Aucun fichier protégé touché, aucun fichier ajouté.

## Outils
- `round-harness.js` : [427] ; [133], [241] et [313] mis à jour.
- `campagne-harness.js` : une expédition oubliée est abandonnée avant un nouveau départ.

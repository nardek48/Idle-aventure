# v3.631.0 — Tour, lot T-4b : la vision, la Question, Azhem, l'épilogue

Fin du chapitre VI et **fin de l'Histoire** : la Tour a ses 20 étapes. Le jeu continue après la fin (donjons, cartes, village).

## Décisions de Seb (02/11)
- Prix des bascules : **un par axe**.
  - Donner/Garder : Le fil bleu te quitte.
  - Soi/Aeswyn : **Brannoc** manque au dernier feu.
- Le vrai round intouchable de la silhouette viendra plus tard.

## Étape 19 — Cette nuit-là
- « Regarder » (geste hors registre) joue **la vision** : trois planches lettre à lettre, avec le nom du héros (`{nom}`).
- Puis les répliques du Veilleur.
- La vision se revoit dans Quêtes › Histoire, sous le prologue.
- Images à générer (`images/Tour/vision_*`). En attendant, fond animé dans la teinte de la vision.

## Étape 20 — La Question (TW4, option A)
- Trois réponses selon la **pente** du registre (choix notés, hors Question) :
  - la pente, sans prix ;
  - une bascule Donner/Garder, avec son prix écrit dessous ;
  - une bascule Soi/Aeswyn, avec son prix écrit dessous.
- La réponse opposée sur les deux axes n'est pas proposée.
- En cas d'égalité sur un axe, le dernier choix de la Tour départage (Aeswyn d'avant, puis la braise), sinon Donner / Aeswyn.
- Prix :
  - Le fil bleu quitte l'équipement ou le sac (rien à rendre s'il a été vendu) ;
  - Brannoc : une ligne de l'épilogue (« Au dernier feu, la place de Brannoc reste vide. L'enclume ne sonne plus. »).
- Puis **Azhem**, dit une fois par le narrateur.

## La fin (TW13)
- À la fermeture de la dernière fenêtre : **l'épilogue** (deux planches de la fin choisie), puis le bilan **« Fin de l'Histoire »** avec le titre de la fin et 15 choix.
- Quatre fins : *La forme au sommet*, *Ce que la braise a gardé*, *Ce que tu as gardé*, *Le feu tient encore*. Textes de l'atelier, **encore à relire par Seb**.
- La phrase du bandeau du Village et le titre du chapitre prennent ceux de la fin.
- Carte en tête de Quêtes › Histoire : « Revoir le bilan », « Revoir l'épilogue ».
- **Corrigé** : depuis v3.626.0, finir la dernière étape disponible de la Tour ouvrait « Fin du chapitre 6 — La Tour sera le prochain chapitre ». Le texte d'attente dit maintenant « La suite de l'Histoire arrive bientôt. »

## Codex (TW15)
- « Cette nuit-là » s'ouvre après l'étape 19.
- « Le sixième Sceau — « le Sommet » » s'ouvre en entrant au Sommet interdit.
- Relu (note v3.621.3) :
  - « scellée en cinq couches » devient « scellée en couches » ;
  - « le cinquième et dernier Sceau connu » devient « le cinquième Sceau, longtemps le dernier connu ».

## Divers
- Planches : la ponctuation française (« : ; ! ? » ») reste collée au mot d'avant. Le deux-points ne passe plus seul en début de ligne.
- Campagne au robot, trois classes jusqu'à la fin de l'Histoire : 28 contrôles, 0 échec.
  - Chevalier et Rôdeur répondent selon leur pente (« La sienne »).
  - Le Mage, poussé à basculer Soi/Aeswyn (`--bascule-brannoc`), obtient « Aeswyn » avec le prix Brannoc.

## Code
- `data/chapter-openings.js` : `TOWER_VISION`, `TOWER_FINS`, `TOWER_FIN_PRIX`.
- `systems/tower-system.js` : `pente`, `questionAnswers`, `payQuestion`, `takeFilBleu`, `ending`, `bannerLine`, `endingDeck`, `playVision`, `playEpilogue`.
- `data/story-quests.js` : `tour_19`, `tour_20`, `STORY_QUESTION_OPTIONS`, `STORY_QUESTION_PRIX`, axe `question`, `endText` du chapitre.
- `ui/prologue-view.js` : `playDeck`, `{nom}`, ponctuation.
- `ui/quests-view.js` : fin de l'Histoire, épilogue, liens.
- `ui/living-map-view.js` : prix sous la réponse.
- `ui/screen-banner.js` : bandeau du Village.
- `data/codex.js` : deux fiches, deux relectures.
- `lang/en.js` : 70 textes.
- Aucun fichier protégé, aucun fichier ajouté.

## Outils
- `round-harness.js` : [426] ; [353] (15 choix, vraie fin).
- `campagne-harness.js` : gestes `tour_19` et `tour_20` (`--bascule-fil`, `--bascule-brannoc`).

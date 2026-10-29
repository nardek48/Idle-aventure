# v3.535.0 — Carte « Niveau N » au passage de niveau (audit, lot 10 : PLA-11)

Décision de Seb : option A de l'atelier `atelier/passage-niveau.html`. Le constat : un niveau ne tenait qu'en un message de 1,8 s, qui tombait souvent en plein combat.

## Ce qui change en jeu
- Le message « Niveau N ! +1 point de talent » reste tel quel, sur le moment.
- Une carte courte « Niveau N » s'ouvre ensuite, dès que le joueur n'est plus sur l'écran de combat et qu'aucune autre fenêtre n'est ouverte. Elle montre le portrait du héros et « {nom} monte d'un niveau ».
- **Point à placer** : « +1 point de talent », le nombre de points à placer et le niveau du prochain point, avec les boutons « Placer le point » (Héros › Talents) et « Plus tard ».
- **Plafond de l'acte atteint** : « +1 point de talent en réserve », avec la raison (le point servira quand le plafond montera, à un prochain acte), et « Continuer ».
- Plusieurs niveaux d'affilée ne donnent qu'une carte (« +2 points de talent »).
- Rien avant l'ouverture des talents (forest_11) : le tutoriel de la Forêt n'est pas touché.

## Code
- `ui/talents-view.js` : `queueLevelCard`, `flushLevelCard`, `buildLevelCardHTML`, `closeLevelCard`.
- `grantHeroXp` est enveloppée depuis la vue pour repérer un passage de niveau. Son effet ne change pas, et `progression-system.js` (protégé) n'est pas modifié.
- La carte s'ouvre dans `#talent-modal-root`, qui existait déjà sans servir.
- `css/04-panel-talents.css` : classes `.level-card-*`.
- `en.js` : 8 textes.
- Harnais [354].
- Aucun état sauvegardé : un niveau gagné juste avant de quitter ne rouvre pas la carte au retour. Aucun fichier protégé ni ajouté.

## Contrôles
- Round : 5 370 OK, 0 échec, sur deux passes.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 6 607 textes, 100 %, 0 orphelin.
- Campagne du robot (Chevalier, `--combats`) : 101 OK, 0 échec, 20,3 h.
- Chromium à 320 et 390 px et en tablette ou PC (1180 px), 0 erreur :
  - au Camp, la carte s'ouvre ; « Placer le point » mène à Héros › Talents ;
  - sur l'écran de combat, elle attend, puis s'ouvre au retour au Camp ;
  - pendant une fin de quête, elle attend la fermeture de cette fenêtre ;
  - à la Montagne (plafond atteint), elle affiche « en réserve » ;
  - en Forêt, avant les talents, rien ne s'ouvre.

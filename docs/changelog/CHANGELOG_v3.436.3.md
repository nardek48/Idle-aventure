# Aethervale v3.436.3 — Mise à jour détectée au retour dans le jeu

Question de Seb : à quel moment le jeu vérifie-t-il s'il existe une nouvelle version ?

## Avant
- Seul le navigateur vérifiait `sw.js`, et seulement au lancement à froid (appli rouverte ou page rechargée).
- Une appli restée en mémoire (iPhone) gardait l'ancienne version tant qu'iOS ne la fermait pas.

## Ce qui change
- Au retour au premier plan, le jeu demande au navigateur de vérifier `sw.js` (`registration.update()`).
- Au plus une vérification toutes les 30 min, et seulement en ligne.
- Si une version est publiée, la bannière « Nouvelle version disponible — Recharger » apparaît, comme après un lancement à froid.

## Code
- `main/pwa.js` : `watchPwaUpdateOnResume(reg)`, branché sur la promesse de `register()`.
- Aucun fichier ajouté.

## Contrôles
- Chromium : appels à `update()` selon l'écart (moins de 30 min → 0, plus de 30 min → 1, de nouveau juste après → toujours 1).
- Chromium, parcours complet sur une copie servie : `sw.js` modifié en ligne, retour au premier plan → nouveau cache installé, bannière affichée.
- Round : 4 113 OK, 0 échec, sur trois passes. Boot : 4 OK.

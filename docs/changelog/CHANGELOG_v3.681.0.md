# v3.681.0 — Deux fenêtres : la fenêtre voilée n'écrase plus un autre héros (audit du 04/11, QA-1)

- **Perte de données corrigée** : le verrou de v3.457.4 comparait `saveLockedKey` à la clé active, relue dans localStorage à chaque sauvegarde. Si l'autre fenêtre changeait de héros, les deux clés différaient et la fenêtre voilée écrivait son héros dans l'emplacement de l'autre, alors que son voile promettait le contraire. Accord de Seb (« tous les changements mentionnés »).
- `js/systems/save-system.js` **(protégé, accord de Seb)** : `saveGame` refuse toute écriture tant que `instanceLocked`. Une ligne.
- `js/main/instance-unique.js` : le verrou retient l'emplacement de la fenêtre (`instanceSlot`) ; « Recharger ici » (`reloadGameInstanceHere`) le remet actif avant de recharger, pour rouvrir son propre héros.
- « Quoi de neuf » : une ligne (FR et en.js).
- `tools/harness/round-harness.js` [446] : fenêtre voilée, aucune écriture même après changement d'emplacement ; « Recharger ici » remet l'emplacement.
- Vérifié dans Chromium (deux onglets) : A (Alpha, 111 or) voilée par B ; B crée Beta (222 or) dans l'emplacement 2 ; A tente de sauver 999 or : Alpha et Beta intacts ; « Recharger ici » rouvre l'emplacement 1 dans A et voile B.

Contrôles : round 6 168 OK (2 passes), boot 4 OK, création 44 OK, parcours 212 OK, i18n 100 %.

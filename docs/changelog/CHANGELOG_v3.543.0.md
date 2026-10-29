# v3.543.0 — La Forge 5 de la Crypte s'ouvre à l'acte III (audit PLA-7)

Point de l'audit traité sur délégation de Seb (« je suis tes recommandations »).

## Le constat
La Forge 5 s'ouvrait dès l'entrée dans la Crypte. Pourtant, la Cire consacrée qui la bâtit, et l'aide qui l'explique (« Le palier Épique »), n'arrivent qu'à crypte_13, qui est aussi la première étape à la demander. Un joueur qui investit voyait le bâtiment disponible et attendait une ressource qui ne venait qu'au compte-gouttes : 8,5 h à crypte_01 et 20 h à crypte_02 pour le robot « forge au maximum » de l'audit.

## Ce qui change en jeu
- Dans la Crypte, la Forge reste au niveau 4 jusqu'à crypte_13, puis passe au niveau 5. C'est le même mécanisme que la Forge 6 de la Montagne, qui s'ouvre à montagne_11.
- Rien ne demande la Forge 5 avant crypte_13 : les reforges 7 et 8 se font en Forge 4.

## Code
- `data/world-caps.js` : `forgeActStep: "crypte_13"` sur la Crypte.
- Harnais [361].
- Aucun fichier protégé, aucun état sauvegardé, aucun fichier ajouté.

## Contrôles
- Round : 5 390 OK, 0 échec. Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- Campagne normale (Chevalier, `--combats`) : 101 OK, 0 échec, 19,9 h ; Forge 5 bâtie à crypte_13.
- Campagne « forge au maximum » (`--forge-max`) : 101 OK, 0 échec, 29,5 h ; crypte_01 et crypte_02 en 0,1 h chacune, contre 8,5 et 20 h dans l'audit.

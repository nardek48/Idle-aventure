# v3.654.0 — Grimoire : une fiche sans listes déroulantes

Demande de Seb (03/11) : « la liste déroulante c'est pas top ». Atelier `atelier/grimoire-fiche.html` (trois variantes sur les vraies données du jeu) ; **variante C validée par Seb**.

## Avant
La fiche d'une règle avait deux listes déroulantes natives :
- la condition (17 choix), sans icône ni description, visibles seulement après coup ;
- l'action (5 choix).

On ne savait pas quelle action contrait la situation avant de l'avoir choisie (seul un « ⚡ » dans la liste l'indiquait).

## La fiche
- **Si…** : un bouton montre la condition choisie avec son icône. Le toucher ouvre une feuille avec les 17 conditions en 4 groupes (L'ennemi annonce, L'ennemi est, Ton groupe, Le terrain), chacune avec son icône et sa description. Le choix referme la feuille. Une condition future qui n'est rangée dans aucun groupe tombe dans « Autres ».
- **Alors…** : les actions du héros en tuiles (3 par ligne), avec leur icône. Un badge apparaît avant même de choisir :
  - « Contre » (vert) : l'action annule le télégraphe de la condition ;
  - « Effet » (bleu) : elle agit sur l'archétype de l'ennemi.
- Gardés tels quels : la description de l'action choisie, le verdict (Contre parfait, Effet spécial, ou ne contre pas), « … contre aussi », « Vider cet emplacement ».
- Sortie en cours : le bouton et les tuiles sont grisés, comme les listes avant.

## Code
- `ui/grimoire-view.js` : `GRIMOIRE_CONDITION_GROUPS`, `getGrimoireConditionGroups`, `getGrimoireCounterKind`, la feuille `cond` (dans `GRIMOIRE_SHEETS`), les tuiles, `pickGrimoireCondition`. Les deux constructeurs d'`<option>` sont retirés.
- `css/04-panel-grimoire.css` : styles de la fiche (bouton, tuiles, badges, feuille), à la place de ceux de la liste déroulante.
- `lang/en.js` : 6 textes ajoutés, les 2 libellés « — Choisir… — » retirés (orphelins).

## Contrôles
- `node --check` sur les fichiers modifiés.
- `round-harness.js` : 6 111 OK, 0 échec, sur deux passes. Texte d'au moins 12 px et audit i18n compris.
- `boot-harness.js` : 4 OK. `parcours-harness.js` : 212 OK, 0 échec.
- **Chromium, sauvegarde de la Tour (Chevalier), 320 et 390 px** :
  - 5 tuiles, aucune ne déborde, pas de défilement horizontal ;
  - la feuille montre les 17 conditions et se referme au choix ;
  - choisir « Le boss va se soigner » met « Contre » sur Frappe lourde ;
  - toucher une tuile enregistre l'action.

## Fichiers
- Fichiers modifiés : `ui/grimoire-view.js`, `css/04-panel-grimoire.css`, `ui/news-view.js`, `lang/en.js`, `core/constants.js`, `sw.js`.
- Aucun fichier protégé touché, aucun fichier ajouté.

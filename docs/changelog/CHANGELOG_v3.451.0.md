# Aethervale v3.451.0 — Crypte, lot C-1 : les morts qui dorment

Identité de combat de la Crypte (CR2, validée par Seb le 15/10/2026 après l'atelier `morts-qui-dorment.html`). Accord de Seb pour `combat-engine.js`. Rien ne change ailleurs qu'à la Crypte, que l'on n'atteint pas encore. S'applique sur la v3.450.0.

## La règle
- À l'ouverture d'un combat de groupe dans la Crypte, **un ou deux morts dorment** : ils ne jouent pas, et ton camp ne les vise pas par défaut (cible, réglage « Cible », compagnons).
- Le combat est gagné quand **les éveillés sont tombés** : les dormeurs restent couchés (« Les éveillés sont tombés. Deux morts dorment encore. »).
- **Les frapper les réveille**, coup de zone compris. Réveillé par ton camp puis vaincu : **+50 % d'or** (+75 % avec le choix `portent` = « soi », acte I).
- **Réveil seul** : un dormeur laissé se lève au bout de **3 à 5 rounds**, sans bonus ; le chiffre au-dessus de lui compte les rounds.
- Jamais un boss ni une élite ; toujours au moins un éveillé. Combien dorment : posé par le parcours (`planNext`), par la rencontre (`sleepers`), sinon 1 ou 2 au hasard.
- **Grimoire** : nouvelle condition **« Un ennemi dort »** ; son action vise un dormeur (le réveiller). Sans règle, on le laisse dormir.

## À l'écran
- Rendu **B « Brume »** : couleurs passées, flou léger, voile froid au sol ; compte à rebours sous l'ennemi ; portrait grisé dans le bandeau d'initiative ; état « Endormi » dans la fiche des états du combat.
- Icône « endormi » à générer : `images/Icons/combat_status/asleep.png` (icône générique en attendant).

## Code
- **Fichier ajouté : `js/systems/sleep-system.js`**, dans `index.html` et dans le précache de `sw.js` (même commit).
- `js/systems/combat-engine.js` (protégé, accord du 15/10) : six lignes de garde — ouverture du groupe, tour ennemi, coup reçu, or du vaincu, fin du combat, visée automatique.
- `js/core/combat-actors.js` : un dormeur n'est jamais visé d'office ; la première cible est un éveillé.
- Grimoire (`grimoire-conditions.js`, `combat-auto-policy-system.js`, `class-combat-system.js`, `grimoire-view.js`), états (`combat-states.js`, `combat-screen-view.js`), `css/03-combat-screen.css`, `lang/en.js`.

## Reste au lot C-2
- La **durée des combats** (3 à 5 rounds en laissant dormir, par l'endurance) se cale au banc sur les vraies rencontres de l'acte I, qui portent les multiplicateurs.
- Le tutoriel « Les morts qui dorment » (étape 2), Ysolt et *Pas encore*, la Cire de *La veillée d'Aeswyn*.

## Contrôles
- `node --check` ; `round-harness` 4295 OK, 0 échec (3 passes), nouvelle section [239] (14 contrôles) ; boot 4/4, création 44/44, parcours P11 15/15 ; i18n 0 manquant, 0 orphelin.
- Rendu vérifié dans le vrai écran de combat (Chromium, 390 × 844) : deux dormeurs en brume, réveil au coup.

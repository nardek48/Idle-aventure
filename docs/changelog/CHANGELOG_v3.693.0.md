# v3.693.0 — Compagnons, fin de partie et méta (audit du 04/11, lot A6)

Lot A6 du rapport (§2.5, §2.6, §10.F), puis les constats MOYENNE et FAIBLE du tableau 10.B encore ouverts et corrigeables sans choix.

## Corrigés

- **CPL2-4** (relique garantie perdue) : la garantie de la première patrouille lisait `next === 1`, que faisait avancer une relique unique reçue avant (quête de compagnon, échoppe). Nouveau drapeau `firstPatrolDone` dans `game.companionRelics`, posé à la fin de la première patrouille. Ancienne sauvegarde : garantie encore due si l'inventaire ne porte que des uniques. `js/systems/companion-relic-system.js` ; état câblé en 4 points : `js/core/state.js`, `js/systems/save-system.js` **(protégé, accord de Seb du 04/11)** (`buildSaveData`, `restoreBaseState`, `fullResetState` : valeur par défaut seulement).
- **CPL2-5** (« Répartir de nouveau » éteint les reliques) : la confirmation ajoute « Une relique portée cessera d'agir : son emplacement se ferme jusqu'au palier 15. » quand un emplacement occupé se referme. `js/ui/companions-view.js` (`companionRelicsOffAfterReset`).
- **CPL2-6** (aperçu de « Tout offrir » faux) : l'aperçu compte Mémoire vive (×1,25), comme le gain réel. `js/systems/memory-system.js` (`aetherMult`, commun à `gainAether` et `previewOfferAll`).
- **CPL2-7** (sac à 45/25 après une reprise) : reprendre « Sac profond » avec plus de 25 objets prévient : « Ton sac repassera à 25 places pour 30 objets : tant qu'il déborde, chaque objet trouvé est offert à l'Aether. » Dans la reprise payante, et en confirmation pour une reprise gratuite. `js/ui/ascension-view.js`.
- **CPL2-8** (Sommeil lourd incomplet) : `SleepSystem.wakeRounds()` commun (3 à 5, + Sommeil lourd, + carquois d'Ysolt) pour les dormeurs du départ, le rendormi de « Personne ne se lève » et les renforts endormis des boss. Le texte « 4 à 6 » devient vrai partout. `js/systems/sleep-system.js`.
- **CPL2-9** (PV des compagnons à 320 px) : la pastille des Alliés passe à « 1 899 / 1 900 » (« PV » en infobulle). Mesuré dans Chromium à 320 px : 80 px pour une jauge de 82 px (98 px avec « PV »). Le `nowrap` existait déjà. `js/ui/heros-screens-view.js`.
- **CPL2-12** (sources des reliques) : « une par famille · patrouilles, échoppe et quêtes », et la liste vide le dit aussi. `js/ui/companions-view.js`.
- **CPL2-13** (étape « run » sur un parcours) : une fin de parcours sur le secteur attribué compte. Cas réel : la porte du Temple au Désert, dont le premier contenu est le parcours `descente_temple`. Un parcours d'Histoire lancé hors de la carte n'a pas de secteur : il ne compte toujours pas (v3.603.0 intacte). `js/systems/companion-quest-system.js`.
- **NOV-26** (même obstacle deux fois) : dans un parcours, les obstacles sans gabarit sont tirés sans remise tant que le vivier suffit. `js/systems/pa2-run.js`.
- **NOV-13** (légende hors sujet et collante) : dans un parcours, la légende ne montre que ce que le tracé contient (pas de camp, de seuil ni de destinations), et elle se referme quand une fiche de nœud ou de piège s'ouvre. `js/ui/pa2-view.js`.
- **NOV-14** (jargon des expéditions) : « Puissance » devient « Force » (le nom de l'écran Héros), « matériel » devient « objets », « DD 12 » devient « il faut 9 ou plus » (le chiffre à faire au dé, comme sous le dé), et le terme de la stat disparaît à +0. `js/ui/scene-view.js`, `js/ui/pa2-view.js`.
- **SUIV-11** (ERG-5 point 2) : la carte d'une mission d'expédition affiche « Départ : Petite ration ×1 · stock 0 », en rouge s'il en manque. Mesuré dans Chromium : une ligne à 320 px (213 px pour 239). `js/systems/mission-board-system.js` (`entryCost` de la mission), `js/ui/camp-view.js`, `css/04-panel-camp.css`.
- **SUIV-16** : la fiche de la Ration moyenne cite la Tour. `js/data/warehouse-resources.js`, commentaire de `js/systems/provisions-system.js`.
- `js/lang/en.js` : 9 textes (dont 5 remplacés), « Puissance » retiré (orphelin). « Quoi de neuf » : une ligne.
- `tools/harness/round-harness.js` [458] : un contrôle par correction. [395] (comptage des quêtes de compagnon) et [381] (détail du jet) suivent les nouveaux textes et le parcours compté.

## Laissés

- **CPL2-2** (reliques uniques des compagnons arrivés tard) : décision H4 de Seb.
- **EQUI-6, EQUI-7, EQUI-8, EQUI-9, EQUI-10, EQUI-12, EQUI-18, EQUI-20** : chiffres d'équilibrage nouveaux, option qui rouvre v3.634, ou « à juger en jeu » : décision de Seb, après mesure au banc.
- **EQUI-11, SUIV-9** (« Régler d'office ») : conception, question à Seb.
- **EQUI-19** (`STATS.actifMs`) : outillage ; la définition du temps actif (rounds, navigation, attente) est à choisir.
- **EQUI-21** (Tour courte) : mesure de campagne, non lancée dans ce lot.
- **SUIV-7** (liste des fichiers de quêtes protégés) : décision de Seb, à écrire dans CLAUDE.md.
- **SUIV-8** (ERG-10), **SUIV-15** (QUE-15 et la Tour) : décisions de Seb.
- **SUIV-12, NOV-24, TUTO-11** : UI, atelier d'abord.
- **TUTO-7** : décision close (PA-T1), signalement seulement.
- **SUIV-18, SUIV-23** : documentation.

## Déjà corrigés

- **EQUI-13 à EQUI-16** : outils de campagne, commit « Outils : mesure de campagne (lot I2) ».
- **CPL2-10** (= ARCH-11, v3.686.0), **CPL2-11** (= ARCH-7, v3.692.0). CPL2-1 (v3.687.0), CPL2-3 (v3.684.0).

## Repéré

- Carte de mission à 320 px : avec « Partir » et « Abandonner » côte à côte, les deux boutons débordent du cadre de la carte (constaté dans Chromium, sans lien avec ce lot ; même famille qu'UI-10, atelier d'abord).

Aucun fichier ajouté.

Contrôles : round 6 430 OK (2 passes), boot 4 OK, création 44 OK, parcours 212 OK, i18n 100 % (0 orphelin).

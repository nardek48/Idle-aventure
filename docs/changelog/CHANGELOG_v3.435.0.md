# Aethervale v3.435.0 — Ruines : le Labyrinthe aux leviers (livraison 2)

Réglages mesurés par un robot qui explore dans le noir, et tutoriel de la première descente. Conception : « Labyrinthe aux leviers » v0.2. S'applique sur la v3.434.0.

## Le robot explorateur (`tools/sim/labyrinthe-bench.js --robot`)
Le robot joue comme un joueur qui ne connaît pas le plan :
- il va vers la salle inconnue la plus proche, par les salles dessinées ;
- il tire un levier à sa découverte ;
- il lit la carte d'Edda : il sait ce que fait un levier déjà tiré, et ne le retire que pour un état des pans qu'il n'a pas encore exploré ;
- à l'escalier, il descend si ses PV dépassent 40 % et son Souffle 35 ; sinon il remonte.

Mesures : 80 descentes par classe, aux profils palier de l'acte II et palier Rare.

| Mesure | Résultat |
| --- | --- |
| Profondeur moyenne | **3,2 à 3,7** étages (cible : 3 à 5), maximum 7 |
| Fins | remonté de son plein gré 70 à 93 %, tombé 3 à 10 %, à bout de souffle 5 à 23 % |
| Pas par étage | ~16 (le plus court chemin : 10 à 15) |
| Prises du Contremaître | 0,3 à 0,4 par descente |
| Gains | **~5 Pierres errantes** et ~1 500 or par descente |
| Étages sans issue | **aucun**, en partant de n'importe quel état atteint |

## Réglages
| Réglage | v3.434.0 | v3.435.0 | Pourquoi |
| --- | --- | --- | --- |
| Contremaître | 1 salle / 3 pas, puis 1 / 2 dès l'étage 4 | **1 salle / 2 pas, puis 1 / pas dès l'étage 5** | Il ne rattrapait le joueur que 0,15 fois par descente |
| Pierres errantes à l'escalier | 1 + l'étage | **1** | 12 à 15 Pierres par descente, ~40 par jour : trop au regard du chantier et du Cœur (3 par jour chacun) |
| Pierres errantes au coffre | 1 + un par deux étages | **1** | idem |
| Souffle | 3 par pas, 4 par tirage, +30 en descendant | inchangé | Mesuré : le Souffle arrête environ une descente sur cinq |

Les combats ne changent pas (banc de la v3.434.0, PV perdus en % des PV max) :
- garde : 12 à 19 % ;
- Contremaître : 28 à 32 % ;
- Gardien du plan : 38 à 42 %.

## Tutoriel de la première descente
« Le Labyrinthe aux leviers » s'ouvre à la première descente. Il tient en cinq points :
- le noir ;
- les leviers ;
- la carte d'Edda ;
- descendre ou remonter ;
- le Contremaître qu'on entend.

## Code
- `data/labyrinth.js` : réglages du banc.
- `ui/tutorial-view.js` : tutoriel `labyrinth_first`.
- `lang/en.js` : 5 traductions.
- `tools/sim/labyrinthe-bench.js` : le robot explorateur (`--robot`, `--runs`, `--prudent`). Il distingue un robot perdu d'un étage sans issue.
- **Aucun fichier ajouté. Aucun fichier protégé touché. Aucun nouvel état sauvegardé.**

## Reste à fournir
- `images/Boss/gardien_du_plan.jpg` : le portrait de face du Gardien du plan. Celui en place, tiré de la première planche, est provisoire.

## Contrôles
- Round : **4 096 OK**, 0 échec, sur cinq passes.
  - Nouvelle section [211] (7 contrôles).
  - Deux contrôles de [210] mis à jour : le gain de l'escalier passe à 1 Pierre.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 4 548 textes, 100 %, 0 orphelin.
- Chromium (390 × 844), vrai jeu, console sans erreur :
  - le tutoriel s'ouvre à la première descente ;
  - la descente, le rechargement et la remontée fonctionnent comme en v3.434.0.
- `node --check` sur tous les fichiers modifiés.

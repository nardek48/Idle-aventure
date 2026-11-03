# v3.640.0 — Faille, lot F-2 : les cinq échos

Conception « Faille » v0.1 (docs `idees/`), FA3 et FA4. Dès l'étage 2, chaque étage de la faille se souvient d'un monde et en reprend la leçon. Un écho est tiré par étage, jamais deux fois le même de suite ; l'étage du Reflet est toujours le palier. Le nom de l'étage et sa règle s'affichent en haut (« La veine du dedans · la chaleur »), et la note d'entrée les explique.

## Les cinq échos
| Écho | Monde | Règle |
| --- | --- | --- |
| L'étage du sable · la soif | Désert | Un pas coûte 5 de Souffle au lieu de 3 ; la source rend le double (Souffle et PV) |
| La rue qui tient · la relève | Ruines | Une garde battue en *Tenir* se relève quand tu reviens à son levier (une fois) ; *Charger* l'achève |
| Les gisants debout · le sommeil | Crypte | Une garde sur deux dort : la Ruse passe d'office. La combattre en réveille une troisième (garde de 3) |
| La veine du dedans · la chaleur | Montagne | Le coffre devient une veine. *Tailler* : +1 Givre bleu, 4 de Souffle, +8 % de coups reçus sur l'étage ; 5 tailles au plus |
| Le palier sans murs · le miroir | Tour | Reprendre l'approche du combat précédent (Charger ou Tenir) coûte +25 % de coups reçus. La carte du choix l'affiche |

Les échos jouent sur la carte et le pronostic, sans moteur de combat. Le tutoriel « La faille » a un point de plus sur les échos.

## Équilibrage (FA4)
Relevé sur les héros de fin d'Histoire des trois classes (sauvegardes de campagne complète). Le robot joue au plan parfait, monte sans s'arrêter, ruse les gardes endormies et varie l'approche au palier. 40 montées par classe.

| Réglage | Étage 5 atteint | Étage 10 atteint | Record | Ce qui arrête |
| --- | --- | --- | --- | --- |
| Échos, Souffle +30 par escalier | 90 à 95 % | 8 à 18 % | 11 à 13 | le Souffle (37 à 39 fins sur 40) |
| **Retenu : Souffle +50 par escalier** | 100 % | 73 à 88 % | 15 à 16 | surtout les PV (26 à 34 fins sur 40) |

- Avec +30, le Souffle arrêtait toutes les montées vers l'étage 7 : un étage coûte 45 à 65 de Souffle, et davantage avec le sable.
- Réglage retenu : `breathFloor` 30 → 50, le reste inchangé. Le mur vient maintenant des PV, entre les étages 15 et 20, comme le veut FA4.
- Le robot joue mieux qu'un joueur : il connaît le plan et ne tâtonne pas. Un joueur dépensera plus de Souffle à explorer, donc l'étage 10 sera moins souvent atteint que 73 à 88 %. À juger en jeu.
- La forme au sol ne rejoint presque jamais un robot au plan parfait (0 à 0,2 fois par montée). Elle pèsera sur un joueur qui explore.

## Moteur (`systems/labyrinth-run.js`)
- `_rollEcho`, `echoOf`, `stepCost`, `echoMult`, `cut` ; écho porté par le run (`run.echo`, `heat`, `veinCuts`, `guardDownAt`, `guardAsleep`, `lastAp`).
- Sans écho dans sa config, **le Labyrinthe ne change pas** : aucun tirage de plus, pronostic et pas identiques. Banc `labyrinthe-bench.js --robot` à graine fixe : sortie identique, octet pour octet.
- `ui/labyrinth-view.js` : nom et règle de l'écho dans le bandeau ; feuille « La veine » (Tailler / Laisser) ; garde endormie ; miroir et chaleur dits sur les cartes Charger / Tenir. Tuile `images/Maps/faille/veine.webp` à générer (icône générique en attendant).

## Fichiers
- Modifiés : `data/faille.js`, `systems/labyrinth-run.js`, `ui/labyrinth-view.js`, `ui/tutorial-view.js`, `ui/news-view.js`, `lang/en.js` (22 textes), `atelier/images-a-generer.html` (la tuile de la veine).
- Aucun fichier ajouté, aucun fichier protégé touché.
- Harnais [434] : 22 contrôles (tirage, les cinq règles, le Labyrinthe sans écho). [432] : le contrôle de la forme au sol part d'une salle sans événement (il échouait quand la salle de départ n'avait que la source pour voisine). Stable sur 6 passes.

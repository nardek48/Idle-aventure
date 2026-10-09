# Aethervale v3.429.16 — Heure 3 : pronostic des Marques, recette de la Ration moyenne, textes du Désert

Correctifs relevés en jouant la troisième heure dans Chromium (Rôdeur, de la Tanière au Désert). S'applique sur la v3.429.15.

## Le pronostic de donjon compte les Marques
- Cause : les effets des Marques sur le héros ne s'appliquent qu'une fois le run lancé (`recalcStats`), et Fléau seulement au moment de chaque coup ennemi. Le pronostic de la feuille de lancement ne les voyait pas.
- Correctif : `forDungeon` applique au pronostic les Marques choisies, sans toucher au moteur :
  - Ascétisme : plus de réserve de potions, et +15 % de dégâts.
  - Fragilité : −30 % de PV max, et +30 % de dégâts.
  - Fléau : +30 % de dégâts ennemis.
- Seul l'écart avec ce que les stats intègrent déjà est compté : un pronostic demandé pendant un run ne compte pas deux fois.
- Mesuré dans le jeu (Tanière, niveau 9) :

  | Marque | Réserve | PV | Dégâts / round | Coup ennemi |
  |---|---|---|---|---|
  | Aucune | 498 | 712 | 202 | 26 |
  | Ascétisme | 0 | 712 | 227 | 26 |
  | Fragilité | 348 | 498 | 252 | 26 |
  | Fléau | 498 | 712 | 202 | 34 |

- Au banc (Tanière, 10 runs par classe) :
  - Ascétisme : Rôdeur et Mage de « trivial » à « abordable » (100 % de réussite). Chevalier d'« abordable » à « hors de portée », pour 70 % de réussite réelle.
  - Limite connue : sur la Tanière, l'usure du Chevalier reste surestimée (644 annoncés pour 300 réels) ; la réserve de potions masquait cet écart.

## Tutoriel « Les braises d'Aeswyn »
- « 10 Viande séchée + 1 Pain » devient « 3 Viande séchée + 1 Pain » : la recette réelle depuis la v3.330.0 (`workshops.js`).

## Petites aventures : les textes du lieu suivent le monde
- Au Désert et aux Ruines, plusieurs textes parlaient encore de la forêt :
  - le bouton « Entrer dans la forêt » ;
  - « Écouter la forêt » au feu de camp ;
  - « …reste dans la forêt » à l'évacuation ;
  - « La forêt garde ses secrets » au retour ;
  - « Prendre la lanterne qui t'attend » à la destination sans combat.
- Correctif : une table de textes par monde (`pa2Words`). La Forêt garde ses textes d'origine.
  - Désert : « Entrer dans le désert », « reste dans le sable », « Fouiller les tentes ».
  - Ruines : « Entrer dans les ruines », « S'approcher du puits ».
- Le tutoriel de préparation dit désormais « tant que tu n'es pas encore parti ».

## Code
- `js/systems/combat-forecast-system.js` : Marques dans `forDungeon` (`_markMods`), lues par `getForecastHeroDamage`, `getHealingReserve` et `getEnemyDamagePerRound`.
- `js/ui/pa2-view.js` : `pa2Words(run)`. `js/ui/tutorial-view.js`, `js/data/story-quests.js` : textes.
- `js/lang/en.js` : 12 clés ajoutées, 2 clés modifiées.
- `tools/harness/round-harness.js` : libellé du contrôle de la Ration moyenne.
- Aucun fichier protégé touché. Aucun fichier ajouté.

## Contrôles
- Round : **3 963 OK**, 0 échec, sur trois passages. Boot : 4 OK. Création du héros : 44 OK.
- i18n : 4 203 textes, 100 %, 0 orphelin.
- Chromium (390×844) : feuille de préparation au Désert vérifiée (« Entrer dans le désert »), pronostic par Marque relevé dans le jeu.
- `node --check` sur tous les fichiers modifiés.

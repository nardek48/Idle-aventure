# Aethervale v3.353.0 — Harnais de campagne (option A)

Base : v3.352.0. **Aucun fichier du jeu modifié** en dehors du numéro de version. Un seul fichier nouveau, hors jeu et hors précache : `sim/campagne-harness.js`.

## Ce qu'il fait

Un joueur-robot joue **toute l'Histoire**, de la création du héros à `desert_15`, dans le vrai moteur (bac à sable VM, comme `boot-harness.js`).

- **Les gestes sont réels**, par l'API qu'appellent les boutons : accepter et réclamer les étapes, la chaîne de l'Atelier, les chantiers, les ateliers, les récoltes, les choix d'Histoire (cartes et stèles), l'offrande, l'échoppe, la forge, les talents et le Grimoire.
- **Les Petites Aventures et les secteurs de carte se jouent écran par écran.** Le robot choisit ses portes comme un joueur raisonnable : blessé, il cherche un soin et évite les obstacles. Il sort la corde quand l'estimation n'est pas bonne.
- **Les combats sont gagnés d'office.** C'est la limite de l'option A : on vérifie qu'on peut finir le jeu, pas s'il est équilibré. L'équilibrage, c'est l'option B.
- **Le temps est simulé.** Quand le robot attend, l'horloge avance : production, chantiers, ateliers, plafond journalier des expéditions, renouvellement de l'échoppe.
- **Après chaque étape, la partie est rechargée** dans un bac à sable neuf, par le vrai démarrage (écran titre, puis « Continuer »). Une étape qui ne tient pas au rechargement compte comme un échec.

Lancer :

```
node sim/campagne-harness.js . [--classe knight|ranger|mage] [--verbose]
```

Pour un lot :

```
for i in $(seq 10); do node sim/campagne-harness.js . --classe mage | tail -1; done
```

Une partie complète prend environ 2 s.

## Résultat

Lot final : 30 campagnes, 10 par classe. **Les 30 vont au bout, 35 contrôles OK chacune.** Aucune étape n'est bloquée par le jeu lui-même.

Pendant la mise au point, 3 campagnes s'étaient arrêtées (`desert_03`, `desert_06`), toutes par malchance aux expéditions. Le harnais s'obstine désormais comme un joueur : 10 essais par Petite Aventure, 20 par secteur.

Chaque étape affiche le temps simulé et le niveau du héros. Un exemple, en mage :

| Étape | Temps simulé | Niveau |
| --- | --- | --- |
| Fin de la Forêt (`forest_15`) | 2,9 h | 7 |
| `desert_04`, 2 secteurs | 31 h | 8 |
| `desert_06`, la porte du Temple | **152 h** | 9 |
| `desert_13`, le palier d'équipement | **225 h** | 11 |
| Fin du Désert | 225 h | 12 |

Sur le lot, une campagne prend **de 53 h à 233 h (médiane 109 h)**, dont 2,6 jours en moyenne perdus au plafond journalier des expéditions. Ce temps ne compte que les attentes, pas le temps passé en combat. C'est l'option B qui le mesurera.

## Ce que le harnais a trouvé

1. **La carte du Désert est un goulot.** Sur le lot, le robot libère 305 secteurs du Désert en 446 essais, soit **68 %**. Chaque échec rend un secteur voisin au sable : de 2 à 9 reprises par campagne. `desert_06` coûte parfois plus de 100 h à lui seul. Les évacuations arrivent presque toutes à **2 blessures**, souvent dès la profondeur 1 ou 2.
2. **L'estimation des obstacles est trop optimiste.** Sur le lot, « moyen » réussit **46 %** du temps (543 sur 1 173) et « faible » **34 %**. Le robot n'a **jamais** vu « bon » ni « élevé ». À revoir avec l'option B : un héros qui a fait de vrais combats et porte son équipement a peut-être de meilleures statistiques.
3. **L'arme Inhabituelle de `desert_13`.** Dans une campagne sur deux, elle est tombée plus tôt au combat. Sinon, le robot la trouve presque toujours à l'échoppe, à 4 000 or, avec une seule arme de sa classe en vitrine sur toute l'attente. Premier piège trouvé pendant la mise au point : **sac plein, l'échoppe refuse l'achat**. Le robot vide maintenant son sac ; un joueur qui ne pense pas à l'Offrande restera bloqué.
4. **L'Histoire ne demande jamais la chaîne de l'Atelier avant `desert_13`.** Le robot a atteint la fin du Désert sans l'avoir construit. Or la Forge 3 exige l'Atelier niveau 2, et aucune étape n'y conduit avant. Un joueur qui n'a suivi que l'Histoire découvre toute la chaîne au pied du palier : bois, planches, pierre, chantier, puis rang 2.
5. **Écart avec la carte des systèmes.** `WorkshopsSystem` écrit directement dans `game.resources` (lignes 280, 349 et 504 : débit à la mise en file, remboursement à l'annulation), sans passer par `WarehouseManager`. La carte dit l'inverse (« un seul point d'écriture »). Aucun bug constaté, mais c'est une exception à connaître, ou à corriger.

## Contrôles

| Contrôle | Résultat |
| --- | --- |
| round-harness.js ([85] neutralisée) | 3 319 OK, 0 échec |
| boot-harness.js | 4 OK |
| hero-creation-harness.js | 44 OK |
| retour-demarrage-bench.js | 7 / 7 |
| campagne-harness.js | 30 campagnes sur 30 au bout (3 classes × 10) |

## Fichiers

- `sim/campagne-harness.js` : **NOUVEAU**, outil hors jeu, absent d'`index.html` et du précache
- `js/core/constants.js` (`GAME_VERSION`)
- `sw.js` (`CACHE_VERSION`)

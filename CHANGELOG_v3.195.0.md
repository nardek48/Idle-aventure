# v3.195.0 — Petite Aventure : choix réels, enjeu, progression qui se sent

Constat de départ (Seb) : la Petite Aventure était répétitive, sans réelle difficulté, et les
choix n'avaient pas d'impact. Ce lot retravaille les fondations du scene-engine pour la Petite
Aventure (et, par ricochet contrôlé, `expedition_faille`) sans toucher au contenu narratif —
c'est un chantier de mécanique et d'équilibrage, pas de contenu.

## Diagnostic (voir session)

1. Les 3 options d'un obstacle étaient interchangeables (même difficulté, même gain) — un
   joueur prenait toujours sa meilleure stat, aucun vrai arbitrage.
2. Un seul porte par palier (`gatesPerDepth [1,1]`) : le mécanisme risque/récompense par
   porte (riskMod, indices de gain) existait dans le code mais tournait à vide.
3. La formule `successChance` écrasait presque totalement le poids de la stat du héros face à
   la profondeur (statBonus plafonné à 20) — un héros neuf et un héros très développé avaient
   une chance de réussite quasi identique.
4. Les blessures étaient cosmétiques (−2 stat fixe ≈ −0.4% de chance).
5. Le butin d'un run (62-103 or) était sans commune mesure avec une quête secondaire
   (400-800 or) : aucune raison de viser le risque.

## Recalibrage de la formule de base (SceneCheckSystem)

Partagée par `petite_aventure_foret` ET `expedition_faille` — décision assumée, validée par
simulation avant application.

- `successChance` : base 32 (au lieu de 35), statBonus plafonné à **55** (stat×0.40, au lieu
  de 20/stat×0.18), pénalité de profondeur ×0.8 (au lieu de ×0.9). Les héros vont de ~30-80
  de base (`data/heroes.js`) à +150 par entraînement (`data/upgrades.js`) — le nouveau plafond
  reflète cette vraie amplitude au lieu de l'écraser.
- `depthDifficulty` : pente adoucie à ×1.4/palier (au lieu de ×1.6) — le nouveau curseur
  d'intensité (voir plus bas) porte désormais une partie de la variation de dureté.

## Options d'obstacle asymétriques

Nouveau bloc `SCENE_NODES.optionProfiles` (data/scene-nodes.js), appliqué génériquement à
tous les gabarits obstacle (19 gabarits partagés) :

| Voie | diffMod | lootMod | Coût Souffle | Sévérité si échec |
|---|---|---|---|---|
| Puissance (power) | ×1.05 | ×1.20 | 3 | grave |
| Précision (precision) | ×1.0 | ×1.0 | 1.5 | normale |
| Endurance (endurance) | ×0.92 | ×0.8 | 1 | légère |

Chaque option est désormais un vrai arbitrage : plus dur/risqué mais plus payant, ou plus sûr
mais plus modeste — visible sur chaque carte d'obstacle (coût Souffle, indice de gain).

## Souffle — ressource de run visible

- `run.breath` (0-100, démarre à 100), affiché dans la barre de statut.
- Consommé par chaque option d'obstacle prise (voir tableau ci-dessus), qu'elle réussisse ou
  échoue.
- Restauré par un autel accepté ou une source (+20), et par le nouvel objet **Gourde**
  (+30, réutilisable, utilisable à tout moment).
- Une option devient indisponible (bouton désactivé) si le Souffle restant est insuffisant —
  trace concrète des choix passés : jouer la voie de puissance trop tôt oblige à composer
  plus prudemment ensuite.

## Blessures à sévérité variable

`run.injuries` contient désormais `{stat, severity}` au lieu d'une simple clé de stat.
Malus de stat effective par sévérité (`SCENE_NODES.injurySeverityMalus`) : légère −4,
normale −8, grave −12 (au lieu d'un malus fixe −2 invisible). Une blessure grave (issue d'un
échec en voie de puissance) pèse donc 3× plus qu'une légère.

## Curseur d'intensité — orthogonal au profil

Nouveau `SCENE_INTENSITY` (data/scene-templates.js), choisi juste après le profil
Bourrin/Prudent (nouveau statut de run `"intensity"`, entre `"profile"` et `"preparation"`) :

| Intensité | Paliers | Difficulté | Butin |
|---|---|---|---|
| Sentier | 6 | ×0.70 | ×1.0 |
| Chemin | 8 | ×1.0 | ×2.0 |
| Périple | 10 | ×1.15 | ×3.5 |

Décision Seb : le profil (Bourrin/Prudent) définit la NATURE du parcours (combats,
bloqueurs), l'intensité définit l'AMPLEUR du risque et du gain — deux axes indépendants.
`depthMax` du run suit désormais l'intensité choisie, pas `template.depthMax` (repli conservé
pour les canevas sans intensité, ex. `expedition_faille`, comportement inchangé).

Calibrage validé par simulation Monte-Carlo (session) : Sentier praticable dès un héros neuf,
Périple reste tendu même bien développé. Butin Périple en fin de progression dépasse enfin le
haut de fourchette d'une quête secondaire, ce qui justifie le risque maximal.

## Deux portes par palier

`gatesPerDepth` passé à `[2, 2]` pour `petite_aventure_foret` (au lieu de `[1, 1]`) — réactive
d'un coup le riskMod par porte et les indices de gain (déjà codés dans SceneEngine, morts
faute de second choix). Effet de bord traité proprement : le "chemin illustré" à nœud unique
(`SCENE_PATH_TEMPLATE_IDS`, 1 seul nœud cliquable par palier en dur) est structurellement
incompatible avec 2 portes — retiré de la liste pour ce canevas, qui bascule sur la grille de
cartes multi-portes déjà utilisée par `expedition_faille`. Remettre un chemin illustré à
plusieurs portes est un chantier UI distinct, pas fait dans ce lot.

## Nouvel objet : Gourde

Ajouté aux objets de préparation (`loadoutOffer`), restaure 30 Souffle, réutilisable comme la
corde, utilisable à tout moment (pas seulement en attente de nœud). Seul nouvel objet de ce
lot — décision Seb : l'enrichissement plus large du choix d'objets (objets thématiques par
option/profil) part en lot séparé, une fois le retour sur le Souffle en jeu réel obtenu.

Constat en passant : l'objet **Provisions** existe dans `loadoutOffer`/`items` depuis l'origine
mais n'a jamais eu d'effet câblé côté logique — vestige non implémenté, laissé tel quel dans ce
lot (hors scope), signalé pour information.

## Fichiers modifiés

- `js/systems/scene-check-system.js` — formule recalibrée
- `js/systems/scene-engine.js` — `resolveObstacle`/`estimateObstacle`/`rollLoot` acceptent un
  multiplicateur générique (diffMult/lootMult)
- `js/data/scene-nodes.js` — `optionProfiles`, `injurySeverityMalus`
- `js/data/scene-templates.js` — `SCENE_INTENSITY`, `gatesPerDepth [2,2]`, objet Gourde
- `js/systems/scene-run-system.js` — flow `profile → intensity → preparation`, Souffle,
  blessures à sévérité, `useSceneGourde`, `_obstacleFactors`, `_runLootMult`
- `js/ui/scene-view.js` — écran de choix d'intensité, pastille Souffle, bouton Gourde, cartes
  d'obstacle enrichies (coût/gain par option), `SCENE_PATH_TEMPLATE_IDS` vidé
- `css/04-panel-scene.css` — pastille Souffle, ligne de coût sur les cartes
- `round-harness.js` — tests mis à jour pour le nouveau flow et la formule recalibrée,
  section [PA5] réécrite (grille multi-portes remplace le chemin illustré)
- `sw.js` — CACHE_VERSION

## Validation

- `node --check` sur tous les fichiers modifiés : OK
- `round-harness.js` : 950-952 OK, 0 échec, stable sur 8 runs consécutifs (flottement de
  compte pré-existant, documenté en session précédente, non lié à ce lot)
- Simulation Monte-Carlo (moteur réel, via VM) : confirme qualitativement la progression
  stat-dépendante et l'écart Sentier/Chemin/Périple

## Non fait dans ce lot (identifié en cours de session)

- Enrichissement du choix d'objets de préparation (objets thématiques par option/profil) —
  lot séparé après retour terrain sur le Souffle
- Câblage de l'objet Provisions (vestige non implémenté, pré-existant, hors scope)
- Chemin illustré à plusieurs portes (actuellement désactivé pour Petite Aventure, repli sur
  la grille de cartes)
- Recalibrage fin d'`expedition_faille` suite à l'héritage de la nouvelle formule (à vérifier
  au prochain contact avec ce canevas)

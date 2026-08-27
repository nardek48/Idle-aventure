# Changelog v3.94.0 — La Source Tarie : déblocage du Puits, minijeu maintenir/relâcher

Troisième expédition de déblocage de bâtiment, sur le modèle exact de la Carrière
(v3.92.0) : nouveau minijeu dédié (maintenir puis relâcher, jauge de remplissage),
déblocage réel et définitif du Puits, puis activité bonus répétable une fois débloqué.
Aucun coût de ration — le Puits produit justement l'Eau, intrant de la petite ration
elle-même (verrou circulaire évité, décision explicite en amont du codage).

4 fichiers créés, 9 modifiés. `node --check` OK sur le projet complet. Boucle complète,
échec total, rechargement et migration revalidés via harnais `node vm`.

---

## Décision d'architecture (validée avec Seb avant codage)

Le moteur `MiningManager` (Carrière) est structurellement spécifique à ses propres
ressources et mécanique (`game.gatheringActivity.quarry`, jauge à curseur glissant en
continu, position figée au clic). Plutôt que de le généraliser au risque d'introduire une
régression sur la Carrière déjà en prod, **nouveau moteur miroir indépendant** :
`WellManager` + `well-check-system.js`, même structure conceptuelle (session/settle/
idempotence) mais mécanique et données propres. Réévaluation possible si un 4e site de
récolte suivait le même schéma.

**Contradiction du document levée avant codage** : "coûte 0 ration" en tête, mais
"la ration reste consommée" en cas d'échec plus bas. Confirmé avec Seb : **aucun coût**,
le Puits débloquant justement la production d'Eau (intrant de la ration), un coût en
ration aurait recréé le même verrou circulaire que celui cassé au Jalon A (v3.91.0).
Texte d'échec ajusté en conséquence.

---

## Fichiers créés

### js/systems/well-check-system.js
Module pur : `WellCheckSystem.resolveRelease({endurance, fillPct}) ->
{result: "tooEarly"|"correct"|"perfect"|"tooLate", ...}`. Aucun accès à game, au DOM, à
WarehouseManager ou à Math.random.

4 zones réparties sur la jauge 0-100%, centrée à 70% (pas au milieu, pour laisser un vrai
risque de "trop tôt" comme de "trop tard") :
- Zone parfaite : demi-largeur 5 + bonus/2 (10% de large à Endurance 0, jusqu'à 16% à
  Endurance élevée).
- Zone correcte : 20% de plus de chaque côté de la zone parfaite.
- Au-delà : trop tôt (sous-remplissage) ou trop tard (débordement).
fillWindowBonusPct(endurance) = clamp(endurance × 0.15, 0, 12) — même formule que
MiningCheckSystem.perfectWindowBonusPct, transposée à l'Endurance.

### js/systems/well-system.js
WellManager — cycle de vie complet, miroir de MiningManager mais indépendant.
checkQuestRequirements() sans vérification de ration (aucun coût). buildHeroSnapshot()
lit uniquement game.heroEnduranceRaw. resolveRelease(fillPct) idempotent (refuse une
tentative hors session active ou déjà résolue). settle() crédite l'Eau, débloque le
Puits si au moins 1 résultat correct/parfait sur 3, applique le cooldown si activité bonus
— strictement idempotent.

### js/ui/well-view.js
Popups intro -> session (jauge de remplissage) -> bilan. Mécanique maintenir puis
relâcher : pointerdown démarre le remplissage visuel (classe CSS .is-filling, transition
linéaire sur 2200ms), pointerup lit la largeur réelle atteinte via getBoundingClientRect()
et fige immédiatement la barre à cette valeur (bug de saut visuel trouvé et corrigé
pendant le développement : retirer la classe d'animation sans figer style.width
explicitement aurait fait revenir la barre à 0% avant remplacement du DOM). pointerleave
traité comme un relâchement de sécurité (évite un blocage si le pointeur glisse hors du
bouton en tactile). Espace/Entrée en clavier avec gestion keydown/keyup séparée pour un
vrai maintien (pas juste un déclenchement au clic).

### css/04-panel-well.css
Jauge de remplissage (.well-gauge-fill, largeur animée) par-dessus des zones colorées en
fond semi-transparentes (rouge trop tôt/trop tard, orange correct, bleu parfait) —
mécanique visuelle différente de la jauge à curseur glissant de la Carrière.

---

## Fichiers modifiés

### js/data/exploration-quests.js
Nouvelle entrée EXPLORATION_QUESTS.driedSpring : "La Source Tarie", cost: {} (aucun
coût), minigame.attemptCount: 3, récompenses par résultat (0/2/4/0 Eau), texte d'échec
ajusté ("Tu peux retenter l'expédition quand tu veux."), unlockBuildingId: "well".

### js/systems/stats-system.js — exception déjà en cours d'usage
2 lignes additives dans recalcStats() : game.heroEnduranceRaw = totalEndurance;, juste
après son calcul déjà existant. Même raison que heroPowerRaw/heroPrecisionRaw
(v3.90.0) : source de vérité unique, jamais recalculée ailleurs.

### js/core/state.js
explorationProgression étendu (driedSpringDiscoveryCompleted, wellUnlocked),
gatheringActivity.well ajouté. Nouvelle garde de forme pour game.gatheringActivity
lui-même (n'existait pas encore explicitement avant cette version).

### js/systems/save-system.js — exception déjà en cours d'usage
driedSpringDiscoveryCompleted/wellUnlocked ajoutés aux 4 emplacements habituels, avec
le même raisonnement de migration que quarryUnlocked/huntBuildingUnlocked : toute
sauvegarde antérieure à cette version (Puits débloqué nativement, sans verrou) reçoit
wellUnlocked: true d'office. gatheringActivity.well avec garde de forme séparée
(une sauvegarde v3.92.x/v3.93.x a déjà gatheringActivity mais sans la clé well).

### js/systems/production-system.js (non protégé)
well ajouté à PRODUCTION_UNLOCK_FLAGS (déjà généralisé depuis v3.93.0) — aucune autre
modification nécessaire, le verrou réel (aucune production tant que non débloqué) et son
initialisation rétroactive (unlockBuilding("well")) fonctionnent immédiatement.

### js/ui/quests-view.js
Deux nouvelles boucles de collecte (miroir exact du pattern Carrière) :
- Carte quête "La Source Tarie" dans la catégorie Expéditions (buildDriedSpringQuestDetailHTML),
  exclue de la boucle générique EXPLORATION_QUESTS comme unstableVein.
- Carte activité bonus "Source Claire" dans Ressources (buildWellBonusQuestDetailHTML),
  visible uniquement si WellManager.isWellUnlocked().

### js/main/boot.js (non protégé)
Reprise d'une session de puisage active après rechargement (resumeWellSession()), même
pattern que resumeMiningSession().

### index.html
5 nouveaux <script> (well-check-system.js, well-system.js, well-view.js, ordre
pur -> engine -> UI) et 1 nouveau <link> CSS.

### sw.js
CACHE_VERSION : 3.93.0 -> 3.94.0.

---

## Fichiers protégés — confirmation de non-modification

combat-engine.js, progression-system.js, warehouse-system.js, game-loop.js,
class-combat-system.js, dungeon-system.js, adventure-quest-system.js,
hunt-quest-system.js, world-quest-system.js : aucun n'a été modifié.
stats-system.js : modifié uniquement pour les 2 lignes exposant l'Endurance brute
(exception déjà utilisée pour Puissance/Précision).

---

## Tests manuels à effectuer

- Avant complétion : carte "La Source Tarie" visible dans Expéditions, aucune carte
  "Source Claire" dans Ressources, Puits invisible en Production.
- Départ : aucun coût, bouton "Partir explorer" toujours disponible tant que le héros est
  sélectionné.
- Maintenir le bouton "Puiser" : la jauge monte visuellement ; relâcher trop tôt (0 Eau),
  au bon moment/zone correcte (+2 Eau), en zone parfaite/centre (+4 Eau), trop tard/après
  débordement (0 Eau).
- Au moins 1 résultat correct/parfait sur 3 : Puits déverrouillé, popup "Puits
  déverrouillé", Eau créditée, production passive du Puits inchangée (niveau, capacité,
  coûts, récolte, catch-up hors-ligne — comportement historique préservé).
- 3 échecs (trop tôt/trop tard uniquement) : aucune Eau, Puits non débloqué, quête
  retentable, message d'échec affiché.
- Immédiatement après déblocage : carte "Source Claire" apparaît dans Quêtes >
  Ressources, cooldown de 10 minutes après chaque session bonus, bouton désactivé
  pendant session/cooldown, réactivé après (y compris après rechargement).
- Rechargement à chaque étape (intro, en pleine session, après la 3e tentative avant
  bilan, après le bilan avant clic sortie) : reprise correcte, aucun reroll, aucun double
  crédit.
- Chargement d'une sauvegarde antérieure à cette version : wellUnlocked doit être
  true automatiquement, Puits visible immédiatement en Production, sans perte de
  niveau/stock déjà accumulé.
- Non-régression Carrière (Veine Instable), Chasse (Meute Affamée), Sentier Obstrué,
  Sauvegarde, Production des autres bâtiments : tous testés inchangés via harnais vm.

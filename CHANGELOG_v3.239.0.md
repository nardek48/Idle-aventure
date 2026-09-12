# Aethervale — v3.239.0

Le temps passé hors du jeu est enfin crédité quand l'application reste ouverte.
**Un seul fichier protégé touché** : `js/main/game-loop.js`, une instruction,
périmètre validé par Seb avant écriture.
Harnais : 1741 assertions, 0 échec. `node --check` : OK sur les 129 scripts.

---

## Le défaut

Le jeu avait deux chemins pour créditer le temps écoulé, et un seul lisait
l'horloge.

`catchUpOffline()` lit `lastTick`, calcule l'écoulé réel et crédite. Il n'était
appelé **que depuis `main/boot.js`**, donc uniquement au chargement de la page.

`tick(dt)` tourne à chaque frame depuis `main/game-loop.js`, avec `dt` borné à
**0,25 s** — et il écrase `plot.lastTick = Date.now()` à chaque passage.

Quand iOS suspend la PWA, `requestAnimationFrame` s'arrête. Au retour, la première
frame voyait un `dt` de 1800 s, le bornait à 0,25 s, créditait 0,25 s, puis écrasait
`lastTick`. **L'écart était effacé, pas reporté.** La perte était définitive, y
compris après un rechargement complet : l'autosave suivante écrivait le `lastTick`
écrasé.

Cela explique l'intermittence rapportée par Seb. Si iOS **tue** l'application
pendant l'absence, le retour repasse par `boot.js` et le rattrapage fonctionne ; si
elle survit, tout est perdu.

Deuxième symptôme, cause distincte : **retour sur un héros laissé de côté**. Le
chemin est « 👥 Mes héros » (`openHeroSlotsScreen`, écran Résumé), qui ouvre l'écran
titre en cours de partie. `init()` ayant déjà tourné, `switchToSlot()` fait
`saveGame → wipe → loadGame` et s'arrête là : aucun rattrapage, et la boucle écrase
`lastTick` à la frame suivante. Ce n'est pas un écart d'horloge mais un état périmé —
aucune garde de boucle ne peut le voir.

---

## Mesures — `sim/offline-bench.js` (nouveau)

Le banc charge le vrai moteur dans une VM, pilote l'horloge, et refuse de tourner si
le plafond de `dt` ou l'appel de `boot.js` ont bougé. Partie de test : 6 bâtiments,
3 zones ouvertes chacun, 9,30 unités/min.

Absence de 30 minutes :

| Scénario | Avant | Après |
| --- | --- | --- |
| Application fermée puis rouverte | 240 unités | 240 (inchangé, c'est la référence) |
| Restée ouverte en arrière-plan | **0** | **240** (100 %) |
| Retour sur un héros laissé de côté | **0** | **240** |
| Lot d'atelier (moulin, farine) | avancé de 0,25 s | avancé de 3 s, terminé |

Sur 10 minutes, l'arrière-plan créditait 0 sur 84. Le banc prouve aussi que la perte
était irrécupérable, en appelant `catchUpOffline()` juste derrière la frame de
reprise : 0 unité récupérée.

---

## Le correctif

### Fichier protégé — `js/main/game-loop.js`, fonction `gameLoop()`

Une instruction, insérée entre la garde `isFinite` et le plafond :

```js
if (window.ResumeManager && dt > ResumeManager.GAP_S) { ResumeManager.catchUpAfterGap(dt); dt = 0; }
```

Trois raisons de la placer là plutôt qu'ailleurs :

- c'est la boucle qui efface, c'est donc elle qui doit détecter — tout système futur
  branché sur `tick(dt)` sera couvert par construction ;
- la garde tourne **avant** `tick()`, donc `lastTick` porte encore sa valeur d'avant
  la suspension : `catchUpOffline()` s'applique tel quel, sans rembobinage ni
  double-comptage ;
- le test `window.ResumeManager &&` fait qu'en l'absence du nouveau fichier, le
  comportement est **exactement** celui d'avant — aucune régression possible.

`dt = 0` pour cette frame : une reprise ne doit déclencher ni round de combat, ni
saut de minuteur d'interface.

### Nouveau — `js/systems/resume-system.js`

Toute la logique vit ici, hors périmètre protégé. Deux entrées pour deux causes :

- `catchUpAfterGap(dt)` — écart d'horloge, appelée par la boucle ;
- `catchUpAfterSlotLoad()` — état périmé, appelée après un changement de héros.
  L'absence se lit dans `game.lastOnline`, c'est-à-dire la date de la dernière
  sauvegarde **de ce héros**.

Les deux passent par le même corps, qui appelle `ProductionManager.catchUpOffline()`
puis sauvegarde. Idempotent : `catchUpOffline()` repose `lastTick` à maintenant, un
second appel ne crédite rien — indispensable, puisqu'au démarrage le chargeur
d'emplacement et `init()` l'appellent tous les deux.

**Annonce de retour** : au-delà de **30 minutes** (choix Seb), un toast et une ligne
de journal listent les gains. En dessous, le rattrapage est silencieux — un toast à
chaque déverrouillage d'écran serait du bruit. Volontairement pas la modale
d'`OfflineManager`, qui interrompt une partie en cours ; elle reste le bon outil au
chargement de la page, où le joueur n'est pas encore à l'écran. Verrou anti-rafale
d'une minute entre deux annonces.

### Changement de héros — deux appelants, aucun protégé

Une ligne dans `titleScreenConfirmLoad()` (`title-screen-view.js`) après
`switchToSlot()`, une dans `cancelHeroSelection()` (`modal-view.js`) après son
`loadGame()` manuel. `save-system.js` n'est pas touché : le rattrapage n'est pas du
ressort de `switchToSlot()`, qui ne sait rien du contexte d'appel.

---

## Ce qui n'avait pas besoin d'être corrigé

Vérifié plutôt que supposé — ces systèmes lisent l'horloge murale et se rattrapent
seuls, ils sont hors du défaut :

- **chantier de Village** : `Date.now() < site.endsAt`, rien à reporter ;
- **régénération du Campement** : `campRegenLastAt`, recalculée à chaque appel ;
- **potions** : expiration par horodatage.

Et `ProductionManager.catchUpOffline()` couvre déjà **les zones ET les files
d'ateliers** : le correctif n'a qu'un seul appel à passer.

---

## Nouveau bloc de harnais : [46] Reprise après écart d'horloge

14 assertions. Les trois structurelles lisent la source de `game-loop.js` pour
vérifier que la garde existe, qu'elle est **avant** le plafond (sinon elle ne sert à
rien) et qu'elle reste conditionnée à la présence du système. Les autres mesurent :
30 min créditées, détail des gains rendu, idempotence, écart d'1 s ignoré.

La dernière est un **témoin du défaut d'origine** : elle rejoue l'ancien
comportement (`tick(0.25)` sur un `lastTick` vieux de 30 min) et vérifie qu'un
rattrapage postérieur ne récupère toujours rien. Si quelqu'un déplace un jour la
garde après le plafond, c'est cette assertion qui le dira.

---

## Fichiers modifiés

| Fichier | Nature |
| --- | --- |
| `js/main/game-loop.js` | **protégé** — 1 instruction dans `gameLoop()` |
| `js/systems/resume-system.js` | **nouveau** — toute la logique |
| `js/ui/title-screen-view.js` | 1 ligne après `switchToSlot()` |
| `js/ui/modal-view.js` | 1 ligne dans `cancelHeroSelection()` |
| `index.html` | 1 `<script>` |
| `sim/offline-bench.js` | **nouveau** — banc de mesure |
| `round-harness.js` | bloc [46] |
| `js/core/constants.js` | `GAME_VERSION` → 3.239.0 |
| `sw.js` | `CACHE_VERSION` → 3.239.0 + précache du nouveau fichier |

---

## Connu, non corrigé

- **`js/ui/more-view.js` : fichier orphelin.** Il n'est chargé par `index.html`
  nulle part — remplacé par `heros-view.js` en v3.203.0, jamais supprimé. Son bouton
  « Changer de héros » appelle `changeHero()`, fonction qui n'existe pas dans le
  projet, mais l'écran n'étant pas atteignable, rien n'est cassé pour le joueur.
  340 lignes à retirer dans une passe de nettoyage.
- **Précache incomplet du service worker** (déjà signalé en v3.238.0) : quatre
  feuilles du kit et plusieurs `04-panel-*.css` récents manquent à
  `PRECACHE_APP_SHELL`. Sans effet en usage normal.

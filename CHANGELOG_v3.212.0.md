# CHANGELOG v3.212.0 — feuille au-dessus du menu, verrou de sortie, code mort retiré

Harnais : **1310–1312 OK, 0 échec**. `CACHE_VERSION` = **3.212.0**.
Ce ZIP contient aussi v3.208.0 → v3.211.0.

---

## 1. Les feuilles basses passaient derrière la barre de navigation

**Symptôme** (captures Seb) : la feuille Presets et la feuille Rapport s'affichaient
sous le menu du bas, qui masquait leur pied.

**Cause.** Rien à voir avec le `z-index`. `#panel-container` porte
**`isolation: isolate`** : il crée son propre contexte d'empilement, et le `z-index: 901`
de la feuille y restait enfermé. Le panneau est peint avant `#tab-bar` — donc en dessous,
quelle que soit la valeur choisie. Monter le z-index n'aurait rien changé.

**Correctif.** La feuille sort du panneau et vit dans sa propre racine en fin de `<body>`,
`#grimoire-sheet-root`, comme les autres modales du jeu (`tutorial-modal-root`,
`combat-report-modal-root`…). `buildGrimoireHTML()` ne la contient plus ;
`renderGrimoireSheet()` l'écrit dans sa racine, appelée depuis `renderPanel()`.

Effet de bord voulu : quitter l'écran Grimoire referme la feuille, au lieu de la laisser
flotter au-dessus d'un autre panneau.

---

## 2. Le Grimoire se fige pendant une sortie

Demande Seb : « en combat on ne doit pas pouvoir ouvrir le Grimoire ».

**Choix de la porte.** `SortieManager.isActive()`, seul marqueur d'activité engagée du
jeu. `game.enemy` ne dit rien : un ennemi réapparaît après chaque kill, il est présent en
permanence. Une sortie démarre à la première action de combat (`combat-engine.js`) et se
termine au retour, à la fuite, à la mort ou au succès.

**Lecture seule plutôt que blocage sec.** L'écran reste accessible et les règles restent
lisibles — on peut vérifier sa configuration en pleine sortie, on ne peut simplement plus
la changer. Un bandeau l'annonce : « Sortie en cours — tes règles sont figées. Rentre au
Campement pour les modifier. »

Ce qui se désactive :

| Élément | Raison |
|---|---|
| Listes déroulantes Si / Alors | modification de règle |
| Bouton « Vider cet emplacement » | idem |
| Sélecteur 🎯 Tactique / 📖 Grimoire | `setCombatMode()` remet l'horloge de round à zéro |
| Bouton « Charger » d'un preset | remplace les 6 règles d'un coup |

Enregistrer un preset reste possible : ça ne fait que photographier la configuration
courante.

**Garde-fous côté écriture.** L'interface grise, et le code refuse aussi :
`setGrimoireRuleCondition`, `setGrimoireRuleAction`, `clearGrimoireRule`,
`setGrimoireCombatMode` et `loadGrimoirePreset` sortent tous en début de fonction si
`isGrimoireEditable()` est faux. Une assertion vérifie qu'un appel direct ne modifie rien.

---

## 3. `explainGrimoireRuleStatus()` retirée

Elle ne servait qu'aux badges d'état de l'ancien écran (prête / en attente / ressource
insuffisante / en recharge), supprimés à la refonte v3.210.0 — **plus aucun appelant**.

Le Rapport de combat couvre déjà la même information a posteriori (« 3 échecs par
ressource insuffisante », « 9 blocages par réservation »).

Si un indicateur **en combat** devient nécessaire un jour, la version d'origine est dans
le delta v3.211.0, et les quatre helpers qu'elle combinait — `evaluateGrimoireCondition`,
`canAfford`, `isCooldownReady`, `checkActionConditions` — sont tous encore en place. Un
commentaire à l'emplacement le dit.

`game.expertModeEnabled` reste en sauvegarde, inerte : `save-system.js` est protégé.

---

## Fichiers modifiés (v3.212.0)

```
css/04-panel-grimoire.css            bandeau de verrou, sélecteur de mode grisé
index.html                           racine #grimoire-sheet-root
js/systems/combat-auto-policy-system.js  explainGrimoireRuleStatus retirée
js/ui/grimoire-view.js               feuille hors panneau, isGrimoireEditable()
js/ui/ui-root.js                     renderGrimoireSheet() appelée au rendu
round-harness.js                     bloc [20] (+20 assertions)
sw.js                                CACHE_VERSION 3.212.0
```

Aucun fichier protégé modifié.

---

## À tester sur iPhone

1. Grimoire → Presets et Rapport : la feuille passe **au-dessus** du menu du bas.
2. Ouvrir une feuille, puis changer d'onglet : elle ne reste pas accrochée à l'écran.
3. Partir en quête ou en donjon, puis ouvrir le Grimoire : bandeau « Sortie en cours »,
   règles lisibles, listes déroulantes grisées, sélecteur de mode grisé.
4. Feuille Presets pendant la sortie : « Charger » grisé, « Enregistrer » actif.
5. Rentrer au Campement : tout redevient modifiable.
6. Vérifier qu'un farm libre (sans quête) suit la même règle — la sortie démarre dès la
   première action de combat.

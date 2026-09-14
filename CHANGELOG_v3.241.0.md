# CHANGELOG v3.241.0 — Écran de combat en trois bandes (layout A2)

**Base :** v3.240.0 (à installer avant) · **Delta :** 9 fichiers + `atelier-combat.html` · `CACHE_VERSION` et `GAME_VERSION` → `3.241.0`

## Validation

| Contrôle | Résultat |
|---|---|
| `round-harness.js` | **1742 OK, 0 échec** (×3) |
| `boot-harness.js` | 4 OK, 0 échec |
| `hero-creation-harness.js` | 44 OK, 0 échec |
| `node --check` sur les 145 JS | OK |
| Parcours Chromium 320 × 568, 390 × 844, 430 × 932 | 0 erreur JS ; combat → village → combat : le portrait revient bien dans le HUD |

**Aucun fichier protégé modifié.** `combat-engine.js` continue de trouver ses trois cibles DOM (`enemy-display`, `enemy-emoji`, `combat-hero-mini`) aux mêmes ids.

## Ce qui change à l'écran

Réglages retenus dans l'atelier : **layout A2** (héros en bas), compétences 140 %, potions 110 %, Attaque 80 %, statuts ennemi 125 %, panneau héros 100 %.

```
┌────────────────────────────┐
│ ARÈNE      mission 3/8     │  flexible : prend tout l'espace restant
│            Nom · PV        │
│            ● ● ● ●         │  statuts en rangée sous la PV, 40–50 px
│        [ ennemi scalé ]    │  bords fondus (masque radial)
├────────────────────────────┤
│ COMMANDES  ▢ ▢ ▢ ▢         │  4 compétences 66–80 px
│           ◯ ATTAQUE ◯      │  Attaque 80 % de largeur, ratio préservé
│  R12 Tactique Continuer    │  contrôles + vitesse x1/x2/x4 sur une ligne
├────────────────────────────┤
│ HÉROS  portrait · PV       │  butin · potions restantes · Fuir/Rentrer
│        Rage ▬▬▬▬           │  ressource de classe
│        Célérité ▬▬▬        │
└────────────────────────────┘
```

Le HUD (`#hud`) est masqué en combat : le panneau héros du bas le remplace intégralement. Hors combat, rien ne change.

## Comment c'est fait

**`combat-view.js`** — `buildCombatHTML()` réécrit en trois bandes `.cb-arena / .cb-cmd / .cb-hero`. **Tous les ids existants sont conservés** ; les fonctions de rendu partiel (`renderEnemyHp`, `renderEnemyStatusBar`, `renderCombatControls`, `renderClassSkillButtons`, `renderHealButtons`…) n'ont pas été touchées. Seule la jauge de célérité quitte `buildCombatControlsHTML()` pour une nouvelle fonction `buildCombatCelerityHTML()`, rendue dans `#combat-celerity-root` par `renderCombatControls()`.

**`hud-view.js`** — nouvelle fonction `relocateCombatHeroMini(intoCombat)` : **déplace le nœud DOM** `#combat-hero-mini` (portrait, niveau, PV, avec ses ids) du HUD vers `#combat-hero-slot` à l'entrée en combat, et le ramène dans le HUD en sortant. Aucun rendu dupliqué : `renderHeroHp()` et `renderCombatHeroMini()` continuent de cibler les mêmes éléments, où qu'ils soient.

**`ui-root.js`** — `switchTab()` appelle `relocateCombatHeroMini(combatMode)` juste après le toggle de `combat-active` ; `renderAll()` appelle `renderClassSkillButtons()` pour que les compétences soient là dès l'entrée en combat (avant, elles n'apparaissaient qu'au premier tick de `combat-engine.js`).

**`combat-speed-view.js`** — `renderCombatSpeedBar()` cible `#combat-speed-inline` (dans la rangée de contrôles) s'il existe, sinon l'ancien `#combat-speed-bar`. Ce dernier reste dans `index.html` mais est masqué en combat.

**`css/03-combat-v2.css`** — nouveau fichier, chargé juste après `03-combat.css` et ajouté au précache. Il pose la structure en flux et **neutralise les positions absolues** ancrées en bas de `#game-area` (`.combat-action-row`, `.combat-attack-row`, `.class-resource-bar`, `.combat-controls`), le `margin-top: -100px` de `#enemy-display`, le `translateY(-25px)` du nom et de la PV ennemis, et le masque linéaire de `.enemy-image` remplacé par un masque radial. `03-combat.css` n'est pas modifié : jauges, animations et cadres de compétence y restent.

**`round-harness.js`** — deux assertions structurelles adaptées au nouvel ordre : la jauge de célérité se teste via `buildCombatCelerityHTML()`, et l'ordre DOM attendu devient `enemy-display > mission > enemy-name > PV > enemy-status-bar`.

## Points à vérifier sur iPhone

1. **Le masque radial sur les monstres** dont le sujet touche le bord du carré (troll, golem) : il pourrait couper une épaule. Réglable par ennemi via une classe sur `#enemy-emoji`.
2. **Le portrait dans le panneau du bas** : le badge « Niv. » du mini-héros chevauche légèrement le bas du portrait à 56 px. Un ajustement de `bottom` sur `.combat-hero-mini-level` dans `03-combat-v2.css` suffira.
3. **Safe area** : l'arène commence sous l'encoche (`--safe-top`), le panneau héros s'arrête au-dessus de la barre home (`--safe-bottom`). Les captures Chromium n'ont ni l'une ni l'autre.
4. **Sur SE (568 px)** l'ennemi tombe à ~130 px de haut. C'est la limite physique avec quatre jauges, quatre compétences et une rangée de contrôles.

## À noter

- `atelier-combat.html` est livré à la racine, comme les autres ateliers. Il n'est chargé par rien.
- Une assertion du harnais est **aléatoire** et échoue à peu près une fois sur cinq, sur cette version comme sur la v3.239.0 d'origine : « run terminé soit par évacuation soit par fin de carte » (l. 1982, Petite Aventure). Elle n'est pas liée à ce chantier ; à regarder un jour dans `scene-run-system.js`.

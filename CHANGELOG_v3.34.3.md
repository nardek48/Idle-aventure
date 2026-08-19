# Aethervale — v3.34.2 → v3.34.3

## Cooldown sur l'attaque de base (tap manuel)

Le tap manuel n'avait aucune limite de fréquence — repris du bac à sable
(mécanique validée par simulation, `SANDBOX_DEFAULT_BASE_COOLDOWN_MS`),
jamais branché au jeu réel jusqu'ici (`cooldownMs: 0` restait figé dans
`data/class-skills.js` pour l'attaque de base des 3 classes).

### Ce qui change pour le joueur

- Chaque tap (bouton ATTAQUE ou sprite ennemi) démarre un cooldown de
  **1000 ms de base**, réduit par la Célérité totale du héros (base +
  entraînée) — même formule et même plafond que les skills de classe :
  `1000 / (1 + célérité/100)`, jamais en dessous de 500 ms (-50% max).
- Pendant le cooldown, le bouton/sprite restent **cliquables** — un clic
  pendant le cooldown ne fait rien immédiatement mais **met le coup en
  file d'attente** (profondeur 1, un seul coup en attente) : il se
  déclenche automatiquement dès que le cooldown se termine. Les clics
  suivants pendant le même cooldown sont ignorés (la file ne s'empile
  pas).
- Feedback visuel : jauge de remplissage + compte à rebours en secondes
  sur le bouton ATTAQUE (même style que les 4 boutons de skill de
  classe), léger grisage du sprite ennemi.
- Le talent Main spectrale (auto-tap) respecte désormais aussi ce
  cooldown — avant, il aurait pu le contourner en tapant à son propre
  rythme indépendamment.
- Ce cooldown n'a aucun rapport avec la ressource de classe
  (Rage/Concentration/Mana) : le tap continue de faire gagner de la
  ressource normalement, juste moins souvent qu'avant s'il n'y avait
  aucune Célérité investie.

### Pourquoi cette valeur

1000 ms est la valeur que Seb avait déjà ajustée et validée dans le bac
à sable (v3.33.9, montée depuis 600 ms — "trop proche du spam de clics"
en dessous). Reprise telle quelle plutôt que réinventée, cohérente avec
les runs de simulation déjà faites sur les 3 classes.

## Fichiers modifiés

- `js/systems/combat-engine.js` — nouvelle constante
  `BASIC_ATTACK_BASE_COOLDOWN_MS` (1000) ; nouvelles fonctions
  `CombatEngine.requestPlayerAttack()` (point d'entrée humain, garde de
  cooldown + file d'attente), `getTotalCelerity()`,
  `tickBasicAttackCooldown()` ; `playerAttack()` démarre le cooldown à
  la fin (via `computeEffectiveCooldownMs()`, déjà présent dans
  `combat-cooldown-system.js`, jamais appelé pour l'attaque de base
  jusqu'ici) ; `autoTap()` vérifie aussi le cooldown avant d'appeler
  `playerAttack()` ; l'alias global `playerAttack()` (appelé par les
  `onclick="..."` HTML) pointe maintenant vers `requestPlayerAttack()`
- `js/ui/combat-view.js` — nouvel overlay `#basic-attack-cooldown-overlay`
  dans le bouton ATTAQUE ; nouvelles fonctions
  `buildBasicAttackCooldownOverlayHTML()`/`renderBasicAttackCooldown()`
  (jauge + grisage du sprite ennemi)
- `js/core/state.js` — nouveaux champs `basicAttackCooldownMs`/
  `basicAttackPending` (init + `ensureGameStateDefaults()`), **jamais
  sauvegardés** (comme `game.enemy`, état de combat éphémère par
  nature — repart toujours à 0 au chargement)
- `js/main/game-loop.js` — appel de `CombatEngine.tickBasicAttackCooldown(dt)`,
  mêmes conditions que l'auto-DPS (écran Combat actif, pas de modale,
  héros pas à terre)
- `css/03-combat.css` — `.combat-attack-btn` passe en `position: relative`
  + `overflow: hidden` (ancre l'overlay) ; nouveau style
  `#basic-attack-cooldown-overlay` (réutilise `.combat-action-cooldown`/
  `-fill` déjà stylées pour les boutons de skill) ; nouvelle classe
  `#enemy-emoji.on-cooldown` (grisage léger, `filter` CSS)
- `sw.js` — `CACHE_VERSION` 3.34.2 → 3.34.3

Aucun changement côté `data/class-skills.js` : `cooldownMs: 0` reste
inchangé pour les 3 attaques de base (le cooldown de v3.34.3 est une
mécanique de moteur séparée, pas une valeur de cette donnée).

## Tests

Nouveau harnais dédié (`test_basic_attack_cooldown.js`), chargeant le
VRAI `combat-engine.js` cette fois (pas un stub) — 22 assertions, toutes
passées :
- un tap inflige des dégâts et démarre un cooldown de 1000 ms à
  Célérité 0
- un 2e/3e clic pendant le cooldown ne fait rien immédiatement, mais met
  bien le coup en file d'attente (profondeur 1, pas d'empilement)
- le décompte progressif fonctionne (`tickBasicAttackCooldown`)
- le coup en attente se déclenche automatiquement à l'expiration, un
  nouveau cooldown démarre aussitôt
- sans coup en attente, le cooldown retombe à 0 sans rien déclencher
- Célérité 100 → cooldown réduit à 500 ms (formule vérifiée précisément)
- Célérité 100 000 → cooldown toujours plafonné à 500 ms (-50% max)
- `autoTap()` (Main spectrale) est bloqué pendant le cooldown, fonctionne
  normalement hors cooldown, et relance lui aussi le cooldown
- héros à 0 PV → `requestPlayerAttack()` ne fait rien du tout, ni dégât
  ni mise en file

Total : 91 assertions sur les 2 harnais (69 précédentes + 22 nouvelles),
toutes passées. `node --check` OK sur tous les fichiers modifiés. CSS
vérifié équilibré. Bac à sable revérifié intact (checksums inchangés).

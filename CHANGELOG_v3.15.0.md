# Aethervale — CHANGELOG v3.15.0

Base : v3.14.0. Suite du point 6 de la livraison précédente : la mort
laisse maintenant réellement le héros à 0 PV, le repos au Campement
devient une vraie nécessité plutôt qu'une mise en scène.

## Ce qui change

`systems/combat-engine.js` (`onHeroDefeated()`, branche normale — pas
donjon/run de quête, inchangés, voir plus bas) : `game.heroHp = 0` au lieu
de la restauration complète. Le joueur est toujours renvoyé au Campement
avec le message (v3.14), mais cette fois le repos (long ou court) est
vraiment nécessaire pour continuer à se battre.

## Le vrai risque à gérer : la boucle de mort

Laisser les PV à 0 sans rien d'autre aurait un effet pervers : si le
joueur revient sur l'écran Combat avant de s'être soigné, la riposte
ennemie continuerait de tourner, retomberait sur "0 PV" à chaque tick, et
redéclencherait `onHeroDefeated()` — donc la pénalité d'or — encore et
encore, en boucle. Trois garde-fous ajoutés pour l'empêcher complètement :

- `main/game-loop.js` : l'auto-DPS ET la riposte ennemie sont maintenant
  aussi coupées quand `game.heroHp <= 0` (en plus des conditions déjà
  existantes : onglet Combat actif, aucune fenêtre plein écran ouverte).
- `systems/combat-engine.js` (`playerAttack()`) : un tap manuel (et donc
  aussi `autoTap()`, le talent Main spectrale, qui appelle la même
  fonction) ne fait plus rien tant que les PV sont à 0 — silencieux,
  volontairement pas de toast répété pour éviter le spam si `autoTap()`
  continue de se déclencher toutes les 2s.
- `systems/combat-engine.js` (`enemyStrike()`) : garde défensif
  supplémentaire en dernier recours — ne fait rien si le héros est déjà à
  0 PV, même si les deux gardes ci-dessus étaient contournés d'une façon
  ou d'une autre.

Résultat : un héros à 0 PV met le combat en pause complète (l'ennemi ne
prend plus de dégâts, n'en inflige plus non plus) jusqu'à ce qu'un repos
(au Campement) restaure des PV.

## Ce qui NE change PAS (scope volontairement limité)

Les branches Donjon (`DungeonManager.onDefeat()`) et Quête d'aventure
(`AdventureQuestManager.onDefeat()`) gardent leur restauration complète
des PV, inchangée — ces défaites-là représentent un ÉCHEC DE TENTATIVE
(vague de donjon perdue, run de quête interrompu, progression déjà
acquise conservée) plutôt qu'une "vraie mort en plein combat", et ont
déjà leurs propres messages/conséquences dédiés. Pas concernées par cette
demande ; à unifier plus tard si souhaité.

## Message du Campement mis à jour

`ui/camp-view.js` : le texte reflète maintenant une vraie nécessité
("Tu es tombé au combat, PV à 0. Repose-toi avant de repartir à
l'aventure.") plutôt que la formulation v3.14 qui n'était qu'une mise en
scène ("un peu de repos ne te ferait pas de mal").

## Tests effectués

- `node --check` sur les 3 fichiers touchés.
- Harnais v3.14 étendu à 30 assertions (+4 par rapport à la livraison
  précédente) : PV à 0 confirmés après une mort (au lieu de restaurés) ;
  `enemyStrike()` sur un héros déjà à 0 PV ne change rien (pas de
  boucle) ; `playerAttack()` sur un héros à 0 PV ne fait rien non plus ;
  après un repos, le combat refonctionne normalement.
- Re-passage des 4 harnais de non-régression : aucune régression.
- Playwright (rendu réel, 390×844, vrai `requestAnimationFrame` du
  navigateur — pas de simulation) : mort provoquée → redirection +
  0/456 PV confirmés dans le HUD ; **2 secondes de vrai jeu tournant sur
  l'écran Combat à 0 PV** → l'ennemi reste à pleine vie, PV du héros
  toujours à 0, aucune pénalité d'or répétée (le léger gain d'or observé
  vient de la chasse ambiante du village, mécanique séparée et
  intentionnellement non affectée) ; repos → 456/456 PV restaurés,
  cooldown affiché, combat qui refonctionne. Aucune erreur console, aucun
  404.

## Fichiers modifiés

- `js/systems/combat-engine.js`
- `js/main/game-loop.js`
- `js/ui/camp-view.js`
- `sw.js` (`CACHE_VERSION` → `"3.15.0"`)

# Aethervale — CHANGELOG v3.28.0

Base : v3.27.0. Refonte complète de l'arbre de talents — le gros
chantier de la Priorité 2, sur tes précisions.

## Les 4 changements demandés

**1. Trois niveaux par talent** (au lieu d'acheté/pas acheté). Chaque
talent va maintenant jusqu'au niveau 3. Le bonus par niveau reprend
exactement la puissance qui existait avant cette refonte — niveau 1 =
même effet qu'avant, niveau 2 = double, niveau 3 = triple.
`game.talents[id]` est désormais un NOMBRE (0 à 3) au lieu d'un booléen.

**2. Exclusivité gauche/droite PAR PALIER**, pas par branche entière. À
chaque palier (2, 3, 4, 5 — Combat/Fortune/Survie ont chacune 4 paliers
après le tronc commun), investir un point à gauche verrouille la droite
de CE MÊME palier (et inversement), jusqu'à une réinitialisation. Les
autres paliers de la branche restent libres de choisir gauche OU droite
indépendamment — confirmé par test : investir dans le palier 2 gauche
n'empêche pas de choisir le palier 3 droite (si son propre prérequis est
rempli).

**3. Thème gauche = Actif / droite = Passif**, avec une étiquette
visuelle sur chaque carte ("⚔ Actif" en rouge / "🧘 Passif" en bleu).

**4. Branche Survie entièrement rethématisée vers la défense/les PV**
(avant : centrée sur l'essence/le hors-ligne) :

| Talent | Effet par niveau |
|---|---|
| Cœur vaillant (tronc) | +5% PV max |
| Bouclier renforcé (Actif) | Posture défensive +2s de durée |
| Peau de pierre (Passif) | +2% défense passive |
| Riposte du bouclier (Actif) | +5% réduction pendant le bouclier (en plus des 35% de base) |
| Vitalité tenace (Passif) | +8% PV max |
| Sang-froid (Actif) | -10% pénalité d'or à la défaite |
| Constitution de fer (Passif) | +5% PV max ET +5% défense |
| Repos du guerrier (Actif) | -10% cooldown des repos (Campement) |
| Gardien immuable (Passif) | +10% PV max, +5% défense |

## Réinitialisation et arbre générique

Toujours globale (tous les talents d'un coup, comme avant) — le coût et
le remboursement scalent maintenant avec la SOMME des niveaux investis,
pas juste le nombre de talents distincts démarrés. Arbre partagé par
tous les héros pour l'instant (chaque emplacement de héros du système
multi-héros a de toute façon déjà ses propres points dépensés dedans) —
un arbre par héros/classe est noté pour plus tard, pas dans cette
itération.

## Nettoyage nécessaire

7 talents ont changé de thème (t_thick_skin, t_second_wind,
t_tenacious_will, t_calm_breath, t_last_stand, t_immutable_guardian,
t_essence_bloom) — leurs anciens effets essence/hors-ligne ont été
retirés de combat-engine.js et offline-system.js (ils n'ont plus de sens
avec le nouveau thème). Une inconsistance préexistante a été préservée
telle quelle sans y toucher : certains talents (Lames affûtées, Soif de
sang) avaient déjà DEUX magnitudes différentes appliquées dans deux
fichiers séparés avant cette refonte — chaque site a été converti
fidèlement avec sa propre magnitude préexistante, sans tenter de
"corriger" ce qui pourrait être un choix délibéré ou un bug distinct,
hors du périmètre de cette demande.

## Tests effectués

- node --check sur les 9 fichiers touchés.
- Nouveau harnais dédié (31 assertions) : structure (27 talents, tous
  maxLevel=3, 24 avec tier/side cohérents) ; montée de niveau jusqu'au
  max puis refus au-delà ; exclusivité par palier confirmée (le côté
  opposé du MÊME palier se bloque, mais un AUTRE palier de la même
  branche reste libre) ; effets vérifiés scaler linéairement avec le
  niveau (tapMult, PV max, défense) ; Bouclier renforcé (+2s) et
  Riposte du bouclier (+5% réduction) vérifiés avec les vrais calculs du
  bouclier ; Sang-froid vérifié sur une vraie défaite simulée (perte
  d'or réduite du bon montant) ; Repos du guerrier vérifié sur le
  cooldown réel du Campement ; réinitialisation vérifiée rembourser la
  somme exacte des niveaux.
- Re-passage des 13 harnais de non-régression existants : aucune
  régression.
- Playwright (rendu réel, 390×844) : écran des talents confirmé avec
  pastilles de niveau et étiquettes Actif/Passif visibles ; montée de
  niveau réelle testée (Instinct de guerre affiche "Niveau 2/3 ·
  Améliorer") ; verrouillage par palier confirmé visuellement (Main
  spectrale grisée avec le message "Palier engagé côté Actif —
  réinitialise pour changer" après avoir investi dans Instinct de
  guerre) ; branche Survie confirmée entièrement rethématisée. Aucune
  erreur console, aucun 404.

## Fichiers modifiés

- js/data/talents.js
- js/systems/progression-system.js
- js/systems/stats-system.js
- js/systems/combat-engine.js
- js/systems/offline-system.js
- js/systems/camp-system.js
- js/systems/special-attack-system.js
- js/main/game-loop.js
- js/ui/talents-view.js
- css/04-panel-talents.css
- sw.js (CACHE_VERSION -> "3.28.0")

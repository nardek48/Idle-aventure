# Aethervale — CHANGELOG v3.29.0

Base : v3.28.0. Les 4 bugs de Priorité 0.

## 1. L'export de sauvegarde ne sauvegardait qu'un seul héros

exportSaveToFile() ne lisait que le `game` en mémoire (l'emplacement
actif) — les 2 autres héros, stockés dans leurs propres clés
localStorage depuis le système multi-héros (v3.25), n'étaient jamais
inclus dans le fichier téléchargé.

Nouvelle fonction partagée buildMultiSaveExportPayload()
(systems/save-system.js), utilisée par l'export fichier ET le code
texte copier/coller : parcourt les 3 emplacements, inclut TOUS ceux qui
sont occupés dans un nouveau format enveloppe
({ aethervaleMultiSave: true, slots: {...} }).

applyImportedSave() reconnaît maintenant les DEUX formats : le nouveau
(plusieurs héros à la fois, chacun restauré dans son propre emplacement)
et l'ancien (un seul héros, importé dans l'emplacement actif) — un
fichier exporté avant ce correctif reste importable normalement.

## 2. Gardien immuable / Trésor souverain / Exécution parfaite impossibles à activer

Confirmé exactement ton diagnostic. Les 3 talents lower_right
(capstones de fin de branche, côté Passif) pointaient leur prérequis
vers leur voisin de gauche (lower_left, côté Actif) au lieu du nœud
juste au-dessus du même côté (inner_right) — une erreur de copier-coller
faite à l'identique dans les 3 branches lors de la refonte des talents
(v3.28). Comme investir dans un côté verrouille l'autre du MÊME palier,
le prérequis pointait vers un talent qui, une fois acheté, rendait cet
ACHAT MÊME impossible — un prérequis littéralement insatisfaisable.

Corrigé dans data/talents.js : les 3 requires pointent maintenant vers
le bon nœud (t_assault_frenzy, t_astral_prospecting, t_vital_anchor).
Vérifié systématiquement les 24 chaînes de prérequis de l'arbre entier
(pas seulement ces 3) — plus aucune n'est cassée.

## 3. PV qui se soignent tout seuls à 0 PV (achat boutique ou talent)

Trouvé précisément : if (!game.heroHp || ...) dans
StatsSystem.recalcStats() — en JavaScript, !0 vaut true, donc cette
condition traitait un héros à EXACTEMENT 0 PV (mort, en attente d'un
repos — voir v3.15) comme "non défini", et le soignait à fond à CHAQUE
recalcul de stats, ce qui arrive après pratiquement n'importe quel achat
(boutique classique, talent, équipement...).

Corrigé : game.heroHp == null cible maintenant précisément
undefined/null (personnage neuf, jamais initialisé), sans plus jamais
confondre avec la valeur 0, parfaitement légitime pour un héros mort.
Seuls les repos (Campement) peuvent à nouveau soigner un héros à 0 PV,
comme prévu depuis la v3.15.

## 4. Prix des potions de soin figé à l'affichage

L'achat facturait déjà correctement le prix croissant par cycle depuis
la v3.20 (+15%/cycle), mais la carte de la boutique affichait encore
potion.cost BRUT (le prix de base figé) au lieu d'appeler
PotionManager.getCost() — la hausse n'était donc jamais visible à
l'écran, seulement au moment de payer. Corrigé dans
buildHealingPotionCardHTML(), ui/potion-view.js.

## Tests effectués

- node --check sur les 4 fichiers touchés.
- Nouveau harnais dédié (20 assertions) : PV restent bien à 0 après un
  recalcStats() générique ET après un vrai achat de talent (bug 3,
  comportement légitime d'un personnage neuf jamais initialisé vérifié
  non régressé) ; les 3 capstones lower_right activables en achetant la
  chaîne complète du bon côté (bug 2) ; le prix RÉEL des potions de soin
  augmente bien avec le cycle ET l'affichage reflète maintenant ce prix
  à jour (bug 4) ; export/import multi-héros vérifié bout en bout (2
  héros aux données très différentes, export puis réinitialisation
  complète du localStorage puis import, les 2 héros reviennent avec
  leurs bonnes données), plus compatibilité ascendante confirmée avec un
  ancien fichier à un seul héros (bug 1).
- Re-passage des 14 harnais de non-régression existants : aucune
  régression.
- Playwright (rendu réel, 390×844, vrai flux navigateur) : PV confirmés
  rester à 0 après un vrai achat en boutique classique (buyUpgrade) ET
  un vrai achat de talent ; "Exécution parfaite" confirmée activable
  (toast "Exécution parfaite niveau 1" affiché) ; potion de soin mineure
  confirmée afficher 3.06K au cycle 8 (prix de base 1000 or) au lieu du
  prix figé d'avant. Aucune erreur console, aucun 404.

## Fichiers modifiés

- js/systems/stats-system.js
- js/data/talents.js
- js/ui/potion-view.js
- js/systems/save-system.js
- sw.js (CACHE_VERSION -> "3.29.0")

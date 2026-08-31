# Aethervale v3.102.3 — bac à sable reconstruit sur le simulateur de rounds

**Base :** v3.102.2 · 7 fichiers (2 nouveaux). `CACHE_VERSION` → 3.102.3. Clôt P2 (décision §10 n°11 : pas de double moteur, l'ancien bac à sable n'est plus chargé).

## Nouveau

- **`js/sim/combat-round-sim.js`** — le simulateur pur de P1, désormais livré dans l'app et chargé par `index.html` (après `class-skills.js`). Aligné sur le moteur P2 :
  - kits lus en rounds (`cooldownRounds`, `durationRounds`, `percentPerRound` ; repli ms ÷ 2 500 si un kit ancien) ; DoT = % du dernier coup par round ;
  - **patterns télégraphe → impact** : charge des ennemis normaux (compte à rebours 3–5, ×1,3, remplace la frappe), bouclier boss (4–6, 2 rounds à −50 %), soin boss (5, +15 %) — un télégraphe à la fois ; l'impact de pattern ne remplit pas la jauge ennemie ;
  - **contres** : une action dont `counters` contient le télégraphe en cours l'annule et relance le compte à rebours ; la politique « joueur raisonnable » joue un contre prêt avant tout le reste, comme une règle de Grimoire ;
  - `patternsEnabled: false` redonne le modèle P1 d'origine. Nouveaux compteurs de log : `counters`, `patternImpacts`. Déterminisme à graine égale conservé.
- **`js/ui/combat-round-sandbox-view.js`** — Admin › 🧪 Bac à sable : héros, profil (niveau 1 nu / mon héros / Acte III), monde + aventure (pool et boss réels, échelle = formule de `generateEnemy` sans cycle), combats avant le boss, runs, potions, graine, les 3 classes, patterns on/off, **coefficients pré-remplis avec les valeurs courantes du moteur** (PV ennemi/boss, dégâts, ×boss, résist/faibl., boss neutres, % potion). Sorties : **Budgets duel** (RPT/RPM), **Sorties Monte-Carlo** (réussite, boss atteint, PV au boss, morts au boss, rounds, décisions, potions), **Une sortie détaillée** (log combat par combat), export **Markdown** (mêmes tables que `P1_Budgets_Foret.md`). Aucun effet sur la partie.

## Retiré du chargement

`combat-sandbox-system.js`, `combat-batch-sim-system.js`, `combat-sandbox-view.js` (plus dans `index.html` ni le precache) et `special-attack-system.js` (precache seulement ; jamais chargé). Les fichiers restent dans le dépôt, tu peux les supprimer.

## Outils Node (livrés à part, dossier `sim/` à la racine du dépôt)

`run-round-sim.js` et `test-round-sim.js` pointent maintenant sur `../js/sim/combat-round-sim.js` (un seul fichier de simulateur, celui de l'app). `test-round-sim.js` : TOUT OK. Note : avec les kits en rounds et les patterns, les tables §A/§C de P1 se régénèrent avec des valeurs légèrement différentes (Rôdeur à 15 Concentration notamment).

## Validation

Harnais 142/142 (+8) : sim + vue chargés, ancien sandbox absent, formulaire pré-rempli (3,33 / ×1,5), tables 3 classes, Chevalier Lisière V1 ≥ 60 % (100 %), sortie détaillée, **PV du loup et attaque/PV du héros identiques sim = moteur**. Playwright : simulation complète depuis l'interface, 2 tables, export Markdown.

## P2 : bilan

3.102.0 moteur par rounds · 3.102.1 sortie et butin · 3.102.2 combat plein écran · 3.102.3 bac à sable. Prochaine phase : **P4** (tableau de missions, `MissionBoard`, Campement hub, journalières → contrat du jour, questlines de monde fusionnées ; XP par mission — décision 6 — à brancher avec le résultat de mission).

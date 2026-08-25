# Aethervale — v3.83.0

## Grimoire (§8.5b) : fenêtre d'anticipation adaptative au TTK estimé

Corrige le défaut identifié par Seb : la fenêtre d'anticipation fixe de 10s (proche de
l'intervalle des patterns eux-mêmes, 8-15s) activait la réservation de ressource dès le début
d'un combat contre un ennemi faible tué en 2-3s — confirmé sur des rapports de combat réels où
la réservation bloquait le repli pendant tout le combat sans jamais voir le télégraphe payer.

### Principe
Ne réserver la ressource de l'action de contre prioritaire que si le temps de vie estimé (TTK)
de l'ennemi affiché dépasse la fenêtre d'anticipation elle-même — sinon l'ennemi mourra
probablement avant que la réservation ait une chance de payer, et le repli doit pouvoir taper
librement.

### Nouvelle fonction pure : estimateTimeToKillMs(heroStats, enemyStats)
Ajoutée dans combat-auto-policy-system.js (module pur, aucun accès game.*/DOM), jumelle
d'estimateResourceGainOverWindow déjà en place. Prend en paramètres les stats déjà calculées
côté appelant impur (tapDamage, effectiveBasicCooldownMs, autoDps, critChance en fraction 0-1,
critMult, weaponType côté héros ; hp, resists, weak côté ennemi) — ne calcule rien depuis game.*
elle-même, cohérent avec la contrainte de pureté du fichier.

Formule : DPS estimé = (tapDamage x facteur crit moyen x affinité d'arme) / cooldown effectif
+ (autoDps x affinité d'arme) — l'auto-DPS ne critique jamais en jeu réel (confirmé dans
CombatEngine.autoAttack), donc le facteur crit ne s'applique qu'au tap. Facteur crit moyen =
1 + critChance x (critMult - 1), volontairement optimiste comme estimateResourceGainOverWindow.
TTK = PV ennemi / DPS estimé.

### Affinité d'arme : nouvelle fonction pure dédiée
getDamageAffinity() du vrai jeu dépend de game.equipped/game.heroId, inutilisable dans un module
pur. Une version pure équivalente existait déjà (getDamageAffinityMult) mais vivait dans
combat-sandbox-system.js — la réutiliser aurait créé une dépendance malsaine d'un système de
base vers le sandbox (un outil de dev optionnel). Choix retenu (sans confirmation explicite de
Seb, décision prise sur la base de l'architecture existante) : dupliquer une version minimale
pure dans combat-auto-policy-system.js (getPureDamageAffinityMult), réutilisant les constantes
globales déjà existantes (RESIST_DMG_MULT/WEAK_DMG_MULT/NO_WEAPON_MULT de combat-engine.js,
chargées avant ce fichier) — aucune valeur dupliquée, seulement 6 lignes de logique triviale.

### Cas limite DPS nul/négatif
Aucun plancher DPS n'existait déjà ailleurs dans le code. Choix retenu (idem, sans confirmation
explicite) : pas de plancher artificiel — un DPS estimé nul/négatif retourne directement un TTK
infini, ce qui fait naturellement échouer la comparaison à la fenêtre côté appelant sans
introduire de valeur arbitraire non justifiée par une mécanique de jeu réelle.

### Intégration dans shouldActivateGrimoireReserve (§8.5b, class-combat-system.js)
Troisième condition cumulative ajoutée à la suite des deux existantes (pattern dans la fenêtre
ET ressource prédite atteignable ET maintenant TTK estimé > fenêtre) — les trois sont requises,
pas alternatives. heroStats/enemyStats construits à partir des mêmes valeurs déjà calculées plus
haut dans la fonction (effectiveCooldownMs, totalCelerity, basicDamageEstimate) pour éviter tout
appel dupliqué. effectiveCritChance() du jeu réel retourne un pourcentage (base 5, ex. 25 pour
25%), converti en fraction 0-1 avant l'appel à la fonction pure.

### Ce qui n'a pas changé
- L'exclusion complète du repli (§8.5a, getAllCounterActionSlots) reste inchangée — elle
  continue de retirer tous les slots de contre de la priorité du repli, peu importe le TTK.
- Les règles du Grimoire elles-mêmes se déclenchent normalement, comme avant — cette correction
  ne touche que le comportement du repli automatique par défaut.

## Fichiers modifiés
- js/systems/combat-auto-policy-system.js — getPureDamageAffinityMult, estimateTimeToKillMs
  (nouvelles fonctions pures, exportées sur window)
- js/systems/class-combat-system.js — shouldActivateGrimoireReserve étendue avec la 3e condition
  cumulative (TTK)
- sw.js — CACHE_VERSION 3.82.0 vers 3.83.0

## Tests effectués
- node --check sur les 2 fichiers modifiés.
- Harness dédié sur les fichiers réels (combat-engine.js pour les constantes d'affinité,
  combat-cooldown-system.js, combat-auto-policy-system.js) : affinité pure correcte dans les 4
  cas (sans arme/résistant/faible/neutre), TTK correct contre un ennemi faible (150 PV, 100
  dps -> 1500ms) et un ennemi tanky (5000 PV -> 50000ms), TTK plus long contre un ennemi
  résistant qu'un ennemi neutre, TTK réduit par un critique moyen plus élevé, TTK infini sur
  DPS nul, TTK nul sur ennemi déjà à 0 PV.
- Harness d'intégration sur les fichiers réels complets (jusqu'à class-combat-system.js) avec un
  game mocké, 3 scénarios : ennemi faible tué en 1.5s avec pattern imminent (réservation
  refusée, comportement corrigé) ; ennemi tanky avec TTK 50s (réservation activée normalement,
  comportement inchangé pour ce cas) ; ressource déjà suffisante (réservation jugée inutile,
  comportement préexistant intact).
- Les 4 harnesses de test des livraisons précédentes du sandbox repassés sans régression
  (aucun ne dépend des fonctions modifiées ici, qui sont côté vrai jeu).

## Points laissés en suspens (à valider avec Seb)
Les deux questions posées avant de coder (accès à l'affinité d'arme, gestion du DPS nul) n'ont
pas reçu de réponse explicite — j'ai tranché sur la base de ce qui est le plus cohérent avec
l'architecture existante (voir sections ci-dessus). Si Seb préfère une autre approche
(réutiliser getDamageAffinityMult du sandbox malgré la dépendance, ou introduire un vrai
plancher DPS), c'est un changement localisé et rapide à faire.

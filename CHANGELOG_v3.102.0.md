# Aethervale v3.102.0 — P2 : moteur de combat par rounds

**Base :** v3.101.0 · **Décisions :** A1 (un seul moteur, partout), B1 (patterns portés : télégraphe au round N, impact au round N+1), C (fichiers protégés ouverts), 1a (le farm classique devient une sortie — en 3.102.1), 2 (talents reconvertis directement), 3a (viande de chasse perdue à la mort — en 3.102.1).

Le combat temps réel (tap, auto-DPS, cooldowns en ms, ennemi qui frappe toutes les 3 s) est remplacé par le modèle validé en P1 (`combat-round-sim.js`). 31 fichiers, delta zip. `CACHE_VERSION` → 3.102.0.

---

## 1. Le round

```
Tour du héros ─► frappe bonus si jauge de célérité ≥ 100 ─► tour de l'ennemi ─► fin de round
(Attaque / 1-2-3 / Défense / Objet)                  (frappe, ou impact du pattern    (cooldowns −1, mana +8,
                                                       télégraphié au round d'avant)    DoT, statuts −1)
```

- **Attaque** : formule inchangée (dégâts d'arme × classe × talents × crit), sans cooldown. Génère la ressource de classe.
- **Compétences / Défense** : celles du kit, en rounds. Une action refusée (recharge, ressource, silence, condition) **ne consomme pas le round**.
- **Objet** : boire une potion consomme le tour (décision §10 n°10) ; plus de cooldown d'horloge sur les potions.
- **Jauge de célérité** (décision §10 n°1) : chaque action offensive ajoute la Célérité totale ; à 100, une frappe bonus (Attaque, génère la ressource) part avant le tour ennemi. Affichée dans la barre de round.
- **Ennemi** : une frappe par tour ; sa propre jauge (Célérité ennemie) déclenche une seconde frappe immédiate — le loup mord deux fois. Le badge ⚡×2 et la condition Grimoire « enemyAttackIncoming » (relabellée *L'ennemi va frapper deux fois*) annoncent la double frappe un round à l'avance.

## 2. Deux modes (décision §10 n°2)

| | Tactique (défaut, jamais verrouillé) | Grimoire (débloqué avec l'onglet Grimoire, étape 12) |
|---|---|---|
| Rythme | attend ton choix | 1 round / 1,5 s × barre de vitesse ×1/×2/×4 |
| Qui choisit | toi ; le Grimoire **suggère** (bouton surligné 📖 = ce qu'il aurait joué) | règles du Grimoire, sinon repli par défaut (avec réserve de contre) |
| Attaque / compétences | actives | grisées (potion manuelle toujours possible) |

Bascule dans la barre de round (🎯 Tactique / 📖 Grimoire) ou dans Paramètres › Combat. **⟳ Continuer** (Tactique) : répète l'Attaque au tempo Grimoire et s'arrête sur PV < 50 %, télégraphe ennemi, double frappe annoncée, nouvel ennemi. Quitter l'écran Combat coupe Continuer.

Raccourcis PC : Espace / Entrée / A = Attaque, 1-4 = compétences, 5-6 = potions.

## 3. Conversions d'unité (÷ 2 500 ms, arrondi sup.)

| | Avant | Après |
|---|---|---|
| Cooldowns skill1 / skill2 / skill3 | 1,5–2 s / 4–5 s / 8 s | 1 / 2 / 4 rounds |
| Cooldown Défense (Garde / Esquive / Barrière) | 7 / 8 / 8 s | 3 / 4 / 4 rounds |
| Durée Défense | 2 / 1 / 3 s | 1 / 1 / 2 rounds (+1 round par niveau de Bouclier renforcé) |
| Vulnérabilité (Brise-garde), DoT (Brûlure), suppressions d'archétype | 5 000 / 5 000 / 4 000 ms | 2 rounds ; DoT = 50 % du coup par round |
| Concentration par attaque · Mana passif | 7 · 4/s | **15** · **8/round** |
| Silence (Silencieux) · Bouclier boss | 4 000 ms | 2 tours du héros |
| Charge · Silence · Bouclier · Soin (cadence) | 8–12 s · 8–12 s · 10–15 s · 10–15 s | 3–5 · 3–5 · 4–6 · 5 rounds |

Patterns : au round N l'ennemi frappe normalement **et** annonce (badge, log, toast) ; au round N+1 l'impact **remplace** sa frappe (charge ×1,3, silence, bouclier −50 %, soin +15 %). Un contre réussi (Grimoire ou action manuelle pendant le télégraphe) annule l'impact et relance le compte à rebours. Un seul télégraphe à la fois par ennemi.

## 4. Coefficients V1 (P1_Budgets_Foret.md §B, décision §11)

| | Avant | Après |
|---|---|---|
| `ENEMY_PV_MULT` / `BOSS_PV_MULT` (progression-system) | 4,0 / 6,7 | **3,33 / 3,1** |
| `BOSS_DMG_MULT` (nouveau, combat-engine) | — | **×1,5** |
| `RESIST_DMG_MULT` / `WEAK_DMG_MULT` | 0,7 / 1,3 | **0,85 / 1,15** |
| Boss | résist./faiblesse normales | **neutres** (étalon de kit) |

## 5. Talents et stats reconvertis (décision Seb, point 2)

| Talent / stat | Avant | Après |
|---|---|---|
| Main spectrale (`t_auto_tap`) | auto-tap 2 / 1,5 / 1 s | +15 % de remplissage de jauge par niveau |
| Transe de bataille (`t_battle_trance`) | +12 % vitesse d'auto-tap | frappes bonus +12 % dégâts par niveau |
| Frénésie d'assaut (`t_assault_frenzy`) | tous les 20 taps | toutes les 8 Attaques |
| Bouclier renforcé (`t_thick_skin`) | +2 s de défense | +1 round de défense |
| Lames affûtées / Frappe précise | texte « tap » | texte « Attaque » (mécanique inchangée) |
| Bottes (stat `autoDps`), panoplie commune, potion de célérité | auto-DPS | **célérité bonus** → jauge (`game.bonusCelerity`, `game.celerityMult`) |
| Stats-bar | ⚡ Dégâts/Tap · 🔁 Auto DPS | ⚔️ Attaque · ⚡ Célérité (total) |

`game.autoDps` reste dans la save (toujours 0). Aucune donnée d'équipement à migrer : la stat `autoDps` des objets existants est lue comme célérité.

## 6. Mort (tous contextes)

`onDefeat` du donjon, de la chasse et de la quête d'aventure rendaient tous les PV : ils appliquent maintenant la même règle que le farm (PV 0, Sang-froid, retour Campement, or intact). Le butin de sortie (perdu à la mort, 50 % en fuite) arrive en **3.102.1** avec la notion de sortie — la viande de chasse suivra la même règle (3a).

## 7. Sauvegarde

- `combatMode` (`"tactique"` | `"grimoire"`) aux 4 emplacements ; `autoSkillsEnabled` conservé comme miroir en lecture. **Migration** d'une save d'avant P2 : `autoSkillsEnabled` (vrai par défaut) → Grimoire **seulement** si l'onglet Grimoire est débloqué, sinon Tactique. Nouvelle partie / reset complet → Tactique ; ascension → préférence conservée.
- `classCooldowns` en rounds : les valeurs en ms d'une ancienne save sont purgées (entiers ≤ 20 gardés). `classActiveDefense` = `{ actionId, effectType, value, roundsLeft }` (ancien format ignoré).
- Transitoires, jamais persistés : `game.combatRound`, `game.heroGauge`, `game.silencedRounds`, tous les compteurs de round de `game.enemy` (`gauge, chargeIn/chargeTelegraphed, shieldRounds, healIn, vulnerableRounds, dot, …`).
- Retirés de l'état : `basicAttackCooldownMs`, `basicAttackPending`, `silencedUntil`, `_enemyAttackTimer`.

## 8. API (pour les prochaines phases)

`CombatEngine.heroAction(slot, arg, source)` (slot : `basic | skill1..3 | defense | potion`), `setCombatMode`, `toggleContinueAttack`, `suggestAction`, `tickRoundClock(dt)`, `prepareEnemy(enemy)`, `enemyDoubleStrikeNext`, `getTotalCelerity`, `rescheduleCounteredPattern`. `ClassCombatManager.chooseRoundAction(forExecution)`, `onRoundEnd`, `tickDoTRound`, `getRoundsUntilPatternTrigger`. Modules purs : `startCooldown/tickCooldowns` en rounds, `tickResourceRegen(state, gen, rounds)`, `estimateResourceGainOverWindow(def, rounds, dmg)`, `estimateRoundsToKill`, `GRIMOIRE_APPROACH_WINDOW_ROUNDS = 3`. Supprimés : `playerAttack/autoAttack/autoTap`, `syncAutoTapLoop`, `computeEffectiveCooldownMs`, `estimateTimeToKillMs`, `ClassCombatManager.tick/tickAutoSkills/tryAutoBasicAttack`, `*_DURATION_MS`.

## 9. Bac à sable

L'ancien bac à sable (Admin) simulait le moteur temps réel : il affiche un message d'indisponibilité. Ses trois scripts restent chargés mais inertes ; refonte sur `CombatRoundSim` en **3.102.2** (décision §10 n°11).

## 10. Validation

- `node --check` sur les 114 scripts d'`index.html`.
- Harnais VM sur fichiers réels (`round-harness.js`, 108 assertions) : chaque compétence de chaque classe joue un round correct (coût, cooldown, dégâts/défense, refus en recharge sans consommer le round) ; vulnérabilité, DoT, Défense en rounds ; jauge (Rôdeur 70 → frappe bonus au 2ᵉ round, Main spectrale) ; charge télégraphe → impact → contre Grimoire ; boss soin (remplace la frappe) / bouclier (2 attaques) / neutre ; Silencieux ; double frappe ; potion = tour ; modes et horloge ; Continuer ; mort (farm, quête, Sang-froid) ; save (4 emplacements, migration, purge) ; rendu HTML des vues ; **20 sorties Lisière par classe** (8 ennemis + boss, 2 potions, politique simple) : Chevalier 18/20, Rôdeur 13/20, Mage 20/20, 36–48 rounds/sortie — dans les cibles §6.
- Playwright 390 px : barre de round, suggestion, mode Grimoire, badges.

## 11. À faire ensuite

- **3.102.1** : sortie (`game.sortie`), butin banqué au Rentrer / à la fin de mission, mort = butin perdu (viande incluse), Fuir = 50 %, plafond 2 potions/sortie, farm classique = sortie.
- **3.102.2** : bac à sable reconstruit sur `combat-round-sim.js`.
- À surveiller en jeu : la suggestion du repli par défaut peut proposer la Défense dès le round 1 (aucune compétence payable) — si ça gêne, on limitera la suggestion aux règles du Grimoire.

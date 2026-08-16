"use strict";
/* ============================================================
QUEST IDLE — data/talents.js
v3.28 : REFONTE de l'arbre de talents, sur demande explicite —
  1. Chaque talent va maintenant jusqu'à 3 NIVEAUX (au lieu
     d'acheté/pas acheté) — game.talents[id] est désormais un NOMBRE
     (0 à maxLevel), plus un booléen. Le bonus par niveau est
     directement le bonus qui existait avant (niveau 1 = même
     puissance qu'avant cette refonte, niveau 3 = 3× plus fort).
  2. EXCLUSIVITÉ PAR PALIER (pas par branche entière) : à chaque
     palier (upper/mid/inner/lower), investir un point dans le nœud
     GAUCHE verrouille le nœud DROIT de CE MÊME palier (et
     inversement) — jusqu'à une réinitialisation. Les autres paliers
     de la branche restent libres de choisir gauche OU droite,
     indépendamment. Voir tier (nouveau champ) + buyTalentNode() dans
     systems/progression-system.js pour l'application réelle.
  3. Thème gauche = ACTIF (bénéficie au jeu actif : tap, critique,
     combat de boss) / droite = PASSIF (bénéficie au jeu passif :
     auto-tap, défense de fond, hors-ligne) — appliqué du mieux
     possible ; la branche Fortune reste principalement économique des
     deux côtés (le thème actif/passif s'y prête moins).
  4. Branche Survie ENTIÈREMENT rethématisée vers la défense/les PV
     (avant : centrée sur l'essence/le hors-ligne) — réutilise des
     accroches déjà existantes (PV max, % défense, durée/puissance du
     bouclier, pénalité de défaite, cooldown de repos) plutôt que
     d'inventer de nouveaux mécanismes.
  5. Réinitialisation TOUJOURS globale (tous les talents d'un coup,
     voir respecTalents()) — pas de reset par nœud individuel.
  6. Arbre GÉNÉRIQUE, partagé par tous les héros pour l'instant — un
     arbre par héros/classe est noté comme bonne idée pour plus tard,
     mais pas dans cette itération. Chaque héros (voir le système
     multi-héros, v3.25) a de toute façon déjà SES PROPRES points
     dépensés dans CET arbre commun, puisque game.talents fait partie
     de la sauvegarde individuelle de chaque emplacement.

Champs de chaque talent :
  - id          identifiant unique, lu par game.talents[id] (0-maxLevel)
  - name/icon/img/effect  affichage
  - slot        palier d'affichage (top/upper_left/.../lower_right)
  - tier        NOUVEAU — "upper"/"mid"/"inner"/"lower"/null (top) :
                sert à l'exclusivité gauche/droite PAR PALIER
  - side        NOUVEAU — "left"/"right"/null (top) : thème actif/passif
  - requires    id du talent prérequis (même branche)
  - maxLevel    NOUVEAU — 3 pour tous les nœuds
  - perLevel    NOUVEAU — valeur du bonus À CHAQUE niveau (le total
                appliqué = perLevel × niveau actuel)
  - capstone    talent de fin de branche (style visuel différent)
L'EFFET RÉEL de chaque talent est câblé à la main dans les systems
concernés : chercher `game.talents.<id>` dans js/systems/*.js.
============================================================ */

var TALENTTREE = {
  combat: [
    { id: "t_sharpened_blades", name: "Lames affûtées", icon: "🗡️", img: "images/Icons/talents/t_sharpened_blades.png", slot: "top", tier: null, side: null, maxLevel: 3, perLevel: 0.05, effect: "+5% dégâts de tap finaux, par niveau." },

    { id: "t_war_instinct", name: "Instinct de guerre", icon: "🔥", img: "images/Icons/talents/t_war_instinct.png", slot: "upper_left", tier: "upper", side: "left", requires: "t_sharpened_blades", maxLevel: 3, perLevel: 0.05, effect: "+5% dégâts contre les boss, par niveau." },
    { id: "t_auto_tap", name: "Main spectrale", icon: "👆", img: "images/Icons/talents/t_auto_tap.png", slot: "upper_right", tier: "upper", side: "right", requires: "t_sharpened_blades", maxLevel: 3, perLevel: 1, effect: "Auto-tap automatique — toutes les 2s / 1.5s / 1s selon le niveau." },

    { id: "t_precise_strike", name: "Frappe précise", icon: "🎯", img: "images/Icons/talents/t_precise_strike.png", slot: "mid_left", tier: "mid", side: "left", requires: "t_war_instinct", maxLevel: 3, perLevel: 0.06, effect: "+6% chance de critique sur les taps, par niveau." },
    { id: "t_battle_trance", name: "Transe de bataille", icon: "⚡", img: "images/Icons/talents/t_battle_trance.png", slot: "mid_right", tier: "mid", side: "right", requires: "t_auto_tap", maxLevel: 3, perLevel: 0.12, effect: "+12% vitesse d'attaque de l'auto-tap, par niveau." },

    { id: "t_boss_slayer", name: "Tueur de boss", icon: "👑", img: "images/Icons/talents/t_boss_slayer.png", slot: "inner_left", tier: "inner", side: "left", requires: "t_precise_strike", maxLevel: 3, perLevel: 0.08, effect: "+8% dégâts finaux contre les boss, par niveau.", capstone: true },
    { id: "t_assault_frenzy", name: "Frénésie d'assaut", icon: "💥", img: "images/Icons/talents/t_assault_frenzy.png", slot: "inner_right", tier: "inner", side: "right", requires: "t_battle_trance", maxLevel: 3, perLevel: 0.25, effect: "Tous les 20 taps, le prochain inflige +25% dégâts, par niveau.", capstone: true },

    { id: "t_bloodlust", name: "Soif de sang", icon: "🩸", img: "images/Icons/talents/t_bloodlust.png", slot: "lower_left", tier: "lower", side: "left", requires: "t_boss_slayer", maxLevel: 3, perLevel: 0.03, perLevelCap: 0.15, effect: "+3% dégâts contre les boss par ascension (plafond 15%), par niveau.", capstone: true },
    { id: "t_perfect_execution", name: "Exécution parfaite", icon: "☠️", img: "images/Icons/talents/t_perfect_execution.png", slot: "lower_right", tier: "lower", side: "right", requires: "t_assault_frenzy", maxLevel: 3, perLevel: 0.15, effect: "Les boss sous 20% PV subissent +15% dégâts finaux, par niveau.", capstone: true }
  ],

  fortune: [
    { id: "t_interest", name: "Intérêt composé", icon: "💰", img: "images/Icons/talents/t_interest.png", slot: "top", tier: null, side: null, maxLevel: 3, perLevel: 1, effect: "Gain d'or passif toutes les 10 secondes, augmente par niveau." },

    { id: "t_scavenger", name: "Charognard", icon: "🧰", img: "images/Icons/talents/t_scavenger.png", slot: "upper_left", tier: "upper", side: "left", requires: "t_interest", maxLevel: 3, perLevel: 0.08, effect: "+8% or gagné sur les ennemis normaux, par niveau." },
    { id: "t_treasure_hunter", name: "Chasseur de trésors", icon: "🎁", img: "images/Icons/talents/t_treasure_hunter.png", slot: "upper_right", tier: "upper", side: "right", requires: "t_interest", maxLevel: 3, perLevel: 1, effect: "+1 progression bonus pour les quêtes trésor, par niveau." },

    { id: "t_deep_pockets", name: "Bourse profonde", icon: "👛", img: "images/Icons/talents/t_deep_pockets.png", slot: "mid_left", tier: "mid", side: "left", requires: "t_scavenger", maxLevel: 3, perLevel: 0.10, effect: "+10% or sur les coffres et récompenses fixes, par niveau." },
    { id: "t_merchant_instinct", name: "Instinct marchand", icon: "📜", img: "images/Icons/talents/t_merchant_instinct.png", slot: "mid_right", tier: "mid", side: "right", requires: "t_treasure_hunter", maxLevel: 3, perLevel: 5, effect: "+5% de chance d'une récompense bonus, par niveau." },

    { id: "t_golden_touch", name: "Toucher doré", icon: "✨", img: "images/Icons/talents/t_golden_touch.png", slot: "inner_left", tier: "inner", side: "left", requires: "t_deep_pockets", maxLevel: 3, perLevel: 0.12, effect: "+12% or global, par niveau.", capstone: true },
    { id: "t_astral_prospecting", name: "Prospection astrale", icon: "🌠", img: "images/Icons/talents/t_astral_prospecting.png", slot: "inner_right", tier: "inner", side: "right", requires: "t_merchant_instinct", maxLevel: 3, perLevel: 5, effect: "+5% de chance de doubler un butin gagné, par niveau.", capstone: true },

    { id: "t_rich_ritual", name: "Rituel opulent", icon: "🏆", img: "images/Icons/talents/t_rich_ritual.png", slot: "lower_left", tier: "lower", side: "left", requires: "t_golden_touch", maxLevel: 3, perLevel: 1, effect: "+1 Aether supplémentaire lors des grosses ascensions, par niveau.", capstone: true },
    { id: "t_sovereign_treasure", name: "Trésor souverain", icon: "👑", img: "images/Icons/talents/t_sovereign_treasure.png", slot: "lower_right", tier: "lower", side: "right", requires: "t_astral_prospecting", maxLevel: 3, perLevel: 0.20, effect: "+20% or global et bonus sur les récompenses rares, par niveau.", capstone: true }
  ],

  /* v3.28 : branche entièrement rethématisée — défense/PV au lieu
     d'essence/hors-ligne. Réutilise heroMaxHp/heroDefensePct
     (stats-system.js), la durée/le bonus du bouclier
     (special-attack-system.js, DEFENSE_ABILITY), la pénalité de
     défaite (combat-engine.js, DEFEAT_GOLD_PENALTY) et les cooldowns
     de repos (camp-system.js). */
  survival: [
    { id: "t_regenerate", name: "Cœur vaillant", icon: "❤️", img: "images/Icons/talents/t_regenerate.png", slot: "top", tier: null, side: null, maxLevel: 3, perLevel: 0.05, effect: "+5% PV max, par niveau." },

    { id: "t_thick_skin", name: "Bouclier renforcé", icon: "🛡️", img: "images/Icons/talents/t_thick_skin.png", slot: "upper_left", tier: "upper", side: "left", requires: "t_regenerate", maxLevel: 3, perLevel: 2000, effect: "La posture défensive dure +2s, par niveau." },
    { id: "t_second_wind", name: "Peau de pierre", icon: "🪨", img: "images/Icons/talents/t_second_wind.png", slot: "upper_right", tier: "upper", side: "right", requires: "t_regenerate", maxLevel: 3, perLevel: 0.02, effect: "+2% défense passive (hors bouclier), par niveau." },

    { id: "t_calm_breath", name: "Riposte du bouclier", icon: "🍃", img: "images/Icons/talents/t_calm_breath.png", slot: "mid_left", tier: "mid", side: "left", requires: "t_thick_skin", maxLevel: 3, perLevel: 0.05, effect: "+5% réduction de dégâts pendant la posture défensive, par niveau (en plus des 35% de base)." },
    { id: "t_tenacious_will", name: "Vitalité tenace", icon: "🌬️", img: "images/Icons/talents/t_tenacious_will.png", slot: "mid_right", tier: "mid", side: "right", requires: "t_second_wind", maxLevel: 3, perLevel: 0.08, effect: "+8% PV max, par niveau." },

    { id: "t_essence_bloom", name: "Sang-froid", icon: "🔮", img: "images/Icons/talents/t_essence_bloom.png", slot: "inner_left", tier: "inner", side: "left", requires: "t_calm_breath", maxLevel: 3, perLevel: 0.10, effect: "-10% de pénalité d'or à la défaite, par niveau.", capstone: true },
    { id: "t_vital_anchor", name: "Constitution de fer", icon: "⚓", img: "images/Icons/talents/t_vital_anchor.png", slot: "inner_right", tier: "inner", side: "right", requires: "t_tenacious_will", maxLevel: 3, perLevel: 0.05, effect: "+5% PV max ET +5% défense passive, par niveau.", capstone: true },

    { id: "t_last_stand", name: "Repos du guerrier", icon: "🕯️", img: "images/Icons/talents/t_last_stand.png", slot: "lower_left", tier: "lower", side: "left", requires: "t_essence_bloom", maxLevel: 3, perLevel: 0.10, effect: "-10% cooldown des repos (Campement), par niveau.", capstone: true },
    { id: "t_immutable_guardian", name: "Gardien immuable", icon: "🌳", img: "images/Icons/talents/t_immutable_guardian.png", slot: "lower_right", tier: "lower", side: "right", requires: "t_vital_anchor", maxLevel: 3, perLevel: 0.10, effect: "+10% PV max et +5% défense passive, par niveau.", capstone: true }
  ]
};

/* getAllTalentNodes() est définie dans systems/progression-system.js
   (elle y retourne l'arbre complet, utilisé par buyTalentNode). */
var TALENT_TREE = TALENTTREE;

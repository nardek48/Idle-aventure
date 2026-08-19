"use strict";
/* ============================================================
Aethervale — data/auto-policy-defaults.js
v3.33.10 : priorités d'action par défaut pour le mode "Simulation
auto" du bac à sable (voir systems/combat-auto-policy-system.js et
ui/combat-sandbox-view.js).

STATUT — donnée déclarative pure, comme data/class-skills.js dont ce
fichier dépend uniquement pour la DOCUMENTATION des choix ci-dessous
(aucun accès à CLASS_SKILLS ici, aucune fonction). Ne modifie et ne
lit jamais data/class-skills.js, data/heroes.js, data/classes.js,
data/enemies.js.

Chaque entrée AUTO_POLICY_DEFAULTS[classId] est un tableau de slots
("basic" | "skill1" | "skill2" | "skill3" | "defense"), dans l'ordre
de préférence : le module de décision (combat-auto-policy-system.js)
parcourt ce tableau et joue la première action utilisable rencontrée.

Choix de priorité par défaut (dégâts d'abord, ressource ensuite,
attaque de base en dernier filler) — vérifiés contre les VRAIS labels
et coefficients de data/class-skills.js au moment de l'écriture :

  Chevalier (rage) :
    skill3 Exécution      (230% dégâts, 100 Rage, cd 8000ms,
                            CONDITION : ennemi <= 35% PV)
    skill2 Brise-garde     (110% dégâts, 55 Rage, cd 4000ms)
    skill1 Frappe lourde   (165% dégâts, 35 Rage, cd 1500ms)
    defense Garde          (pas de dégâts, 0 Rage, cd 7000ms)
    basic  Attaque de base (filler, génère la Rage)
    Remarque : Frappe lourde (165%) inflige plus par coup que
    Brise-garde (110%) mais Brise-garde est placé avant car moins
    coûteux (55 vs 35 Rage... en réalité Brise-garde coûte PLUS cher).
    Voir note de choix ci-dessous — l'ordre proposé dans la tâche est
    conservé tel quel (Exécution > Brise-garde > Frappe lourde >
    Garde > Attaque de base), le rôle de Garde n'étant pas offensif.

  Archer (concentration) :
    skill3 Tir perforant   (200% dégâts, 100 Concentration, cd 8000ms)
    skill2 Rafale          (3× 60% dégâts, 70 Concentration, cd 5000ms)
    skill1 Tir précis      (170% dégâts, 40 Concentration, cd 2000ms)
    defense Esquive        (pas de dégâts, 0 Concentration, cd 8000ms)
    basic  Attaque de base (filler, génère la Concentration)

  Mage (mana) :
    skill3 Déflagration       (240% dégâts, 100 Mana, cd 8000ms)
    skill2 Brûlure arcanique  (90% dégâts + DoT, 55 Mana, cd 5000ms)
    skill1 Éclair arcanique   (180% dégâts, 35 Mana, cd 2000ms)
    defense Barrière arcanique (pas de dégâts, 30 Mana, cd 8000ms)
    basic  Trait arcanique    (filler, génère le Mana)

Note de choix — posture défensive placée AVANT l'attaque de base :
la politique par défaut privilégie la survie dès qu'aucun skill
offensif n'est utilisable plutôt que d'enchaîner des attaques de
base ; ajustable librement (voir panneau de priorité de l'écran bac
à sable, qui permet de réordonner CE tableau avant de lancer une
rafale, sans jamais modifier ce fichier en dur).
============================================================ */

var AUTO_POLICY_DEFAULTS = {
  knight: ["skill3", "skill2", "skill1", "defense", "basic"],
  archer: ["skill3", "skill2", "skill1", "defense", "basic"],
  mage:   ["skill3", "skill2", "skill1", "defense", "basic"]
};

/* getAutoPolicyDefault(classId)
   Retourne une COPIE du tableau de priorité par défaut d'une classe,
   ou une priorité générique de secours (skill3>skill2>skill1>defense>
   basic) si classId est absent/inconnu — jamais null, pour que
   l'écran ait toujours une liste à afficher. Ne modifie jamais
   AUTO_POLICY_DEFAULTS. */
function getAutoPolicyDefault(classId) {
  var fallback = ["skill3", "skill2", "skill1", "defense", "basic"];
  if (!classId || typeof classId !== "string") return fallback.slice();
  var found = AUTO_POLICY_DEFAULTS[classId];
  return found ? found.slice() : fallback.slice();
}

window.AUTO_POLICY_DEFAULTS = AUTO_POLICY_DEFAULTS;
window.getAutoPolicyDefault = getAutoPolicyDefault;

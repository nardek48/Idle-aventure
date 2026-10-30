"use strict";
/* data/achievements.js — v3.338.0 : REFONTE des Hauts faits (conception « Hauts faits » v1.0,
   décisions H1 à H11 de Seb du 24/09/2026 ; atelier-hauts-faits.html).
   - H1 : une catégorie par monde (paliers bronze / argent / or, H4) + quatre transversales ;
   - H2 : Bestiaire et Mémoire gardés (mêmes identifiants : déjà réclamés = acquis) ; compteurs
          de kills, de critiques, panoplie et donjon retirés (ACHIEVEMENTS_RETIRED, H9) ;
   - H3 : récompense PONCTUELLE en or (v3.358.0 : essence ×5 et Aether ×50 fondus dans l'or), plus AUCUN bonus permanent
          (AchievementManager.getTotalBonus() rend {} : les bancs n'en ont jamais compté) ;
   - H5 : quelques cachés, jamais ratables.
   Champs : id, category, name, desc, icon, target, track() (progression lue dans l'état),
   reward { gold }, hidden + hint, fresh (compteur neuf, sans rattrapage), title.
   Icônes des nouveaux : images/Icons/achivement/<id>.webp, à générer (générique d'ici là).
   Textes PROVISOIRES. Agrégation : systems/achievement-system.js. */

function achievementBestiaryPercent() {
  if (typeof getAllBestiaryIds !== "function") return 0;
  var ids = getAllBestiaryIds();
  if (!ids.length) return 0;
  var met = (typeof bestiaryMet === "function") ? bestiaryMet : function (id) { return (game.killCounts && game.killCounts[id]) > 0; }; // v3.456.8
  var found = ids.filter(met).length;
  return Math.round((found / ids.length) * 100);
}

function achievementHasRarityOwned(rarity) {
  var equippedList = [];
  if (game.equipped) {
    var slots = (typeof EQUIPMENT_SLOTS !== "undefined") ? EQUIPMENT_SLOTS : ["weapon", "armor", "amulet"];
    equippedList = slots.map(function (slot) { return game.equipped[slot]; });
  }
  var owned = (game.inventory || []).concat(equippedList).filter(Boolean);
  return owned.some(function (item) { return item.rarity === rarity; });
}


/* ---------- Aides de suivi (v3.338.0) ---------- */

/* v3.456.6 : une quête d'aventure terminée (boss d'Histoire : Maître d'œuvre, Nécromancien suprême). */
function storyAdvDoneAch(id) { return (game.adventureQuestsCompleted && game.adventureQuestsCompleted[id]) ? 1 : 0; }

/* Compteur neuf (game.achievementStats.counters), sans rattrapage. */
function achCounter(key) {
  var st = game.achievementStats;
  return (st && st.counters && Number(st.counters[key])) || 0;
}

function achKills(id) { return Number((game.killCounts && game.killCounts[id]) || 0); }

function achBuildingLevel(id) {
  return (window.VillageBuildingManager && typeof VillageBuildingManager.getLevel === "function") ? Number(VillageBuildingManager.getLevel(id) || 0) : 0;
}

/* Secteurs libérés d'une carte, au moment présent. */
function achMapLiberated(mapId) {
  if (!window.LIVING_MAPS || !LIVING_MAPS[mapId] || !window.LivingMapManager) return 0;
  return LIVING_MAPS[mapId].sectors.filter(function (s) { return LivingMapManager.isLiberated(mapId, s.id); }).length;
}
function achMapSize(mapId) { return (window.LIVING_MAPS && LIVING_MAPS[mapId]) ? LIVING_MAPS[mapId].sectors.length : 1; }

/* Créatures d'un monde rencontrées (même regroupement que le Bestiaire). */
function achBestiaryWorld(worldIndex) {
  if (typeof getBestiaryGroupedByWorld !== "function") return { found: 0, total: 1 };
  var ids = getBestiaryGroupedByWorld()[worldIndex] || [];
  var met = (typeof bestiaryMet === "function") ? bestiaryMet : function (id) { return achKills(id) > 0; }; // v3.456.8 : boss de donjon compris
  return { found: ids.filter(met).length, total: ids.length || 1 };
}

/* Bâtiments ouverts par le plafond d'un monde (niveau > 0), construits. */
function achWorldBuildings(worldIndex) {
  var caps = (window.WORLD_CAPS && WORLD_CAPS[worldIndex]) ? WORLD_CAPS[worldIndex].village : {};
  var ids = Object.keys(caps).filter(function (k) { return Number(caps[k]) > 0; });
  return { built: ids.filter(function (k) { return achBuildingLevel(k) >= 1; }).length, total: ids.length || 1 };
}

/* Toutes les zones ouvertes au plafond du monde (au moins 3 ouvertes). */
function achPlotsCapped() {
  if (!game.production || !window.ProductionPlotsSystem) return 0;
  var cap = ProductionPlotsSystem.getPlotLevelCap(), open = 0, capped = 0;
  Object.keys(game.production).forEach(function (bid) {
    var b = game.production[bid];
    (b && Array.isArray(b.plots) ? b.plots : []).forEach(function (p) {
      if (!p || p.state !== "open") return;
      open++;
      if (Number(p.level || 0) >= cap) capped++;
    });
  });
  return (open >= 3 && capped === open) ? 1 : 0;
}

function achTrophy(key) { return !!(game.bossTrophies && game.bossTrophies[key]); }

function achCompanion(id) { return (window.CompanionManager && CompanionManager.isUnlocked(id)) ? CompanionManager.state(id) : null; }


var ACH_ICON = "images/Icons/achivement/";

var ACHIEVEMENTS_DB = [
  /* ===================== Forêt enchantée (H1, H4) ===================== */
  { id: "hf_forest_palisade", category: "forest", name: "Le mur tient", desc: "Palissade niveau 3 : l'anneau 1 est tenu.",
    target: 3, track: function () { return achBuildingLevel("palisade"); }, reward: { gold: 150 } },
  { id: "hf_forest_map", category: "forest", name: "La brume recule", desc: "Tous les secteurs de la carte de la Forêt libérés en même temps.",
    target: 9, track: function () { return achMapLiberated("forest"); }, targetFn: function () { return achMapSize("forest"); }, reward: { gold: 150 } },
  { id: "hf_forest_basilic", category: "forest", name: "Sous les racines", desc: "Vaincre le Basilic, au fond de la Tanière.",
    target: 1, track: function () { return (achTrophy("slimeking:Basilic") || Number(game.dungeonBossClears || 0) >= 1) ? 1 : 0; }, reward: { gold: 150 } },
  { id: "hf_forest_elites", category: "forest", name: "Les marques de la Forêt", desc: "Vaincre les élites de la carte : la Fileuse aux yeux blancs et l'Arbre-mère.",
    target: 2, track: function () { return (achKills("araignee_marquee") > 0 ? 1 : 0) + (achKills("arbre_mere") > 0 ? 1 : 0); }, reward: { gold: 150 } },
  { id: "hf_forest_arbremere", category: "forest", name: "Battue de l'Arbre-mère", desc: "Vaincre l'Arbre-mère 10 fois.",
    target: 10, track: function () { return achKills("arbre_mere"); }, reward: { gold: 150 } },
  { id: "hf_forest_run", category: "forest", name: "Un Périple", desc: "Mener une expédition de la Forêt jusqu'au bout.",
    target: 1, fresh: true, track: function () { return achCounter("runForest"); }, reward: { gold: 150 } },
  { id: "hf_forest_bestiary", category: "forest", name: "Naturaliste de la Forêt", desc: "Rencontrer toutes les créatures de la Forêt.",
    target: 1, track: function () { return achBestiaryWorld(0).found; }, targetFn: function () { return achBestiaryWorld(0).total; }, reward: { gold: 150 } },
  { id: "hf_forest_orc", category: "forest", name: "La chute du Seigneur de guerre", desc: "Vaincre le Seigneur de guerre orc.",
    target: 1, track: function () { return achKills("orcwarlord") > 0 ? 1 : 0; }, reward: { gold: 150 } },
  { id: "hf_forest_rare_story", category: "forest", name: "Ce que Wenna a vu", desc: "Lire un récit rare de patrouille en Forêt.",
    hidden: true, hint: "Quelqu'un rapporte plus que du bois.", fresh: true,
    target: 1, track: function () { return achCounter("rareStoryForest"); }, reward: { gold: 300 } },
  { id: "hf_forest_orc_nopotion", category: "forest", name: "Sans une gorgée", desc: "Vaincre le Seigneur de guerre orc sans boire de potion pendant ce combat.",
    hidden: true, hint: "Un combat, et rien d'autre.", fresh: true,
    target: 1, track: function () { return achCounter("orcNoPotion"); }, reward: { gold: 300 } },

  /* ===================== Désert oublié ===================== */
  // v3.360.0 (acte IV) : l'id reste (sauvegardes), la cible devient Nezzam — le Djinn était sa forme.
  { id: "hf_desert_djinn", category: "desert", name: "Le trône vide", desc: "Vaincre Nezzam le Desséché.",
    target: 1, track: function () { return achKills("nezzam") > 0 ? 1 : 0; }, reward: { gold: 600 } },
  // v3.362.0 (acte IV) : le miroir de « Sans une gorgée » (l'Orc), même prix, caché comme lui.
  { id: "hf_desert_nezzam_nopotion", category: "desert", name: "Pas une goutte", desc: "Vaincre Nezzam le Desséché sans boire de potion pendant ce combat.",
    hidden: true, hint: "Il boit. Pas toi.", fresh: true,
    target: 1, track: function () { return achCounter("nezzamNoPotion"); }, reward: { gold: 300 } },
  { id: "hf_desert_sphinx", category: "desert", name: "Ce que garde le sphinx", desc: "Vaincre le sphinx, au fond de la Cité engloutie.",
    target: 1, track: function () { return achKills("sphinx") > 0 ? 1 : 0; }, reward: { gold: 600 } },
  { id: "hf_desert_map", category: "desert", name: "Le sable recule", desc: "Tous les secteurs de la carte du Désert libérés en même temps.",
    target: 12, track: function () { return achMapLiberated("desert"); }, targetFn: function () { return achMapSize("desert"); }, reward: { gold: 600 } },
  { id: "hf_desert_elites", category: "desert", name: "Les marques du Désert", desc: "Vaincre le Serment d'armure et le Dard des profondeurs.",
    target: 2, track: function () { return (achKills("serment_armure") > 0 ? 1 : 0) + (achKills("dard_profondeurs") > 0 ? 1 : 0); }, reward: { gold: 600 } },
  { id: "hf_desert_palisade", category: "desert", name: "Deux anneaux", desc: "Palissade niveau 7 : l'anneau 2 est tenu.",
    target: 7, track: function () { return achBuildingLevel("palisade"); }, reward: { gold: 600 } },
  { id: "hf_desert_dard", category: "desert", name: "Le dard, encore", desc: "Vaincre le Dard des profondeurs 10 fois.",
    target: 10, track: function () { return achKills("dard_profondeurs"); }, reward: { gold: 600 } },
  { id: "hf_desert_run", category: "desert", name: "Une traversée", desc: "Mener une expédition du Désert jusqu'au bout.",
    target: 1, fresh: true, track: function () { return achCounter("runDesert"); }, reward: { gold: 600 } },
  { id: "hf_desert_bestiary", category: "desert", name: "Naturaliste du Désert", desc: "Rencontrer toutes les créatures du Désert.",
    target: 1, track: function () { return achBestiaryWorld(1).found; }, targetFn: function () { return achBestiaryWorld(1).total; }, reward: { gold: 600 } },
  { id: "hf_desert_rare_story", category: "desert", name: "Une seule empreinte", desc: "Lire un récit rare de patrouille au Désert.",
    hidden: true, hint: "Le sable garde parfois une trace.", fresh: true,
    target: 1, track: function () { return achCounter("rareStoryDesert"); }, reward: { gold: 1200 } },
  { id: "hf_desert_retaken", category: "desert", name: "Ce qu'on reprend au sable", desc: "Libérer à nouveau un secteur ensablé.",
    hidden: true, hint: "Rien n'est perdu pour toujours.", fresh: true,
    target: 1, track: function () { return achCounter("retakenDesert"); }, reward: { gold: 1200 } },

  /* ===================== Ruines anciennes (v3.456.6, décision Seb du 20/10) ===================== */
  { id: "hf_ruines_plan", category: "ruins", name: "Le plan fait pierre", desc: "Vaincre le Maître d'œuvre.",
    target: 1, track: function () { return storyAdvDoneAch("aq_ruines_plan"); }, reward: { gold: 1500 } },
  { id: "hf_ruines_varrek", category: "ruins", name: "Le garde scellé", desc: "Vaincre Varrek, au fond du Sanctuaire scellé.",
    target: 1, track: function () { return (game.dungeonTierCleared || {})[3] ? 1 : 0; }, reward: { gold: 1500 } },
  { id: "hf_ruines_map", category: "ruins", name: "Les murs reculent", desc: "Tous les quartiers de la carte des Ruines libérés en même temps.",
    target: 14, track: function () { return achMapLiberated("ruins"); }, targetFn: function () { return achMapSize("ruins"); }, reward: { gold: 1500 } },
  { id: "hf_ruines_elites", category: "ruins", name: "Les marques des Ruines", desc: "Vaincre le Contremaître et le Golem.",
    target: 2, track: function () { return (achKills("contremaitre") > 0 ? 1 : 0) + (achKills("golem") > 0 ? 1 : 0); }, reward: { gold: 1500 } },
  { id: "hf_ruines_golem", category: "ruins", name: "Le Golem, encore", desc: "Vaincre le Golem 10 fois.",
    target: 10, track: function () { return achKills("golem"); }, reward: { gold: 1500 } },
  { id: "hf_ruines_palisade", category: "ruins", name: "Le mur d'en haut", desc: "Palissade niveau 8.",
    target: 8, track: function () { return achBuildingLevel("palisade"); }, reward: { gold: 1500 } },
  { id: "hf_ruines_run", category: "ruins", name: "Une rue qui tourne", desc: "Mener une Petite Aventure des Ruines jusqu'au bout.",
    target: 1, fresh: true, track: function () { return achCounter("runRuins"); }, reward: { gold: 1500 } },
  { id: "hf_ruines_bestiary", category: "ruins", name: "Naturaliste des Ruines", desc: "Rencontrer toutes les créatures des Ruines.",
    target: 1, track: function () { return achBestiaryWorld(2).found; }, targetFn: function () { return achBestiaryWorld(2).total; }, reward: { gold: 1500 } },
  { id: "hf_ruines_plan_nopotion", category: "ruins", name: "Pas une pierre de trop", desc: "Vaincre le Maître d'œuvre sans boire de potion pendant ce combat.",
    hidden: true, hint: "Il se relève. Toi, tu tiens.", fresh: true,
    target: 1, track: function () { return achCounter("maitreNoPotion"); }, reward: { gold: 3000 } },
  { id: "hf_ruines_retaken", category: "ruins", name: "Ce qui retombe se relève", desc: "Libérer à nouveau un quartier repris par la cité.",
    hidden: true, hint: "La cité refait. Toi aussi.", fresh: true,
    target: 1, track: function () { return achCounter("retakenRuins"); }, reward: { gold: 3000 } },

  /* ===================== Crypte des dormeurs (v3.456.6, décision Seb du 20/10) ===================== */
  { id: "hf_crypte_retient", category: "crypt", name: "Celui qui retient", desc: "Vaincre le Nécromancien suprême.",
    target: 1, track: function () { return storyAdvDoneAch("aq_crypte_retient"); }, reward: { gold: 3000 } },
  { id: "hf_crypte_liche", category: "crypt", name: "Les os en ordre", desc: "Vaincre la Liche des sépulcres, au bout de l'Ossuaire.",
    target: 1, track: function () { return (game.dungeonTierCleared || {})[4] ? 1 : 0; }, reward: { gold: 3000 } },
  { id: "hf_crypte_map", category: "crypt", name: "Tous les couloirs", desc: "Tous les couloirs de la carte de la Crypte libérés en même temps.",
    target: 14, track: function () { return achMapLiberated("crypt"); }, targetFn: function () { return achMapSize("crypt"); }, reward: { gold: 3000 } },
  { id: "hf_crypte_elites", category: "crypt", name: "Les marques de la Crypte", desc: "Vaincre le Porte-couronne et la Pleureuse.",
    target: 2, track: function () { return (achKills("porte_couronne") > 0 ? 1 : 0) + (achKills("pleureuse") > 0 ? 1 : 0); }, reward: { gold: 3000 } },
  { id: "hf_crypte_sleepers", category: "crypt", name: "Laisse-les dormir", desc: "Laisser dormir 100 morts.",
    target: 100, fresh: true, track: function () { return achCounter("sleepersLeft"); }, reward: { gold: 3000 } },
  { id: "hf_crypte_woken", category: "crypt", name: "Ceux qu'on réveille", desc: "Réveiller puis vaincre 50 morts.",
    target: 50, fresh: true, track: function () { return achCounter("wokenKilled"); }, reward: { gold: 3000 } },
  { id: "hf_crypte_run", category: "crypt", name: "Une lampe dans le noir", desc: "Mener une Petite Aventure de la Crypte jusqu'au bout.",
    target: 1, fresh: true, track: function () { return achCounter("runCrypt"); }, reward: { gold: 3000 } },
  { id: "hf_crypte_bestiary", category: "crypt", name: "Naturaliste de la Crypte", desc: "Rencontrer toutes les créatures de la Crypte.",
    target: 1, track: function () { return achBestiaryWorld(3).found; }, targetFn: function () { return achBestiaryWorld(3).total; }, reward: { gold: 3000 } },
  { id: "hf_crypte_nochain", category: "crypt", name: "Personne ne reste", desc: "Vaincre le Nécromancien suprême sans qu'aucune chaîne ne tienne jusqu'au bout.",
    hidden: true, hint: "Il tient. Toi, tu défais.", fresh: true,
    target: 1, track: function () { return achCounter("retientNoChain"); }, reward: { gold: 6000 } },
  { id: "hf_crypte_retaken", category: "crypt", name: "Le réveil, repris", desc: "Reprendre un couloir resté hostile après « Le réveil ».",
    hidden: true, hint: "Il dort mal, ce couloir.", fresh: true,
    target: 1, track: function () { return achCounter("retakenCrypt"); }, reward: { gold: 6000 } },

  /* ===================== Montagne brûlante (v3.492.0, lot M-6) ===================== */
  { id: "hf_montagne_dragon", category: "mountain", name: "Le droit de prendre", desc: "Vaincre le Dragon ancien.",
    target: 1, track: function () { return storyAdvDoneAch("aq_montagne_dragon"); }, reward: { gold: 4500 } },
  { id: "hf_montagne_wyrm", category: "mountain", name: "Ce qui tombe dans le lac", desc: "Vaincre le Wyrm de cendres, au bout de la Gueule du volcan.",
    target: 1, track: function () { return (game.dungeonTierCleared || {})[5] ? 1 : 0; }, reward: { gold: 4500 } },
  { id: "hf_montagne_map", category: "mountain", name: "Toutes les pentes", desc: "Tous les secteurs de la carte de la Montagne libérés en même temps.",
    target: 11, track: function () { return achMapLiberated("mountain"); }, targetFn: function () { return achMapSize("mountain"); }, reward: { gold: 4500 } },
  { id: "hf_montagne_elites", category: "mountain", name: "Les façonnés de la Gueule", desc: "Vaincre le Golem-forge et l'Ifrit qui trie.",
    target: 2, track: function () { return (achKills("golem_forge") > 0 ? 1 : 0) + (achKills("ifrit_trieur") > 0 ? 1 : 0); }, reward: { gold: 4500 } },
  { id: "hf_montagne_cut", category: "mountain", name: "Ce qu'on prend", desc: "Tailler 100 veines.",
    target: 100, track: function () { return achCounter("veinsCut"); }, reward: { gold: 4500 } },
  { id: "hf_montagne_left", category: "mountain", name: "Ce qu'on laisse", desc: "Gagner 100 combats de la Montagne sans tailler la veine.",
    target: 100, fresh: true, track: function () { return achCounter("veinsLeft"); }, reward: { gold: 4500 } },
  { id: "hf_montagne_run", category: "mountain", name: "Le sol qui brûle", desc: "Mener une Petite Aventure de la Montagne jusqu'au bout.",
    target: 1, fresh: true, track: function () { return achCounter("runMountain"); }, reward: { gold: 4500 } },
  { id: "hf_montagne_bestiary", category: "mountain", name: "Naturaliste de la Montagne", desc: "Rencontrer toutes les créatures de la Montagne.",
    target: 1, track: function () { return achBestiaryWorld(4).found; }, targetFn: function () { return achBestiaryWorld(4).total; }, reward: { gold: 4500 } },
  { id: "hf_montagne_nocut", category: "mountain", name: "Les mains vides", desc: "Vaincre le Dragon ancien sans tailler une seule veine pendant le combat.",
    hidden: true, hint: "Il regarde les mains.", fresh: true,
    target: 1, track: function () { return achCounter("dragonNoCut"); }, reward: { gold: 9000 } },
  { id: "hf_montagne_retaken", category: "mountain", name: "La coulée, reprise", desc: "Libérer un secteur resté sous la lave après « La coulée ».",
    hidden: true, hint: "La lave recouvre. Elle se retire aussi.", fresh: true,
    target: 1, track: function () { return achCounter("retakenMountain"); }, reward: { gold: 9000 } },

  /* ===================== Grimoire ===================== */
  { id: "hf_grim_rule", category: "grimoire", name: "Première règle", desc: "Écrire une règle du Grimoire.",
    target: 1, track: function () { return Array.isArray(game.grimoireRules) && game.grimoireRules.length ? 1 : 0; }, reward: { gold: 150 } },
  { id: "hf_grim_preset", category: "grimoire", name: "Un plan de rechange", desc: "Sauvegarder un préréglage du Grimoire.",
    target: 1, track: function () { return Array.isArray(game.grimoirePresets) && game.grimoirePresets.length ? 1 : 0; }, reward: { gold: 150 } },
  { id: "hf_grim_wins", category: "grimoire", name: "La main qui ne tremble pas", desc: "Vaincre 50 ennemis en mode Grimoire.",
    target: 50, fresh: true, track: function () { return achCounter("grimoireKills"); }, reward: { gold: 300 } },
  { id: "hf_grim_boss", category: "grimoire", name: "Laisser faire", desc: "Vaincre un boss en mode Grimoire, sans passer en Tactique pendant le combat.",
    target: 1, fresh: true, track: function () { return achCounter("grimoireBoss"); }, reward: { gold: 300 } },
  { id: "hf_grim_rules100", category: "grimoire", name: "Tacticien", desc: "Tes règles se sont déclenchées 100 fois.", title: "Tacticien",
    target: 100, fresh: true, track: function () { return achCounter("rulesFired"); }, reward: { gold: 300 } },

  /* ===================== Village ===================== */
  { id: "hf_vil_buildings", category: "village", name: "Un vrai village", desc: "Construire tous les bâtiments de la Forêt.",
    target: 7, track: function () { return achWorldBuildings(0).built; }, targetFn: function () { return achWorldBuildings(0).total; }, reward: { gold: 150 } },
  { id: "hf_vil_warehouse", category: "village", name: "De quoi voir venir", desc: "Entrepôt niveau 5.",
    target: 5, track: function () { return achBuildingLevel("warehouse"); }, reward: { gold: 300 } },
  { id: "hf_vil_plots", category: "village", name: "Terres au plafond", desc: "Toutes tes zones ouvertes au plafond du monde (au moins trois).",
    target: 1, track: achPlotsCapped, reward: { gold: 300 } },
  { id: "hf_vil_tavern", category: "village", name: "Pilier de la Taverne", desc: "Livrer 20 contrats à la Taverne.",
    target: 20, fresh: true, track: function () { return achCounter("tavernDelivered"); }, reward: { gold: 300 } },
  { id: "hf_vil_forge", category: "village", name: "Le feu de la forge", desc: "Reforger une pièce d'équipement pour la première fois.",
    target: 1, track: function () {
      var lv = (game.forge && game.forge.levels) || {};
      return Object.keys(lv).some(function (k) { return Number(lv[k]) > 0; }) ? 1 : 0;
    }, reward: { gold: 300 } },

  /* v3.561.0 (retour Seb, point 9) : un haut fait tous les 5 paliers du Grand Ouvrage (icônes en v3.566.0). */
  { id: "hf_vil_ouvrage_5", category: "village", name: "Première arche", desc: "Atteindre le palier 5 du Grand Ouvrage.",
    target: 5, track: function () { return window.GrandOuvrage ? GrandOuvrage.getTier() : 0; }, reward: { gold: 500 } },
  { id: "hf_vil_ouvrage_10", category: "village", name: "L'arche tient", desc: "Atteindre le palier 10 du Grand Ouvrage.",
    target: 10, track: function () { return window.GrandOuvrage ? GrandOuvrage.getTier() : 0; }, reward: { gold: 1000 } },
  { id: "hf_vil_ouvrage_15", category: "village", name: "Une voûte au village", desc: "Atteindre le palier 15 du Grand Ouvrage.",
    target: 15, track: function () { return window.GrandOuvrage ? GrandOuvrage.getTier() : 0; }, reward: { gold: 2000 } },
  { id: "hf_vil_ouvrage_20", category: "village", name: "L'Ouvrage d'Edda", desc: "Atteindre le palier 20 du Grand Ouvrage.",
    target: 20, track: function () { return window.GrandOuvrage ? GrandOuvrage.getTier() : 0; }, reward: { gold: 4000 } },
  { id: "hf_vil_ouvrage_25", category: "village", name: "Plus rien ne se perd", desc: "Atteindre le palier 25 du Grand Ouvrage.",
    target: 25, track: function () { return window.GrandOuvrage ? GrandOuvrage.getTier() : 0; }, reward: { gold: 8000 } },

  /* ===================== Compagnons ===================== */
  { id: "hf_comp_wenna_max", category: "companions", name: "Wenna, à son meilleur", desc: "Wenna au maximum de ses améliorations.",
    target: 5, track: function () { var s = achCompanion("wenna"); return s ? Number(s.upgrades || 0) : 0; },
    targetFn: function () { return (typeof getCompanionMaxUpgrades === "function") ? getCompanionMaxUpgrades("wenna") : 5; }, reward: { gold: 300 } },
  { id: "hf_comp_maddoc_voie", category: "companions", name: "Le choix de Maddoc", desc: "Maddoc choisit sa voie.",
    target: 1, track: function () { var s = achCompanion("maddoc"); return (s && s.voie) ? 1 : 0; }, reward: { gold: 300 } },
  { id: "hf_comp_patrols", category: "companions", name: "Les pieds dans la boue", desc: "10 patrouilles rentrées.",
    target: 10, fresh: true, track: function () { return achCounter("patrolsDone"); }, reward: { gold: 300 } },
  { id: "hf_comp_night", category: "companions", name: "Une nuit complète", desc: "Une patrouille de 8 h rentrée.",
    target: 1, fresh: true, track: function () { return achCounter("patrolNight"); }, reward: { gold: 300 } },
  { id: "hf_comp_two", category: "companions", name: "Le camp est vide", desc: "Deux compagnons en patrouille en même temps.",
    target: 1, fresh: true, track: function () { return achCounter("twoPatrols"); }, reward: { gold: 300 } },

  /* ===================== Collection (H2 : identifiants gardés) ===================== */
  { id: "ach_ascend_1", category: "collection", name: "Premier souvenir", desc: "Atteindre le niveau de Mémoire 1.",
    icon: ACH_ICON + "ach_ascend_1.webp", target: 1, track: function () { return window.MemoryManager ? MemoryManager.getLevel() : 0; }, reward: { gold: 150 } },
  { id: "ach_ascend_2", category: "collection", name: "Ce que la Forêt a retenu", desc: "Atteindre le niveau de Mémoire 4.",
    icon: ACH_ICON + "ach_ascend_2.webp", target: 4, track: function () { return window.MemoryManager ? MemoryManager.getLevel() : 0; }, reward: { gold: 300 } },
  { id: "ach_ascend_3", category: "collection", name: "Au-delà des mondes", desc: "Atteindre le niveau de Mémoire 8.",
    icon: ACH_ICON + "ach_ascend_3.webp", target: 8, track: function () { return window.MemoryManager ? MemoryManager.getLevel() : 0; }, reward: { gold: 600 } },
  { id: "ach_bestiary_25", category: "collection", name: "Naturaliste amateur", desc: "Rencontrer 25 % des créatures du Bestiaire.",
    icon: ACH_ICON + "ach_bestiary_25.webp", target: 25, track: achievementBestiaryPercent, reward: { gold: 150 } },
  { id: "ach_bestiary_50", category: "collection", name: "Naturaliste confirmé", desc: "Rencontrer 50 % des créatures du Bestiaire.",
    icon: ACH_ICON + "ach_bestiary_50.webp", target: 50, track: achievementBestiaryPercent, reward: { gold: 300 } },
  { id: "ach_bestiary_100", category: "collection", name: "Naturaliste", desc: "Rencontrer toutes les créatures du Bestiaire.", title: "Naturaliste",
    icon: ACH_ICON + "ach_bestiary_100.webp", target: 100, track: achievementBestiaryPercent, reward: { gold: 600 } },
  { id: "ach_equip_epic", category: "collection", name: "Premier éclat", desc: "Posséder un objet épique.",
    icon: ACH_ICON + "ach_equip_epic.webp", target: 1, track: function () { return achievementHasRarityOwned("epic") ? 1 : 0; }, reward: { gold: 150 } },
  { id: "ach_equip_legendary", category: "collection", name: "Éclat légendaire", desc: "Posséder un objet légendaire.",
    icon: ACH_ICON + "ach_equip_legendary.webp", target: 1, track: function () { return achievementHasRarityOwned("legendary") ? 1 : 0; }, reward: { gold: 300 } }
];

/* Icône par défaut : images/Icons/achivement/<id>.webp (à générer). */
ACHIEVEMENTS_DB.forEach(function (a) { if (!a.icon) a.icon = ACH_ICON + a.id + ".webp"; }); // v3.459.1 (audit O4) : WebP

/* H1, H4 : catégories. `world` = index du monde (paliers, titre au palier or). */
var ACHIEVEMENT_CATEGORIES = [
  { id: "forest", label: "Forêt", world: 0, tiers: [3, 6, 8],
    tierRewards: [{ gold: 500 }, { gold: 1250 }, { gold: 500, title: "Gardien d'Aeswyn" }] },
  { id: "desert", label: "Désert", world: 1, tiers: [3, 6, 8],
    tierRewards: [{ gold: 1500 }, { gold: 3750 }, { gold: 750, title: "Celui qui marche sur le sable" }] },
  // v3.456.6 : Ruines et Crypte (titres neutres, règle des textes adressés au héros)
  { id: "ruins", label: "Ruines", world: 2, tiers: [3, 6, 8],
    tierRewards: [{ gold: 4500 }, { gold: 11250 }, { gold: 2250, title: "Qui lit les murs" }] },
  { id: "crypt", label: "Crypte", world: 3, tiers: [3, 6, 8],
    tierRewards: [{ gold: 9000 }, { gold: 22500 }, { gold: 4500, title: "Qui laisse dormir les morts" }] },
  // v3.492.0 : Montagne (titre neutre)
  { id: "mountain", label: "Montagne", world: 4, tiers: [3, 6, 8],
    tierRewards: [{ gold: 13500 }, { gold: 33750 }, { gold: 6750, title: "Qui sait ce qui tient au feu" }] },
  { id: "grimoire", label: "Grimoire" },
  { id: "village", label: "Village" },
  { id: "companions", label: "Compagnons" },
  { id: "collection", label: "Collection" }
];

var ACHIEVEMENT_CATEGORY_LABELS = {};
ACHIEVEMENT_CATEGORIES.forEach(function (c) { ACHIEVEMENT_CATEGORY_LABELS[c.id] = c.label; });

/* H9 : retirés. Déjà réclamés dans une ancienne sauvegarde -> « Anciens exploits », sans récompense. */
var ACHIEVEMENTS_RETIRED = [
  { id: "ach_kills_1", name: "Chasseur débutant", desc: "Vaincre 100 ennemis." },
  { id: "ach_kills_2", name: "Chasseur aguerri", desc: "Vaincre 1 000 ennemis." },
  { id: "ach_kills_3", name: "Chasseur légendaire", desc: "Vaincre 10 000 ennemis." },
  { id: "ach_crits_1", name: "Œil affûté", desc: "Infliger 100 coups critiques." },
  { id: "ach_crits_2", name: "Précision mortelle", desc: "Infliger 1 000 coups critiques." },
  { id: "ach_equip_set", name: "Panoplie assortie", desc: "Avoir un bonus de panoplie actif." },
  { id: "ach_dungeon_wave1", name: "Première incursion", desc: "Passer la 1re vague d'un donjon." },
  { id: "ach_dungeon_boss", name: "Vainqueur de donjon", desc: "Vaincre le boss d'un donjon." },
  { id: "ach_dungeon_3boss", name: "Habitué des donjons", desc: "Vaincre 3 boss de donjon." }
];

window.ACHIEVEMENTS_DB = ACHIEVEMENTS_DB;
window.ACHIEVEMENT_CATEGORIES = ACHIEVEMENT_CATEGORIES;
window.ACHIEVEMENT_CATEGORY_LABELS = ACHIEVEMENT_CATEGORY_LABELS;
window.ACHIEVEMENTS_RETIRED = ACHIEVEMENTS_RETIRED;

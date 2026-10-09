"use strict";
/* tools/docs-gen/generate-balance-guide.js — régénère le GUIDE D'ÉQUILIBRAGE en Markdown depuis le code
   chargé (mêmes scripts qu'index.html, bac à sable VM du harnais). Toutes les tables sont lues
   dans les données du jeu ; seuls les commentaires et les mesures de banc sont rédigés.
   v3.331.0 : première version. v3.367.0 : mise à jour pour la v3.366.0 — donjon sans tickets
   (DUNGEON_CONFIG.runsPerDay), reprise de la Mémoire en or, réserve de Petites Aventures et
   recharge, boss (BOSS_DB, phases), uniques (ELITE_UNIQUE_LOOT), Hauts faits, puits du roi,
   règle d'échec des cartes (option A), mesures de campagne.
   USAGE : node tools/docs-gen/generate-balance-guide.js <racine du projet> <fichier.md de sortie> */
var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
var OUT = process.argv[3] || "Aethervale_Guide_Equilibrage.md";

/* ---------- Bac à sable ---------- */
function el() {
  return { style: { setProperty: function () {}, removeProperty: function () {} }, classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } },
    innerHTML: "", textContent: "", scrollTop: 0, disabled: false, querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    addEventListener: function () {}, setAttribute: function () {}, getAttribute: function () { return null; }, appendChild: function () {}, remove: function () {}, hasChildNodes: function () { return false; }, focus: function () {}, dataset: {}, offsetWidth: 0, parentNode: null };
}
var storage = {};
var G = {
  console: { log: function () {}, warn: function () {}, error: function () {} }, Date: Date, Math: Math, JSON: JSON, Object: Object, Array: Array, Number: Number, String: String, Boolean: Boolean,
  setTimeout: function () { return 0; }, clearTimeout: function () {}, setInterval: function () { return 0; }, clearInterval: function () {}, requestAnimationFrame: function () {},
  performance: { now: function () { return Date.now(); } }, navigator: { serviceWorker: null, userAgent: "vm", vibrate: function () {} }, location: { href: "", search: "", hash: "", protocol: "https:" },
  localStorage: { getItem: function (k) { return storage.hasOwnProperty(k) ? storage[k] : null; }, setItem: function (k, v) { storage[k] = String(v); }, removeItem: function (k) { delete storage[k]; }, key: function () { return null; }, get length() { return 0; } },
  document: { getElementById: function () { return el(); }, querySelector: function () { return null; }, querySelectorAll: function () { return []; }, createElement: function () { return el(); }, addEventListener: function () {}, body: el(), documentElement: el(), hidden: false, activeElement: null },
  alert: function () {}, confirm: function () { return true; }, structuredClone: function (v) { return JSON.parse(JSON.stringify(v)); }, TextEncoder: TextEncoder, TextDecoder: TextDecoder, URL: URL, Blob: function () {},
  atob: function (s) { return Buffer.from(s, "base64").toString("binary"); }, btoa: function (s) { return Buffer.from(s, "binary").toString("base64"); }
};
G.window = G; G.self = G; G.globalThis = G; G.addEventListener = function () {}; G.removeEventListener = function () {};
vm.createContext(G);
var html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8"), re = /<script src="([^"]+)"><\/script>/g, m;
while ((m = re.exec(html)) !== null) { if (/pwa\.js|boot\.js/.test(m[1])) continue; vm.runInContext(fs.readFileSync(path.join(ROOT, m[1]), "utf8"), G, { filename: m[1] }); }
function run(c) { return vm.runInContext(c, G); }
run("fullResetState(); game.playerName='Guide'; game.heroId='knight'; VillageBuildingManager.ensure();");
G.game.worldsEverReached = { 0: true, 1: true }; G.WorldManager.worldIndex = 1;
G.WorldCaps.getTrainingActCap = function () { return Infinity; };

/* ---------- Mise en forme ---------- */
function fr(n, d) {
  if (n === null || n === undefined || n === "") return "—";
  if (typeof n !== "number") return String(n);
  var s = (d != null) ? n.toFixed(d) : (Math.round(n * 1000) / 1000).toString();
  var parts = s.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return parts.join(",");
}
function pct(x, d) { return fr(x * 100, d == null ? 0 : d) + " %"; }
function cell(v) { return String(v == null ? "—" : v).replace(/\|/g, "/").replace(/\n/g, " "); }
/* Les tirets du séparateur donnent à pandoc la largeur relative de chaque colonne (version Word). */
function table(head, rows) {
  var w = head.map(function (hd, i) { var mx = String(hd).length; rows.forEach(function (r) { mx = Math.max(mx, String(r[i] == null ? "" : r[i]).length); }); return Math.max(4, Math.min(60, mx)); });
  var h = "| " + head.map(cell).join(" | ") + " |\n| " + w.map(function (n) { return new Array(n + 1).join("-"); }).join(" | ") + " |\n";
  rows.forEach(function (r) { h += "| " + r.map(cell).join(" | ") + " |\n"; });
  return h + "\n";
}
var R = G.WAREHOUSE_RESOURCES;
function resName(k) { return (R[k] && R[k].name) || k; }
function costText(c) {
  if (!c) return "—";
  return Object.keys(c).filter(function (k) { return c[k]; }).map(function (k) { return fr(c[k]) + " " + (k === "gold" ? "or" : resName(k)); }).join(" + ") || "—";
}
function worldName(idOrIndex) {
  if (typeof idOrIndex === "number") return (G.WORLDS[idOrIndex] || {}).name || "?";
  var w = G.WORLDS.filter(function (x) { return x.id === idOrIndex; })[0];
  return w ? w.name : idOrIndex;
}
var out = [];
function P(s) { out.push(s == null ? "" : s); }
function H(n, s) { out.push(new Array(n + 1).join("#") + " " + s + "\n"); }

var V = G.GAME_VERSION;
var PA_RECHARGE_H = G.SceneRunManager.PETITE_AVENTURE_RECHARGE_MS / 3600000;
/* ================================================================== */
H(1, "Aethervale — Guide d'équilibrage");
var NOW = new Date(), DATE = ("0" + NOW.getDate()).slice(-2) + "/" + ("0" + (NOW.getMonth() + 1)).slice(-2) + "/" + NOW.getFullYear();
P("**État du code au " + DATE + " — v" + V + ".** Toutes les tables sont **extraites automatiquement du code** (scripts d'`index.html` chargés dans le bac à sable du harnais, par `tools/docs-gen/generate-balance-guide.js`) ; aucune valeur n'est recopiée à la main. Les commentaires et les mesures viennent des bancs de `sim/`.\n");
P("La version précédente datait de la v3.392.0, complétée par la mise à jour v3.392.0 → v3.427.2 : ce guide remplace les deux. Parties : 0 Changements · 1 Économie · 2 Héros et progression · 3 Combat · 4 Cartes Vivantes · 5 Combat de groupe · 6 Outils et points ouverts.\n");

/* ---------- 0. Changements ---------- */
H(1, "0. Changements depuis la v3.392.0");
var D3 = G.DUNGEONS.filter(function (d) { return d.camp; })[0] || {};
P(table(["Période", "Chantier", "Ce qui change pour l'équilibrage"], [
  ["v3.393 → v3.417", "Audit design, Village (écrans)", "Rien : retrait de l'Ascension et des bonus d'Aether qui valaient zéro, écrans refaits"],
  ["v3.418.0", "Économie E-1", "Taverne et Halle à l'Atelier 2 ; Taverne 2 contrats au niveau 1, +1 par niveau. **Production −20 %** sur le Blé, la Viande, l'Eau et la Pierre"],
  ["v3.419 → v3.421", "Caravane", "Caravane de la Halle marchande, visible sur la carte ; elle rapporte le rare du monde (§1.11)"],
  ["v3.422.0", "Points ouverts", "Bonus de carte sur la production appliqués (+10 %). Obstacles des Petites Aventures tirés 3 fois sur 4 dans le pool du secteur"],
  ["v3.423.0", "**Difficulté**", "Les ennemis suivent un peu la force réelle du héros (§2.8). Souffle plus cher, repos plus court"],
  ["v3.427.2", "Anneau", "Base de l'anneau : chance de critique au lieu de l'or"],
  ["v3.428.0", "Ruines, acte I", "Monde 3 ouvert. **La relève** : certains ennemis se relèvent une fois à " + pct(G.RISE_HP_PCT) + " de leurs PV (§3.2). Choix « seuil » : **Le seuil**, le héros tombé se relève une fois par combat à " + pct(G.HERO_RISE_HP_PCT) + ", ou −10 % de matériaux au village. Edda, troisième compagnon. **Pierre errante**"],
  ["v3.429.0", "Ruines, acte II", "Le **Bâtisseur** (il pose un mur sur un allié). Carte des Ruines : **chantier errant** (" + G.LIVING_MAPS.ruins.chantier.reward + " Pierres errantes) et **Éboulement**. Les murs bougent en Petite Aventure. Terrain 10"],
  ["v3.429.1 → v3.429.24", "Correctifs, pronostic", "Pronostic des donjons, quêtes et chasses : le run entier, les groupes, les compagnons et leurs soins comptent. Sans effet sur les chiffres de combat"],
  ["v3.430.0", "Ruines, acte III (1)", "**" + D3.name + "** : campement après la vague " + (D3.camp || {}).afterWave + " (soin " + pct((D3.camp || {}).healPct || 0) + ", butin mis en sûreté). Élites Contremaître et Golem ; Varrek se relève"],
  ["v3.431.0", "Ruines, acte III (2)", "**Clé de voûte** et **Forge 4** (reforges 7 et 8). Terrain 11, 13 points de talent. Golem de quête calé à part (`eliteStatMult`). Choix « salle »"],
  ["v3.432.0 → v3.433.0", "Ruines, acte IV", "Le Cœur (requiresAllNeighbors), « Vers le Cœur », « Le dernier trait ». **Le Maître d'œuvre** : relève forcée, renforts, blindage. Choix « plan ». **Arme du Cœur**, premier Épique (valeur " + G.ELITE_UNIQUE_LOOT.arme_coeur.value + ")"]
]));
P("**Principes posés par Seb**, à garder pour tout réglage futur :\n");
P("- **Calibrer au plafond atteignable de l'acte**, et vérifier les premiers contenus d'un acte au plafond de l'acte précédent (plan C).");
P("- **Ne jamais bloquer un joueur qui avance vite** par la production du village : ce que l'Histoire exige du village est fourni (E2).");
P("- **Ressenti visé** : environ la moitié des PV à la fin d'un combat, 1 à 2 potions sur les élites et les boss, des combats 1,5 à 2 fois plus longs qu'avant le plan C.");
P("- **Compagnons comptés à pleine force** dans le calibrage à partir du moment où ils sont acquis.");
P("- **Un échec ne punit que ce qu'on a tenté** (v3.366.0) : rater une carte ne fait reculer que le secteur testé.\n");

/* ---------- 1. Économie ---------- */
H(1, "Partie 1 — Économie : Entrepôt, Production, Village");
H(2, "1.1 Entrepôt — ressources et plafonds");
P("Fichier : `data/hunt-quests.js` (WAREHOUSE_RESOURCES). Point d'écriture unique : `systems/warehouse-system.js`. **Plus de vente depuis la v3.330.0** : le prix est une *valeur de référence* qui calcule les contrats de la Taverne.\n");
P("Plafond : ressources brutes **" + G.RAW_STOCK_BASE + " + " + G.WAREHOUSE_CAP_PER_LEVEL + " × niveau d'Entrepôt** ; ressources fabriquées **cap + " + G.WAREHOUSE_CAP_PER_LEVEL + " × niveau** ; ressources rares sans plafond. Un stock ancien au-dessus du plafond est conservé, mais rien ne rentre tant qu'on y est.\n");
var tierLbl = { raw: "Brute", crafted: "Fabriquée", special: "Rare" };
P(table(["Ressource", "Tier", "Valeur de référence", "Plafond de base", "Soin (Campement)"],
  Object.keys(R).map(function (k) {
    var d = R[k], t = d.tier || "raw";
    var cap = typeof d.cap === "number" ? fr(d.cap) : (t === "raw" ? fr(G.RAW_STOCK_BASE) : "aucun");
    return [d.name, tierLbl[t] || t, d.sellPrice ? fr(d.sellPrice) + " or" : "—", cap, d.healPct ? pct(d.healPct) : "—"];
  })));

H(2, "1.2 Production — zones");
P("Fichiers : `data/production-plots.js`, `systems/production-plots-system.js`. Six bâtiments de 9 zones. Lignes de zones et niveau max par monde (`WORLD_CAPS`). Récolte partielle : on ne prend que la place libre à l'Entrepôt, le reste attend dans les zones.\n");
var PB = G.PRODUCTION_PLOTS_BUILDINGS, PS = G.PRODUCTION_PLOTS_SHARED;
P(table(["Bâtiment", "Produit", "Ouvrir une zone (base)", "Améliorer une zone (base)", "Bassin / Pompe"],
  Object.keys(PB).map(function (id) {
    var c = PB[id], pbd = (G.PRODUCTION_BUILDINGS || {})[id] || {};
    return [pbd.name || id, resName(pbd.resourceKey), costText(c.unlockCost.base), costText(c.upgradeCost.base),
      costText(c.improvementCost.fertile.cost) + " / " + costText(c.improvementCost.irrigated.cost)];
  })));
P("Ouvrir une zone : ×" + fr(PS.unlockCostMultPerPlot) + " par zone déjà ouverte. Améliorer : ×" + fr(PS.upgradeCostMultPerLevel) + " par niveau et ×[" + PS.rowUpgradeCostMult.map(function (x) { return fr(x); }).join(" / ") + "] selon la ligne. Améliorations : +" + pct(PS.bonusPerImprovement.fertile) + " et +" + pct(PS.bonusPerImprovement.irrigated) + ". Dotation à l'ouverture d'un bâtiment : " + costText(G.PRODUCTION_UNLOCK_GIFT) + ".\n");
P(table(["Profil", "Débit de base / min", "Croissance / niveau", "Réserve de base", "Croissance / niveau", "Réserve pleine au niv. 5"],
  Object.keys(PS.profiles).map(function (k) {
    var p = PS.profiles[k], r5 = p.baseRatePerMin * Math.pow(p.rateGrowthPerLevel, 4), c5 = Math.floor(p.baseCapacity * Math.pow(p.capacityGrowthPerLevel, 4));
    return [k, fr(p.baseRatePerMin), "×" + fr(p.rateGrowthPerLevel), fr(p.baseCapacity), "×" + fr(p.capacityGrowthPerLevel), fr(Math.round(c5 / r5)) + " min"];
  })));
P("Motif des zones : " + PS.profilePattern.join(", ") + ".\n");
P(table(["Monde", "Lignes de zones", "Niveau max d'une zone", "Niveau max d'un atelier", "Réserve de Petites Aventures"],
  G.WORLD_CAPS.map(function (w, i) { return [G.WORLDS[i].name, w.zoneRows + " (" + (w.zoneRows * 3) + " zones)", w.zoneLevel, w.workshopLevel, w.petiteAventureCap]; })));
P("**Petites Aventures (v3.366.0)** : la dernière colonne n'est plus un plafond par jour mais la **taille de la réserve** du monde. Chaque place dépensée revient au bout de " + fr(PA_RECHARGE_H) + " h (`SceneRunManager.PETITE_AVENTURE_RECHARGE_MS`), une seule horloge, qui démarre quand la réserve pleine est entamée ; une expédition annulée rend sa place. Réserve partagée entre les canevas du monde.\n");
P("*Mesure (`tools/sim/revente-bench.js`, v3.331.0) : au plafond du Désert (6 zones niveau 5 améliorées), chaque bâtiment produit ~2 200 unités par heure en continu ; les réserves sont pleines en 7 min à 1 h 40. C'est ce qui a conduit au plafond de stock (E1).*\n");

H(2, "1.3 Ateliers");
P("Fichiers : `data/workshops.js`, `systems/workshops-system.js`. Un atelier ouvert par une étape d'Histoire l'indique ci-dessous.\n");
var WC = G.WORKSHOPS_CONFIG;
P(table(["Atelier", "Bâtiment", "Recettes", "Ouverture", "Amélioration (base)"],
  Object.keys(WC).map(function (id) {
    var w = WC[id], pbd = (G.PRODUCTION_BUILDINGS || {})[w.buildingId] || {};
    var rec = (w.recipes || []).map(function (r) {
      return r.inputs.map(function (x) { return x.quantity + " " + resName(x.resourceId); }).join(" + ") + " → " + r.outputs.map(function (x) { return x.quantity + " " + resName(x.resourceId); }).join(" + ") + " (" + fr(r.craftTimeMs / 1000) + " s)";
    }).join(" ; ");
    return [w.name, pbd.name || w.buildingId, rec || "aucune", w.openAtStoryStep ? "étape " + w.openAtStoryStep : "d'office", costText(w.upgradeCostBase)];
  })));

H(2, "1.4 Bâtiments du Village");
P("Fichiers : `data/village-buildings.js`, `systems/village-building-system.js`. Un chantier à la fois ; palier de coût choisi sur le niveau **actuel** ; coût = base × multiplicateur^(niveau − début du palier).\n");
P("**Niveaux d'Histoire (E2)** : le Terrain jusqu'au plafond de l'acte et la Forge 1 à " + G.STORY_FORGE_LEVELS + " ne coûtent que l'or et les matériaux du monde ; les matériaux communs (" + G.STORY_PROVIDED_MATERIALS.map(resName).join(", ") + ") sont fournis. Idem pour la reforge de l'arme 1 à " + G.STORY_WEAPON_REFORGE_LEVELS + ".\n");
P("**Blocs taillés (E3)** : dans les paliers du Désert qui demandent un lingot ou de l'acier, la moitié des planches est devenue des blocs.\n");
var VB = G.VILLAGE_BUILDINGS, rows = [];
Object.keys(VB).forEach(function (id) {
  var b = VB[id];
  if (b.firstLevelCost) rows.push([b.name + " (rang " + b.rank + ", max " + b.maxLevel + ")", "0→1", costText(b.firstLevelCost), "coût propre"]);
  (b.costTiers || []).forEach(function (t, i) {
    rows.push([(i === 0 && !b.firstLevelCost) ? b.name + " (rang " + b.rank + ", max " + b.maxLevel + ")" : "", t.minLevel + "→" + (t.maxLevel + 1), costText(t.baseCost), "×" + fr(t.costMult)]);
  });
});
P(table(["Bâtiment", "Niveaux", "Coût de base", "Croissance"], rows));
P(table(["Niveau visé"].concat([1, 2, 3, 4, 5, 6, 8, 10, 11, 14].map(String)), [["Durée"].concat([1, 2, 3, 4, 5, 6, 8, 10, 11, 14].map(function (l) { var s = G.getVillageBuildSeconds(l); return s < 60 ? s + " s" : fr(s / 60) + " min"; }))]));
P("Rang de l'Atelier : seuils " + G.VILLAGE_RANK_THRESHOLDS.join(" / ") + " (rangs 1 à 4).\n");
var bIds = Object.keys(G.WORLD_CAPS[0].village);
P(table(["Plafond par monde"].concat(bIds.map(function (id) { return VB[id] ? VB[id].name : id; })), G.WORLD_CAPS.map(function (w, i) { return [G.WORLDS[i].name].concat(bIds.map(function (id) { return w.village[id]; })); })));
H(3, "Plafonds par acte");
var lastTalentCap = 0;
P(table(["Monde", "Acte", "Étape d'ouverture", "Terrain max", "Entraînement max", "Points de talent max"],
  G.TRAINING_CAP_BY_ACT.map(function (a) {
    var t = G.TALENT_CAP_BY_ACT.filter(function (x) { return x.worldIndex === a.worldIndex && x.stepId === a.stepId; })[0];
    if (t) lastTalentCap = t.points;
    return [G.WORLDS[a.worldIndex].name, a.act, a.stepId, a.terrain, 20 + a.terrain * 10, lastTalentCap];
  })));
P("Les talents s'ouvrent à l'étape forest_11 (acte III). L'acte IV du Désert (étapes 16 à 18) garde les plafonds de l'acte III. Les mondes suivants n'ont pas encore de table : pas de plafond d'acte.\n");

H(2, "1.5 L'or");
var goldByWorld = { forest: 0, desert: 0 }, goldActIV = 0;
Object.keys(G.STORY_REWARDS).forEach(function (k) {
  var w = /^desert/.test(k) ? "desert" : "forest", g = Number(G.STORY_REWARDS[k].gold || 0);
  goldByWorld[w] += g;
  if (/^desert_1[678]$/.test(k)) goldActIV += g;
});
function trainCost(a, b) { var t = 0; G.UPGRADES.forEach(function (u) { if (!/^utrain_/.test(u.id)) return; for (var l = a; l < b; l++) t += G.getUpgradeCost(u, l); }); return t; }
function villageGold(world) {
  var tot = 0, caps = G.WORLD_CAPS[world].village, prev = world ? G.WORLD_CAPS[0].village : null;
  Object.keys(caps).forEach(function (id) { if (!VB[id]) return; for (var l = prev ? (prev[id] || 0) : 0; l < caps[id]; l++) { G.game.village.buildings[id] = { level: l }; tot += Number((G.VillageBuildingManager.getLevelCost(id, l) || {}).gold || 0); } G.game.village.buildings[id] = { level: 0 }; });
  return tot;
}
P("**Pas de vente à l'Entrepôt (E6)** : l'or vient de l'Histoire, des combats, des Hauts faits (§1.10) et des contrats de la Taverne (valeur de référence × " + fr(G.TAVERN_REWARD_MULT) + ", +3 % par niveau d'Atelier de Construction, tableau renouvelé toutes les " + fr(G.TAVERN_REFRESH_MS / 3600000) + " h, un contrat par niveau de Taverne).\n");
P(table(["Monde", "Or de l'Histoire", "Entraînement (niveaux du monde)", "Village (niveaux ouverts par le monde)"], [
  ["Forêt", fr(goldByWorld.forest), fr(trainCost(0, 60)), fr(villageGold(0))],
  ["Désert", fr(goldByWorld.desert) + " (dont acte IV : " + fr(goldActIV) + ")", fr(trainCost(60, 110)), fr(villageGold(1))]
]));
P("*Banc « or par acte » (24/09/2026, v3.331.0, **avant l'acte IV et les Hauts faits**) : avec une victoire sur chaque contenu de l'Histoire, la Forêt rapportait ~10 750 or une seule fois ; le Désert ~19 600 or, puis la Taverne (~4 500 or par jour à 3 visites) et les combats refaits (un run de la Cité ≈ 3 500 or). L'or de l'acte IV (" + fr(goldActIV) + ") est provisoire : banc à refaire en surveillant l'or ponctuel, déjà haut avec les Hauts faits.*\n");
P("Or par victoire, mesuré (`plafond-bench.js`, v3.331.0) : Lisière 100 · Cœur 74 · Araignée 799 · Ronce 1 333 · Tanière 2 270 · Orc de l'étape 15 1 008 · Dunes 75 · Gouffre 42 · Nuée 80 · Serment 126 · Cité 3 494 · Dard 134. Chasses mesurées en campagne (v3.365.0) : battue de la Forêt ~120 or par lot, battue du Désert ~450 or par lot.\n");

H(2, "1.6 Rations et vivres de sortie");
var cui = WC.cuisine_de_camp.recipes;
P(table(["Ration", "Recette (Cuisine de camp)", "Soin", "Vivres de sortie"], ["petite_ration", "ration", "grande_ration"].map(function (id) {
  var r = cui.filter(function (x) { return x.id === id; })[0];
  var w = Object.keys(G.PROVISIONS_BY_WORLD).filter(function (k) { return G.PROVISIONS_BY_WORLD[k] === id; });
  return [resName(id), r ? r.inputs.map(function (x) { return x.quantity + " " + resName(x.resourceId); }).join(" + ") : "—", R[id].healPct ? pct(R[id].healPct) : "—", w.length ? w.map(worldName).join(", ") : "—"];
})));
P("**Vivres de sortie (E4)** : une ration pour **repartir** — chasse dont un lot a déjà été bouclé, donjon déjà fini une fois (jamais sur une sortie d'Histoire), élite de carte dont le secteur est libéré. Gratuit aux actes I et II de la Forêt et pour toute première fois. Les parcours gardent leur propre coût d'entrée. Une ligne « Vivres » s'affiche sur les fiches de départ.\n");

H(2, "1.7 Petite Aventure et parcours");
// v3.429.1 : SCENE_INTENSITY (Petites Aventures v1) n'existe plus depuis v3.388.0 ; tableau omis sans lui
if (G.SCENE_INTENSITY) P(table(["Intensité", "Paliers", "Difficulté (obstacles)", "Butin"], Object.keys(G.SCENE_INTENSITY).map(function (k) { var s = G.SCENE_INTENSITY[k]; return [s.label, s.depthMax, "×" + fr(s.diffMult), "×" + fr(s.lootMult)]; })));
var ST = G.SCENE_TEMPLATES;
function entryText(c) { if (!c) return "—"; if (c.resourceId) return (c.amount || 1) + " " + resName(c.resourceId); return costText(c); }
P(table(["Canevas", "Monde", "Combats par run", "Rencontres par combat", "Boss final", "Force des combats (dégâts / PV)", "Entrée"],
  ["petite_aventure_foret", "petite_aventure_desert", "traversee_desert", "descente_temple", "remontee_fleuve"].filter(function (id) { return ST[id]; }).map(function (id) {
    var t = ST[id];
    var combats = (t.maxSlotsPerRun || {}).combat;
    if (combats == null && Array.isArray(t.fixedCard)) combats = [].concat.apply([], t.fixedCard).filter(function (c) { return c && c.type === "combat"; }).length + " (parcours fixe)";
    return [(t.title || t.name || id) + " (`" + id + "`)", worldName(t.worldId), combats == null ? "—" : combats, (t.combatWaveRange ? (t.combatWaveRange[0] === t.combatWaveRange[1] ? t.combatWaveRange[0] : t.combatWaveRange.join(" à ")) : "—"), t.finalBoss === false ? "non" : "oui",
      "×" + fr(t.combatPowerMult || 1) + " / ×" + fr(t.combatHpMult || 1), entryText(t.entryCost)];
  })));
P("Les Petites Aventures puisent dans la réserve du monde (§1.2). Les parcours d'Histoire (traversée, descente, remontée du fleuve) ne la consomment pas. « Personne ne remonte le fleuve » (étape 16) : le Veilleur rend tout le Souffle et soigne la pire blessure au palier 4.\n");
P("*Mesure v3.331.0 (`plafond-bench.js --suite`) : Forêt au début de l'acte III, boss compris, 100 %, 52 à 56 % de PV ; Désert I, 100 %, 65 à 68 % de PV, 0,3 à 0,4 potion.*\n");

H(2, "1.8 Offrande et Mémoire");
P("Fichiers : `data/memory.js`, `systems/memory-system.js`. L'Offrande remplace la vente d'équipement ; un objet acheté ne rend rien.\n");
P(table(["Rareté offerte"].concat(Object.keys(G.MEMORY_OFFERING_VALUES).map(function (k) { return G.RARITY_LABELS[k] || k; })), [["Aether"].concat(Object.keys(G.MEMORY_OFFERING_VALUES).map(function (k) { return G.MEMORY_OFFERING_VALUES[k]; }))]));
P(table(["Souvenir", "Aether"], Object.keys(G.MEMORY_SOUVENIRS).map(function (k) { return [{ storyStep: "Étape d'Histoire", adventureBoss: "Boss d'aventure", elite: "Élite (chaque fois)", dungeonClear: "Donjon terminé" }[k] || k, G.MEMORY_SOUVENIRS[k]]; })));
P(table(["Niveau", "Coût (Aether cumulé du niveau)", "Thème", "Choix"], G.MEMORY_LEVELS.map(function (L, i) {
  return [L.level, G.MEMORY_LEVEL_COSTS[i], L.theme + (L.jalon ? " (jalon)" : ""), L.options.map(function (o) { return o.name + " : " + o.desc; }).join(" · ")];
})));
P(G.MEMORY_LEVELS_PER_WORLD + " niveaux par monde atteint. Reprise d'un choix : **" + fr(G.MEMORY_REPRISE_BASE_COST) + " or**, ×" + G.MEMORY_REPRISE_MULT + " à chaque fois (en or depuis la v3.358.0, D7).\n");

H(2, "1.9 Boutique d'Éclats (donjon)");
P(table(["Article", "Effet", "Coût de base", "Croissance", "Max"], G.DUNGEON_SHOP.map(function (s) { return [s.name, s.desc, s.baseCost + " Éclats", "×" + fr(s.costMult), s.maxLevel]; })));

H(2, "1.10 Hauts faits");
P("Fichiers : `data/achievements.js`, `systems/achievement-system.js`. Chaque Haut fait donne une récompense réclamée à la main ; chaque catégorie de monde a trois paliers (nombre de Hauts faits de la catégorie obtenus).\n");
var ACH = G.ACHIEVEMENTS_DB, achRows = [];
G.ACHIEVEMENT_CATEGORIES.forEach(function (c) {
  var list = ACH.filter(function (a) { return a.category === c.id; });
  var gold = list.reduce(function (s, a) { return s + Number((a.reward || {}).gold || 0); }, 0);
  var hidden = list.filter(function (a) { return a.hidden; }).length;
  var tiers = c.tiers ? c.tiers.map(function (t, i) { var r = c.tierRewards[i] || {}; return t + " → " + fr(r.gold || 0) + " or" + (r.title ? " + titre « " + r.title + " »" : ""); }).join(" · ") : "—";
  achRows.push([c.label, list.length + (hidden ? " (dont " + hidden + " cachés)" : ""), fr(gold), tiers]);
});
P(table(["Catégorie", "Hauts faits", "Or des Hauts faits", "Paliers"], achRows));
var achGold = ACH.reduce(function (s, a) { return s + Number((a.reward || {}).gold || 0); }, 0), tierGold = 0;
G.ACHIEVEMENT_CATEGORIES.forEach(function (c) { (c.tierRewards || []).forEach(function (r) { tierGold += Number(r.gold || 0); }); });
P("Catalogue : " + ACH.length + " Hauts faits, " + fr(achGold) + " or au total, plus " + fr(tierGold) + " or de paliers. Nouveaux à l'acte IV : « Le trône vide » (vaincre Nezzam) et « Pas une goutte » (caché : le vaincre sans boire de potion).\n");

/* ---------- 2. Héros ---------- */
H(2, "1.11 Caravane de la Halle marchande");
P("Fichier : `systems/caravan-system.js`. La caravane part sur la carte vivante et rapporte le matériau rare du marché choisi : " + Object.keys(G.CARAVAN_RARE_BY_WORLD).map(function (w) { return worldName(Number(w)) + " → " + resName(G.CARAVAN_RARE_BY_WORLD[w]); }).join(" · ") + ".\n");

H(1, "Partie 2 — Héros et progression");
H(2, "2.1 Les héros et l'expérience");
P(table(["Héros", "Classe", "Puissance", "Endurance", "Célérité", "Précision", "Volonté"], Object.keys(G.HEROES_DB).map(function (id) {
  var h = G.HEROES_DB[id], c = G.getClassByHeroId(id), s = h.stats;
  return [h.name, c ? c.label : "?", s.power, s.endurance, s.celerity, s.precision, s.will];
})));
P("**Expérience (v3.327.0)** : le niveau n demande 30 + 10 × (n − 1) XP (30, 40, 50…). 15 XP par étape d'Histoire, 10 par mission de combat réussie, 5 si elle finit sur un boss. Un point de talent par niveau, **plafonné par acte** (§1.4) ; le surplus attend en réserve.\n");
var lv = [], cum = 0; for (var n = 1; n <= 15; n++) { cum += G.getHeroXpRequiredForLevel(n); lv.push(cum); }
P(table(["Niveau atteint"].concat([2, 4, 6, 8, 10, 12, 14, 16].map(String)), [["XP cumulée"].concat([0, 2, 4, 6, 8, 10, 12, 14].map(function (i) { return fr(lv[i]); }))]));
P("*Campagne (`tools/sim/campagne-lot.js`, v3.365.0) : niveau 8 à l'arrivée au Désert, 11 à l'étape 13, 12 à la fin du chapitre II.*\n");

H(2, "2.2 Conversion des statistiques");
P(table(["Statistique", "Effet", "Coefficient"], [
  ["Force (toutes classes)", "Dégâts d'attaque", "+" + fr(G.FORCE_UNIVERSAL_TAP_COEF) + " par point"],
  ["Stat principale de classe", "Dégâts d'attaque", G.CLASSES.map(function (c) { return c.label + " : " + ({ power: "Force", celerity: "Célérité", will: "Volonté" }[c.mainStat] || c.mainStat) + " +" + fr(c.mainStatTapCoef); }).join(" · ")],
  ["Précision", "Chance de critique", "5 % + 0,06 % par point"],
  ["Volonté", "Multiplicateur critique", "×2 + 0,01 par point ; réduit le critique ennemi"],
  ["Endurance", "PV max", "floor(Endurance^0,75 × 17,716)"],
  ["Endurance", "Défense", "0,002 par point jusqu'à 120, puis 0,0005 ; plafond 60 %, 85 % sous défense de classe"],
  ["Célérité", "Jauge de frappe bonus", "100 × C / (C + " + G.CELERITY_SOFT_CAP_K + ") par action offensive"]
]));
P("Talents : plus aucune défense passive ni pourcentage de dégâts brut depuis la v3.327.0 ; seuls les nœuds de tronc donnent des PV (Cuirasse, Peau d'arcane) ou du critique (Œil vif).\n");

H(2, "2.3 Entraînement");
P(table(["Amélioration", "Coût de base", "Courbe", "Niveau max"], G.UPGRADES.map(function (u) {
  return [u.name, fr(u.baseCost) + " or", u.costStep ? "linéaire : base × (1 + " + fr(u.costStep) + " × niveau)" : "×" + fr(u.costMult) + " par niveau", u.maxLevel];
})));
P("Plafond : 20 niveaux par caractéristique, +10 par niveau de Terrain, plafonné par l'acte (§1.4). Coût de 0 à 60 sur les cinq stats : " + fr(trainCost(0, 60)) + " or ; de 60 à 110 : " + fr(trainCost(60, 110)) + " or.\n");

H(2, "2.4 Équipement");
var SC = G.EQUIPMENT_SLOT_CONFIG;
var STATL = { tapDmg: "Dégâts (plat)", defense: "Défense", critMult: "Mult. critique", tapMult: "Mult. dégâts", autoDps: "Célérité (plat)", goldMult: "Mult. or", critChance: "Chance de critique", xpMult: "Mult. XP", maxHpPct: "PV max" };
function rng(slot, r) {
  var c = SC[slot], rr = c.ranges && c.ranges[r]; if (!rr) return "—";
  var f = function (v) { return (c.stat === "defense" || c.stat === "tapMult" || c.stat === "goldMult") ? fr(v * 100, 1) + " %" : c.stat === "critMult" ? "+" + fr(v, 2) : fr(v); };
  return f(rr[0]) + " – " + f(rr[1]);
}
P(table(["Emplacement", "Stat"].concat(G.RARITY_ORDER.map(function (r) { return G.RARITY_LABELS[r]; })), Object.keys(SC).map(function (s) {
  return [G.EQUIPMENT_SLOT_LABELS[s] || s, STATL[SC[s].stat] || SC[s].stat].concat(G.RARITY_ORDER.map(function (r) { return rng(s, r); }));
})));
P("Échelle des objets par monde : " + G.EQUIP_WORLD_SCALE.map(function (x) { return "×" + fr(x); }).join(" / ") + ". Chance de butin d'équipement plafonnée à " + G.EQUIP_DROP_CHANCE_CAP + " %. Sac : 25 places, 50 avec « Sac profond » (Mémoire) ; sac plein = objet offert.\n");
P(table(["Rareté", "Chance (butin de boss)", "Affixes"], G.RARITY_ORDER.map(function (r) {
  var a = (G.AFFIX_COUNT_BY_RARITY || {})[r] || {};
  return [G.RARITY_LABELS[r], pct((G.RARITY_DROP_RATES[r] || 0) / 100), (a.primary || 0) + " + " + (a.secondary || 0)];
})));
H(3, "Objets uniques");
P("Fichier : `data/elites.js` (ELITE_UNIQUE_LOOT). Valeur et affixes **fixes** : la récompense est déterministe. Ces objets ne se reforgent pas au-delà de ce que permet leur emplacement.\n");
function affText(a) {
  var v = a.value, s = a.stat;
  var txt = (s === "critChance") ? "+" + fr(v) + " %" : (Math.abs(v) < 1 ? "+" + pct(v) : "+" + fr(v));
  return (STATL[s] || s) + " " + txt + " (" + (a.tier === "P" ? "principal" : "secondaire") + ")";
}
var UL = G.ELITE_UNIQUE_LOOT, ulSource = { araignee_marquee: "élite : la Fileuse", ronce_ardente: "élite : la Ronce", heaume_guet: "choix du Serment (desert_11)", arme_cite: "la Cité engloutie (desert_12)", arme_fleuve: "Maddoc après Nezzam (desert_18)", sceau_salle: "choix « salle » = rouvrir (ruines_14)", arme_coeur: "Edda, fin du chapitre III (ruines_20)" };
P(table(["Objet", "Emplacement", "Rareté", "Valeur", "Affixes", "Source"], Object.keys(UL).map(function (id) {
  var u = UL[id];
  var names = u.byClass ? Object.keys(u.byClass).map(function (k) { return u.byClass[k].name; }).join(" / ") : (u.item ? u.item.name : id);
  var val = (u.stat === "defense") ? pct(u.value) : (u.stat === "critMult" ? "+" + fr(u.value, 2) : fr(u.value));
  return [names, G.EQUIPMENT_SLOT_LABELS[u.slot] || u.slot, G.RARITY_LABELS[u.rarity] || u.rarity, (STATL[u.stat] || u.stat) + " " + val, (u.affixes || []).map(affText).join(" · "), ulSource[id] || id];
})));
P("**L'arme du Fleuve** est le premier objet Rare : bas de la fourchette Rare, mais au-dessus de toute arme Inhabituelle. Elle prépare le monde 3.\n");
H(3, "Forge");
P(G.FORGE_LEVELS_PER_RARITY_STEP + " niveaux de forge valent un cran de rareté ; " + G.FORGE_LEVELS_PER_BUILDING_LEVEL + " niveaux par niveau de bâtiment ; le niveau appartient à l'emplacement. Or −25 % avec « Main du forgeron ». **Reforges de l'arme 1 à " + G.STORY_WEAPON_REFORGE_LEVELS + " : or et matériaux du monde seulement (E2).** Choix « plan » = tomber : une Clé de voûte de moins (au moins une), la reforge 7 n'en coûte plus.\n");
/* Barème lu dans ForgeManager.getCost, niveau de l'emplacement simulé (une pièce hors arme). */
var F = G.ForgeManager, gl0 = F.getLevel, gm0 = F.getMaxLevel, forgeRows = [];
for (var lv = 0; lv < 8; lv++) {
  F.getLevel = function () { return lv; }; F.getMaxLevel = function () { return 99; };
  var fc = null; try { fc = F.getCost("armor"); } catch (e) { fc = null; }
  if (fc) forgeRows.push([lv + 1, fr(fc.gold), fc.acier || "—", fc.resine_durcie || "—", fc.chitine_profondeurs || "—", fc.cle_de_voute || "—", "Forge " + Math.ceil((lv + 1) / G.FORGE_LEVELS_PER_BUILDING_LEVEL)]);
}
F.getLevel = gl0; F.getMaxLevel = gm0;
P(table(["Niveau visé", "Or", "Acier", "Résine durcie", "Chitine", "Clé de voûte", "Bâtiment"], forgeRows));

H(2, "2.5 Potions");
P(table(["Potion", "Effet", "Prix"], G.POTIONS_DB.map(function (p) { return [p.name, p.desc || p.description || "", fr(p.cost || p.price || 0) + " or"]; }).concat(G.HEALING_POTIONS_DB.map(function (p) { return [p.name, "Soigne " + pct(p.healPercent || 0) + " des PV max, consomme le tour", fr(p.cost || 0) + " or"]; }))));
P("Stock de potions de mission : " + G.POTION_STOCK_CAP + " (15 avec « Réserve d'alchimiste »). Potions de soin : " + G.SORTIE_POTION_CAP + " par sortie.\n");
function potName(id) { var p = G.POTIONS_DB.concat(G.HEALING_POTIONS_DB).filter(function (x) { return x.id === id; })[0]; return p ? p.name : id; }
if (G.APOTHECARY_RECIPES) P(table(["Préparation (Apothicaire)", "Ingrédients", "Connue d'office"], G.APOTHECARY_RECIPES.map(function (r) { return [potName(r.potionId), costText(r.inputs), r.known ? "oui" : "par commande"]; })));
P("Préparations par jour : " + G.APOTHECARY_DAILY_CAP_BASE + " + " + G.APOTHECARY_DAILY_CAP_PER_LEVEL + " par niveau d'Apothicaire. **Puits du roi** (choix `roi` = rapporter la forme, étape 18) : +" + G.APOTHECARY_PUITS_ROI_BONUS + " préparations par jour et moitié moins d'Eau purifiée par recette (arrondi au-dessus).\n");

H(2, "2.6 Talents par classe");
P("Fichiers : `data/talent-trees.js`, `systems/talent-system.js`. Tronc de 3 nœuds ; deux voies de 4 nœuds + une clé de voûte ; voies ouvertes à " + G.TALENT_TRUNK_GATE + " points de tronc, ordre libre, clé après " + G.TALENT_KEY_GATE + " nœuds de sa voie ; les deux clés s'excluent. Remise à zéro gratuite hors sortie.\n");
var CL = { knight: "Chevalier", archer: "Rôdeur", mage: "Mage" };
var HOOKS = ["k_sang_chaud", "k_rancune", "k_riposte", "k_bastion", "k_soif_bourreau", "a_rythme", "a_tir_mortel", "a_contre_tir", "a_transe", "a_danse_ombres",
  "m_combustion", "m_attiser", "m_incendie", "m_brasier", "m_echo_barriere", "m_surtension", "m_surcharge"];
function nature(n) { var p = []; if (n.mods) p.push("donnée"); if (n.stats) p.push("stat"); if (HOOKS.indexOf(n.id) >= 0) p.push("crochet"); return p.join(" + ") || "—"; }
Object.keys(G.TALENT_TREES).forEach(function (cid) {
  var t = G.TALENT_TREES[cid];
  H(3, CL[cid] || cid);
  var rows2 = t.trunk.map(function (n) { return ["Tronc", n.name + (n.maxRank > 1 ? " (" + n.maxRank + " rangs)" : ""), n.effect, nature(n)]; });
  t.paths.forEach(function (p) { p.nodes.forEach(function (n) { rows2.push(["Voie " + p.name + (n.key ? " — clé" : ""), n.name, n.effect, nature(n)]); }); });
  P(table(["Place", "Talent", "Effet", "Nature"], rows2));
});
P("Chiffres des crochets (`TALENT_VALUES`) : " + Object.keys(G.TALENT_VALUES).map(function (k) { return k + " " + fr(G.TALENT_VALUES[k]); }).join(" · ") + ".\n");
P("*Mesures (`plafond-bench.js --voie A|B`, v3.328.0) : Chevalier Bourreau 100 % sur l'orc de l'étape 15 ; Rôdeur Faucon 72 à 77 % sur le dard ; Chevalier Rempart 100 % sur la Cité. À surveiller : le Rôdeur Ombre en fin de Forêt (87 % sur la ronce et l'orc).*\n");

H(2, "2.7 Compagnons");
var comp = [];
Object.keys(G.COMPANIONS_DB).forEach(function (id) {
  var c = G.COMPANIONS_DB[id];
  var forms = c.voies ? Object.keys(c.voies).map(function (v) { return { label: c.name + " — " + c.voies[v].label, role: c.voies[v].role, base: c.voies[v].base, threat: c.voies[v].threatMult }; })
    : [{ label: c.name, role: c.role, base: c.base, threat: c.threatMult }];
  forms.forEach(function (f) {
    var b = f.base || {};
    comp.push([f.label, (G.COMPANION_ROLE_LABELS || {})[f.role] || f.role || "—", b.power, b.endurance, b.celerity, b.precision, fr(f.threat || 1), c.unlockedBy || "—"]);
  });
});
P(table(["Compagnon", "Rôle", "Puissance", "Endurance", "Célérité", "Précision", "Menace", "Acquis à"], comp));
var up = G.COMPANIONS_DB.wenna.upgrades || {};
P("Améliorations d'un compagnon : " + (up.costs || []).map(function (x) { return fr(x); }).join(" / ") + " or, +" + pct(up.statPct || 0) + " de stats par niveau.\n");
P("Dégâts par frappe = Puissance × " + fr(G.COMPANION_POWER_DMG_COEF) + " × échelle ; PV = Endurance × " + fr(G.COMPANION_HP_COEF) + " × échelle ; retour après KO à " + pct(G.COMPANION_KO_RETURN_PCT) + " des PV (tous avec la Fidélité de Mémoire). " + G.COMPANION_MAX_PRESENT + " compagnons présents au plus. Changement de voie de Maddoc : " + fr(G.VOIE_CHANGE_BASE_COST) + " or, ×" + G.VOIE_CHANGE_COST_MULT + " à chaque fois.\n");

/* ---------- 3. Combat ---------- */
H(2, "2.8 Difficulté : les ennemis suivent la force du héros");
var WS = G.WORLD_HERO_SCALING;
P("Fichiers : `data/worlds.js` (HERO_SCALING_REFS, WORLD_HERO_SCALING), `CombatForecast.getHeroScale`. Le héros est comparé à un **héros de référence** (dégâts par round, PV effectifs = PV / (1 − défense)) : PV ennemis × (dmg / dmg de réf. / " + fr(WS.margin) + ")^" + fr(WS.exp) + ", puissance × (ehp / ehp de réf. / " + fr(WS.margin) + ")^" + fr(WS.exp) + ", jamais sous ×1, plafond ×" + fr(WS.cap) + ". L'or et l'XP ne changent pas.\n");
P(table(["Référence", "Dégâts par round", "PV effectifs"], Object.keys(G.HERO_SCALING_REFS).map(function (k) { var r = G.HERO_SCALING_REFS[k]; return [k, r.dmg, r.ehp]; })));
P(table(["Monde", "Référence par aventure"], Object.keys(WS.refByWorld).map(function (w) { return [worldName(w), WS.refByWorld[w].join(" · ")]; })));
P("*Ruines : provisoire, le héros de fin du chapitre II (`joueurDesert2`) en attendant des références mesurées au robot de campagne. Tant qu'elle reste en place, l'ajustement compare le héros des Ruines au héros de fin du Désert.*\n");

H(1, "Partie 3 — Combat : ennemis, boss, missions, calibrages");
H(2, "3.1 Mise à l'échelle des ennemis");
P("Ennemi ordinaire : PV = floor(Endurance × 6 × échelle × jalon + indice × 5), échelle = (1 + monde × M)^1,45 + aventure × 0,30 + cycle × 0,45 + indice × 0,05. Boss : Endurance × 12 × échelle boss (M × " + fr(G.BOSS_WORLD_MULT_RATIO || 1.444) + "), dégâts ×" + fr(G.BOSS_DMG_MULT) + ". Dégâts d'une frappe = puissance × " + fr(G.ENEMY_POWER_DMG_COEF) + " ; critique ennemi min(40 %, Précision × " + fr(G.ENEMY_PRECISION_CRIT_COEF) + ") à ×" + fr(G.ENEMY_CRIT_MULT) + ".\n");
P(table(["Monde"].concat(G.WORLDS.map(function (w) { return w.name; })), [["M (WORLD_MULT_BY_WORLD)"].concat(G.WORLD_MULT_BY_WORLD.map(function (x) { return fr(x); }))]));
var enemyIds = [];
G.WORLDS.slice(0, 3).forEach(function (w) { (w.adventures || []).forEach(function (a) { (a.enemyPool || []).forEach(function (e) { if (enemyIds.indexOf(e) < 0) enemyIds.push(e); }); }); });
["wolf", "foresttroll", "bramble", "batisseur"].forEach(function (e) { if (enemyIds.indexOf(e) < 0) enemyIds.push(e); });
P(table(["Ennemi (Forêt, Désert, Ruines)", "Puissance", "Endurance", "Célérité", "Précision", "Volonté", "Résiste / faible"], enemyIds.filter(function (id) { return G.ENEMY_DB[id]; }).map(function (id) {
  var e = G.ENEMY_DB[id], s = e.stats; return [e.name, s.power, s.endurance, s.celerity, s.precision, s.will, (e.resists || []).join(",") + " / " + (e.weak || []).join(",")];
})));

H(2, "3.2 Boss");
P("Fichier : `data/bosses.js` (BOSS_DB). Un boss d'aventure sort en fin d'aventure (`WORLDS[].adventures[].boss`) ; un **boss de quête** ne sort que par sa quête (`bossId`, v3.360.0) et ne vient jamais au hasard. Seuls les boss des trois premiers mondes sont utilisés.\n");
var bossUse = {};
var bossWorld = {};
G.WORLDS.forEach(function (w) { (w.adventures || []).forEach(function (a) { if (a.boss) { (bossUse[a.boss] = bossUse[a.boss] || []).push(a.name || "aventure"); if (!bossWorld[a.boss]) bossWorld[a.boss] = w.name; } }); });
Object.keys(G.ADVENTURE_QUESTS).forEach(function (id) { var q = G.ADVENTURE_QUESTS[id]; if (q.bossId) (bossUse[q.bossId] = bossUse[q.bossId] || []).push("quête " + id); });
P(table(["Boss", "Monde", "Puissance", "Endurance", "Célérité", "Précision", "Volonté", "Résiste / faible", "Où"], Object.keys(G.BOSS_DB).map(function (id) {
  var b = G.BOSS_DB[id], s = b.stats;
  return [b.name, b.worldId ? worldName(b.worldId) : (bossWorld[id] || "—"), s.power, s.endurance, s.celerity, s.precision, s.will, (b.resists || []).join(",") + " / " + (b.weak || []).join(","), (bossUse[id] || ["mondes suivants"]).join(" ; ")];
})));
H(3, "Phases de boss");
P("Une quête peut donner à son boss un archétype (`bossArchetype`) et des phases (`bossPhases`) : à un seuil de PV, des renforts (`adds`, PV et puissance réduits) et/ou un changement d'archétype. Lu par `combat-engine.js` (checkPhases). Un boss Silencieux lance son silence avec un round d'annonce, un seul télégraphe à la fois.\n");
var phRows = [];
Object.keys(G.ADVENTURE_QUESTS).forEach(function (id) {
  var q = G.ADVENTURE_QUESTS[id];
  if (!q.bossId) return;
  phRows.push([q.name || id, (G.BOSS_DB[q.bossId] || {}).name || q.bossId, "début", q.bossArchetype || "—", "—", "PV ×" + fr(q.bossHpMult || 1) + ", puissance ×" + fr(q.bossPowerMult || 1)]);
  (q.bossPhases || []).forEach(function (ph) {
    phRows.push(["", "", "sous " + pct(ph.atPct), ph.archetype || "—", (ph.adds || []).map(function (a) { return (G.ENEMY_DB[a] || {}).name || a; }).join(", ") + (ph.adds ? " (PV ×" + fr(ph.addsHpMult || 1) + ", puissance ×" + fr(ph.addsPowerMult || 1) + ")" : ""), ph.label || ""]);
  });
});
P(table(["Quête", "Boss", "Moment", "Archétype", "Renforts", "Réglage / libellé"], phRows));
H(3, "La relève (Ruines)");
P("Fichier : `systems/rise-system.js`. Un ennemi qui porte `rises` tombe à terre au lieu de mourir ; s'il n'est pas achevé (règle « Un ennemi se relève » du Grimoire, ou Edda), il se relève au tour ennemi suivant avec " + pct(G.RISE_HP_PCT) + " de ses PV max, une seule fois. `riseForced` : il se relève quoi qu'il arrive. À la relève, `riseAdds` fait entrer des renforts et `risePhases` arme les phases de la seconde vie. **Le seuil** (choix « seuil » = soi) : le héros tombé se relève aussitôt avec " + pct(G.HERO_RISE_HP_PCT) + " de ses PV, une fois par combat.\n");
var riseRows = [];
Object.keys(G.BOSS_DB).forEach(function (id) {
  var b = G.BOSS_DB[id]; if (!b.rises) return;
  var ra = b.riseAdds;
  riseRows.push([b.name, "boss de quête", b.riseForced ? "oui" : "non", ra ? ra.adds.map(function (a) { return (G.ENEMY_DB[a] || {}).name || a; }).join(", ") + " (PV ×" + fr(ra.addsHpMult) + ", puissance ×" + fr(ra.addsPowerMult) + ")" : "—",
    (b.risePhases || []).map(function (ph) { return "sous " + pct(ph.atPct) + " : " + (ph.archetype || "") + (ph.label ? " (" + ph.label + ")" : ""); }).join(" ; ") || "—"]);
});
G.DUNGEONS.forEach(function (d) { if (d.boss && d.boss.rises) riseRows.push([d.boss.name, "boss de " + d.name, d.boss.riseForced ? "oui" : "non", "—", "—"]); });
Object.keys(G.ENEMY_DB).forEach(function (id) { var e = G.ENEMY_DB[id]; if (e.rises) riseRows.push([e.name, "ennemi ordinaire", "non", "—", "—"]); });
P(table(["Qui", "Où", "Relève forcée", "Renforts à la relève", "Phases de la seconde vie"], riseRows));
P("Silence : " + G.SILENCE_DURATION_ROUNDS + " rounds par défaut, " + G.SILENCE_DURATION_ROUNDS_ROI + " si le héros a pris *la forme du roi* (choix `roi` = prendre, `getHeroSilenceRounds()`).\n");

H(2, "3.3 Multiplicateurs propres aux quêtes");
P("Leviers (`systems/quest-enemy-system.js`) : `enemyHpMult` / `bossHpMult` (PV), `enemyPowerMult` / `bossPowerMult` (dégâts), `encounterHpMult` (rencontres scriptées), `eliteStatMult` (élite d'une quête, calée à part de son donjon, v3.431.0).\n");
var AQ = G.ADVENTURE_QUESTS, qrows = [];
Object.keys(AQ).forEach(function (id) {
  var q = AQ[id], f = [];
  ["enemyHpMult", "bossHpMult", "enemyPowerMult", "bossPowerMult", "encounterHpMult"].forEach(function (k) { if (q[k] != null && q[k] !== 1) f.push(k + " ×" + fr(q[k])); });
  if (q.eliteStatMult) f.push("eliteStatMult " + Object.keys(q.eliteStatMult).map(function (k) { return k + " ×" + fr(q.eliteStatMult[k]); }).join(", "));
  qrows.push([q.name || id, id + (q.bossId ? " (boss : " + ((G.BOSS_DB[q.bossId] || {}).name || q.bossId) + ")" : ""), f.join(" · ") || "×1"]);
});
Object.keys(G.HUNT_QUESTS).forEach(function (id) { var q = G.HUNT_QUESTS[id]; qrows.push([q.name, id + " (chasse, lot de " + q.lotSize + ")", q.enemyPowerMult ? "enemyPowerMult ×" + fr(q.enemyPowerMult) : "×1"]); });
P(table(["Quête", "Identifiant", "Multiplicateurs"], qrows));

H(2, "3.4 Élites");
P("Fichiers : `data/elites.js`, `systems/elite-system.js`. Une élite hérite de sa base et ne déclare que des multiplicateurs. isBoss + isElite : dégâts ×" + fr(G.BOSS_DMG_MULT) + ", neutre aux affinités, exaltation d'élite. Élite générique de donjon : ×" + fr(G.DUNGEON_GENERIC_ELITE_MULT.endurance) + " endurance, ×" + fr(G.DUNGEON_GENERIC_ELITE_MULT.power) + " puissance.\n");
P(table(["Élite", "Base", "Archétype", "Endurance", "Puissance", "Célérité", "Répétable", "Récompense"], Object.keys(G.ELITE_DB).map(function (id) {
  var e = G.ELITE_DB[id], s = e.statMult || {}, b = G.ENEMY_DB[e.baseId] || {};
  var loot = (G.ELITE_UNIQUE_LOOT || {})[id] ? "unique" : (e.winResource ? e.winResource.amount + " " + resName(e.winResource.id) : "—");
  return [e.name, b.name || e.baseId, e.archetype, "×" + fr(s.endurance || 1), "×" + fr(s.power || 1), "×" + fr(s.celerity || 1), e.repeatable ? "oui" : "non", loot];
})));

H(2, "3.5 L'Arbre-mère — élite répétable");
var RE = G.LIVING_MAP_RULES.repeatableElite;
P("Frein : +" + pct(RE.brakePerWin) + " de PV et de dégâts par victoire du jour, remis à zéro au jour civil. " + RE.sevePerWin + " Sève par victoire. Une ration par combat rejoué (E4).\n");
P(table(["Mesure v3.331.0 (plafond-bench --journee)", "Un combat", "Victoires par jour", "Sève par jour"], [
  ["Début de l'acte III (entr. 60, vitrine)", "100 %, 1,2 à 1,6 potion", "1,1 à 1,5", "2 à 3"],
  ["Fin de la Forêt (uniques, Wenna +5)", "100 %, 0 potion", "~4", "~8"]
]));

H(2, "3.6 Donjons");
var DC = G.DUNGEON_CONFIG;
P(DC.waveCount + " vagues + boss. **" + DC.runsPerDay + " sorties par jour et par donjon**, remises à zéro toutes les " + DC.ticketResetHours + " h ; les sorties demandées par l'Histoire sont offertes et hors quota (plus de tickets ni d'essence depuis la v3.358.0). Donjon terminé : " + fr(DC.fullClearGoldBase) + " or de base. Éclats : " + DC.shardsPerWaveCleared + " par vague, +" + DC.shardsBossBonus + " au boss, +" + DC.eliteShardsBonus + " par vague élite. Marques : " + DC.maxMarks + " au plus par run, +" + pct(DC.markStackBonus) + " d'or et de matériau par Marque, +" + DC.specialPerMark + " matériau de monde.\n");
P(table(["Marque", "Effet"], G.DUNGEON_MARKS.map(function (mk) { return [mk.name, mk.desc || mk.description || ""]; })));
P(table(["Donjon", "Monde", "Difficulté", "Rareté max", "Boss", "Matériau de fin", "Campement"], G.DUNGEONS.map(function (d) {
  var c = d.camp;
  return [d.name, worldName(d.worldId), "×" + fr(d.difficultyMult), G.RARITY_LABELS[d.maxRarity] || d.maxRarity, (d.boss && d.boss.name) || "—", d.specialResourceId ? d.specialResourceAmount + " " + resName(d.specialResourceId) : "—",
    c ? "après la vague " + c.afterWave + " : souffler (" + pct(c.healPct) + "), changer de compagnon ou sortir ; sac mis en sûreté, +" + c.stoneAmount + " " + resName(d.specialResourceId) : "—"];
})));
P("Le campement (v3.430.0) : sortir à la halte garde tout le butin de la première moitié, sans la moitié de fuite. Élites de vague : " + G.DUNGEONS.filter(function (d) { return d.eliteWaves; }).map(function (d) { return d.name + " " + Object.keys(d.eliteWaves).map(function (w) { return "vague " + w + " " + ((G.ELITE_DB[d.eliteWaves[w]] || {}).name || d.eliteWaves[w]); }).join(", "); }).join(" ; ") + ".\n");

H(2, "3.7 Sortie, soins et pronostic");
P(table(["Règle", "Valeur"], [
  ["Potions de soin par sortie", G.SORTIE_POTION_CAP],
  ["Fuite", pct(G.SORTIE_FLEE_KEEP_PCT) + " du butin conservé, mission non validée"],
  ["Mort", "tout le butin de la sortie perdu ; relève à 0 PV"],
  ["Régénération au Campement", pct(G.CAMP_REGEN_PCT_PER_MIN) + " des PV max par minute hors combat (+50 % avec « Repos du camp ») ; hors ligne, " + pct(G.CAMP_OFFLINE_REGEN_CAP_PCT) + " au plus (75 % avec « Repos du camp »)"],
  ["Seuils du pronostic", Object.keys(G.FORECAST_RATIO_THRESHOLDS).map(function (k) { return k + " ≥ " + fr(G.FORECAST_RATIO_THRESHOLDS[k]); }).join(" · ")]
]));

H(2, "3.8 État mesuré");
H(3, "Au plafond atteignable (plan C, v3.331.0)");
P("Banc `tools/sim/plafond-bench.js`, Grimoire automatique, 2 potions, compagnons à pleine force, talents voie A au plafond de points de l'acte. Réussite Chevalier / Rôdeur / Mage. Mesures du 24/09, non refaites : les contenus n'ont pas changé depuis.\n");
P(table(["Contenu", "Profil", "Réussite", "PV à la fin", "Potions"], [
  ["Premier sang", "Forêt I", "100 / 100 / 100 %", "72 à 86 %", "0"],
  ["Le Roi des marais", "Forêt I", "100 / 100 / 100 %", "50 à 56 %", "0,1 à 1,2"],
  ["La meute", "Forêt II", "100 / 100 / 100 %", "51 à 54 %", "0,7 à 1,6"],
  ["Franchir la Lisière", "Forêt III", "100 / 100 / 100 %", "~50 %", "0,4 à 1,3"],
  ["Élite : la ronce ardente", "Forêt III", "100 / 100 / 100 %", "32 à 43 %", "1,7 à 2"],
  ["Tanière du Basilic", "fin de Forêt", "100 / 100 / 100 %", "47 à 66 %", "0 à 1,8"],
  ["Orc de l'étape 15", "fin de Forêt", "93 / 100 / 97 %", "42 à 63 %", "0,2 à 2"],
  ["Les dunes", "Désert I", "100 / 100 / 100 %", "51 à 67 %", "0,1 à 1,7"],
  ["Le gouffre, la nuée", "Désert II", "100 / 100 / 100 %", "47 à 66 %", "0 à 1,4"],
  ["Le serment sous l'armure", "Désert III", "100 / 100 / 100 %", "~55 %", "0,2 à 0,5"],
  ["La Cité engloutie", "fin du Désert", "100 / 93 / 100 %", "43 à 52 %", "0,3 à 1,3"],
  ["Le dard des profondeurs", "fin du Désert", "93 / 77 / 87 %", "41 à 46 %", "1,3 à 1,8"],
  ["Petite Aventure du Désert", "Désert I", "100 / 100 / 100 %", "65 à 68 %", "0,3 à 0,4"],
  ["Arbre-mère", "Forêt III", "100 / 100 / 100 %", "54 à 59 %", "1,2 à 1,6"]
]));
H(3, "Au profil « campagne » (acte IV, v3.362.0)");
P("Banc `tools/sim/nezzam-bench.js` (profil campagne de `plafond-bench.js` : entraînement 110, uniques de la Forêt, heaume, arme de la Cité, reforge arme 4 / armure 2, Wenna +5, Maddoc +2 tronc), 60 runs par classe. Cibles du document de l'acte IV : 75 à 90 % par classe, Rôdeur ≥ 70 %, PV à l'arrivée 60 à 75 %, PV à la fin 20 à 40 %, 1 à 2 potions, 20 à 30 rounds.\n");
P(table(["Contenu", "Réussite (Ch / Rô / Ma)", "PV à l'arrivée", "PV à la fin", "Potions", "Rounds contre le boss"], [
  ["Le trône de sable (3 rencontres + Nezzam)", "90 / 78 / 95 %", "67 à 73 %", "35 à 46 %", "1,6 à 1,9", "24 à 28"]
]));
P("*Lecture : la marche est raide (PV ×5 et puissance ×2 font tomber la réussite sous 30 %) ; ne pas durcir Nezzam sans banc. Le vol de vie n'est pas suspendu pendant que le ver de la phase à 60 % est debout. Le Mage est 5 points au-dessus de la cible.*\n");
H(3, "Campagne complète (robot joueur, v3.366.0)");
P("Banc `tools/sim/campagne-lot.js --combats` : 12 parties (4 par classe), robot qui joue l'Histoire, entretient le village et farme quand un combat l'arrête. Structure (option A) : `tools/sim/campagne-harness.js`, 38 / 38 étapes pour chaque classe.\n");
P(table(["Mesure", "v3.365.0 (plafond par jour)", "v3.366.0 (réserve, recharge " + fr(PA_RECHARGE_H) + " h, option A)"], [
  ["Temps simulé, médiane de fin de partie", "98 h (73 à 136 h)", "82 h"],
  ["Jusqu'à desert_15", "58 h", "32 h"],
  ["desert_05 (la traversée)", "24,4 h", "1,3 h"],
  ["desert_06", "6,2 h", "5,9 h"],
  ["Attentes de réserve de Petites Aventures", "—", "3,1 h"],
  ["Murs (étape rejouée gagnée d'office)", "aucun", "aucun"],
  ["Nezzam", "12 / 12, 0 mort", "12 / 12"]
]));
P("*Recharge à 3 h mesurée : 72 h de fin de partie (non retenue). Principaux tueurs de la campagne (v3.365.0) : le sphinx de desert_12 (43 % de morts par combat), le Basilic de forest_13 (37 %), l'orc de forest_15.*\n");

H(3, "Ruines (bancs, v3.428.0 à v3.433.0)");
P("Bancs `tools/sim/ruines-acte1-bench.js`, `ruines-acte2-bench.js`, `ruines-acte3-bench.js` (Sanctuaire complet, campement compris ; `--golem --quete <id>` pour les quêtes d'élite et de boss), Wenna + Maddoc, Grimoire automatique. Réussite Chevalier / Rôdeur / Mage.\n");
P(table(["Contenu", "Profil", "Réussite", "Réglage retenu"], [
  ["Quêtes de l'acte I (étapes 2 et 3)", "fin du chapitre II", "100 / 100 / 100 %, 29 à 43 % de PV perdus", "—"],
  ["« Celui qui pose les pierres »", "fin d'acte I", "100 %, 30 à 46 % de PV perdus", "—"],
  ["« La salle qu'il évite »", "palier de l'acte II", "100 % (92 % sans Wenna)", "—"],
  ["Sanctuaire : campement atteint", "fin d'acte II / palier Rare", "100 %", "—"],
  ["Golem de quête (étape 14)", "palier Rare", "71-81 / 79-81 / 94-96 %", "puissance ×" + fr(G.ADVENTURE_QUESTS.aq_ruines_golem.eliteStatMult.power) + ", endurance ×" + fr(G.ADVENTURE_QUESTS.aq_ruines_golem.eliteStatMult.endurance)],
  ["Varrek (étape 15)", "palier Rare", "75 / 58 / 79 %", "puissance ×0,72, endurance ×0,6"],
  ["« Le dernier trait » (étape 18)", "fin d'acte III", "79 / 88 / 96 %", "rencontres ×" + fr(G.ADVENTURE_QUESTS.aq_ruines_coeur.encounterHpMult) + " / ×" + fr(G.ADVENTURE_QUESTS.aq_ruines_coeur.enemyPowerMult) + ", Golem ×" + fr(G.ADVENTURE_QUESTS.aq_ruines_coeur.eliteStatMult.power) + " / ×" + fr(G.ADVENTURE_QUESTS.aq_ruines_coeur.eliteStatMult.endurance)],
  ["Le Maître d'œuvre (étape 19)", "fin d'acte III", "71 / 88 / 100 %", "PV ×" + fr(G.ADVENTURE_QUESTS.aq_ruines_plan.bossHpMult) + ", puissance ×" + fr(G.ADVENTURE_QUESTS.aq_ruines_plan.bossPowerMult)]
]));
P("*Lecture : les relèves valent une demi-barre de PV et la pente est raide (Maître d'œuvre ×2 / ×1 : 13 / 38 / 81 % ; ×1,6 / ×0,8 : 88 / 100 / 100 %). Le Rôdeur reste sous 60 % contre Varrek.*\n");
H(3, "Campagne du chapitre III (robot joueur, v3.433.0)");
P("Banc `tools/sim/campagne-harness.js --combats --avise`, un run par classe, toute l'Histoire jusqu'à ruines_20. Le robot monte ses zones de production (profil par défaut depuis le 09/10 ; `--sans-zones` pour l'ancien profil). Décision de Seb du 09/10 (option A) : on ne touche à rien, le chemin obligatoire est dans la cible.\n");
P(table(["Mesure", "Chevalier", "Rôdeur", "Mage"], [
  ["Chapitre III, étapes seules (chemin obligatoire, cible 16 à 36 h)", "39 h", "22 h", "26 h"],
  ["dont ruines_13, le palier Rare", "31 h", "18 h", "22 h"],
  ["Chapitre III avec l'entretien du robot (reforges 5 à 8 de toutes les pièces)", "180 h", "167 h", "92 h"],
  ["Même chose sans monter les zones (`--sans-zones`)", "468 h", "335 h", "332 h"],
  ["Morts sur toute la campagne", "21", "0", "3"],
  ["Murs", "aucun", "aucun", "aucun"]
]));
P("*Lecture : le palier Rare coûte surtout la reforge de l'arme 5 et 6 (Résine de la Forêt, Chitine du Désert), pas la Clé de voûte ni les Pierres errantes (les récompenses suffisent). Le temps facultatif part en Résine (50 à 100 h) et en Chitine (20 à 40 h). Sans zones montées, l'acier coûte 200 à 350 h. Le robot attend 1 h entre deux combats rejoués contre l'Arbre-mère ou le Dard : hypothèse du robot, ces heures sont peut-être surestimées.*\n");

/* ---------- 4. Cartes vivantes ---------- */
H(1, "Partie 4 — Cartes Vivantes");
var LR = G.LIVING_MAP_RULES;
P(table(["Règle", "Valeur"], [
  ["Intensité par anneau", JSON.stringify(LR.ringIntensity).replace(/[{}"]/g, "").replace(/,/g, " · ")],
  ["Sève de première libération", JSON.stringify(LR.firstReward).replace(/[{}"]/g, "").replace(/,/g, " · ")],
  ["Palissade", "frein de " + pct(LR.palisade.brakePerLevel) + " par niveau"],
  ["Effets tenus", Object.keys(LR.effects).map(function (k) { return k + " " + fr(LR.effects[k]); }).join(" · ")],
  ["Élite répétable", "frein +" + pct(RE.brakePerWin) + " par victoire, " + RE.sevePerWin + " Sève"],
  ["Ruines : chantier errant (v3.429.0)", "chaque jour la cité rebâtit un quartier (un quartier libéré repasse « Rebâti ») ; le libérer ce jour-là rapporte " + G.LIVING_MAPS.ruins.chantier.reward + " " + resName(G.LIVING_MAPS.ruins.rewardResourceId) + ". Jamais sur les quartiers `noChantier` (porte du Sanctuaire, Cœur). L'échec s'appelle l'Éboulement"],
  ["Ruines : freins de choix", (G.LIVING_MAPS.ruins.choiceBrakes || []).map(function (b) { return "« " + b.key + " » = " + b.value + " : −" + pct(b.bonus) + " d'Éboulement tant que " + b.sectorId + " tient"; }).join(" ; ")],
  ["Ruines : choix « plan » (v3.433.0)", "finir : plus de chantier ni d'Éboulement, le Cœur rapporte " + G.LIVING_MAPS.ruins.plan.finir.dailyStones + " Pierres errantes par jour ; tomber : " + G.LIVING_MAPS.ruins.plan.tomber.collapse.length + " quartiers en éboulis (effet tenu perdu), +" + G.LIVING_MAPS.ruins.plan.tomber.quarryBonus + " Pierres errantes par victoire dans un éboulis"],
  ["Ruines : le Cœur (v3.432.0)", "ne s'ouvre qu'avec ses trois voisins libérés (`requiresAllNeighbors`)"],
  ["Échec d'une expédition (v3.366.0, option A)", "seul le secteur tenté peut reculer (s'il était libéré et non protégé par la Palissade ou un choix) ; sinon rien n'est perdu. Plus de recul tiré au hasard dans un autre secteur"]
]));

/* ---------- 5. Groupe ---------- */
H(1, "Partie 5 — Combat de groupe");
P("La règle qui gouverne tout : **un groupe ne doit jamais rendre un objectif moins cher.** Un « tuer N ennemis » se relève en crans quand on y met des groupes ; un « gagner ce combat » devient simplement plus dur. Les PV d'un groupe se divisent (`groupHpMult`), ses dégâts se multiplient par le nombre de membres : il n'existe pas de réglage neutre. Les groupes se durcissent à mesure qu'on s'équipe.\n");
P("**Qui frappe qui.** Tous les alliés (héros et compagnons) frappent la même cible ennemie ; il n'y a pas de dégâts de zone. Chaque ennemi tire sa victime au poids de menace (menace × multiplicateur de menace, plancher " + fr(G.THREAT_FLOOR) + ", décroissance " + fr(G.THREAT_DECAY) + " par round) : le héros ×1, Wenna ×0,7, Maddoc tronc ×1,8, Maddoc affût ×0,6.\n");
P(table(["Constante", "Valeur"], [
  ["COMBAT_MAX_ENEMIES / COMBAT_MAX_ALLIES", G.COMBAT_MAX_ENEMIES + " / " + G.COMBAT_MAX_ALLIES],
  ["Compagnons présents au plus", G.COMPANION_MAX_PRESENT],
  ["THREAT_FLOOR / THREAT_DECAY", fr(G.THREAT_FLOOR) + " / " + fr(G.THREAT_DECAY)],
  ["Défense plate d'un compagnon", pct(G.COMPANION_FLAT_DEFENSE)],
  ["Retour après KO", pct(G.COMPANION_KO_RETURN_PCT)]
]));
// v3.422.0 : SCENE_NODES.combatGroups retiré — table des groupes de Petite Aventure supprimée

/* ---------- 6. Outils ---------- */
H(1, "Partie 6 — Outils de mesure et points ouverts");
H(2, "6.1 Bancs et harnais");
P("Tous les bancs chargent les vrais scripts du jeu et jouent de vrais rounds avec un tirage déterministe. Usage : `node tools/sim/<banc>.js [--runs N]`.\n");
P(table(["Banc", "Mesure"], [
  ["plafond-bench.js", "Combats de l'Histoire au plafond de l'acte ; options --voie, --points, --sans-talents, --suite, --pa, --journee, --setelite, --qset, --diff, --boss, --mark, --train, --solo ; contenu « trone »"],
  ["nezzam-bench.js", "Le trône de sable en entier (rencontres + Nezzam) ; --runs, --enc hp,puissance, --boss hp,puissance, --profil campagne|desertfin, --voie ; sonde du vol de vie et des silences"],
  ["campagne-harness.js", "Robot joueur sur toute l'Histoire, chapitre III compris : structure (option A) ou --combats ; --classe, --avise, --rapporter, --recharge H, --investi, --sans-zones, --tomber ; temps d'obtention par ressource en fin de rapport"],
  ["ruines-acte1-bench.js, ruines-acte2-bench.js", "Quêtes des actes I et II des Ruines"],
  ["ruines-acte3-bench.js", "Sanctuaire scellé (profils palier / rare, --boss, --camp) ; --golem --quete <id> [--enc] [--golemmult] [--qboss] pour les quêtes d'élite et le Maître d'œuvre"],
  ["campagne-lot.js", "Lot de parties de campagne (médianes, murs, qui tue, farm) ; --recharge, --tag"],
  ["parcours-harness.js", "Douze parcours joués dans Chromium (Playwright), P1 à P12"],
  ["revente-bench.js", "Production horaire par monde et dépenses d'or"],
  ["village-acte-bench.js", "Modèle de conception du village par acte — non branché sur le code"],
  ["offrande-bench.js", "Aether par monde et rythme des niveaux de Mémoire"],
  ["cite-vague5-bench.js, desert-*-bench.js", "Contenus du Désert"],
  ["dungeon-bench.js, map-bench.js", "Donjons ; carte et Palissade"],
  ["seve-bench.js, upgrade-economy-bench.js, offline-bench.js", "Sève ; entraînement ; hors ligne"],
  ["group-bench.js, quest-cost-bench.js", "Combat de groupe"],
  ["missing-icons.js", "Chemins d'images cités dans le code et absents du dossier"]
]));
P("Harnais de non-régression : `round-harness.js` (section [85] v3.287.0 neutralisée), `boot-harness.js`, `hero-creation-harness.js`, `tools/sim/retour-demarrage-bench.js`. Documents : `tools/docs-gen/generate-balance-guide.js` (ce guide), `tools/docs-gen/generate-function-reference.js` (Référence des fonctions).\n");
H(2, "6.2 Points ouverts");
P("- **Références de héros des Ruines** (`refByWorld.ruins`) : provisoires (fin du chapitre II), à mesurer au robot de campagne (§2.8).");
P("- **Zone de production aux Ruines** (RU7) : la 3ᵉ rangée reste fermée (`zoneRows` 2) ; décision après simulation. Niveaux de village payés en Clé de voûte : pas encore posés, seule la Forge 4 en demande.");
P("- **Varrek et le Rôdeur** : 58 % pour une cible de 60 %. À juger en jeu.");
P("- **Le Chevalier meurt beaucoup au Sanctuaire** dans la campagne du robot (21 morts sur la partie).");
P("- **Gains provisoires des Ruines** : chantier du jour (" + G.LIVING_MAPS.ruins.chantier.reward + "), Cœur (" + G.LIVING_MAPS.ruins.plan.finir.dailyStones + " par jour), éboulis (+" + G.LIVING_MAPS.ruins.plan.tomber.quarryBonus + "), remise de la clé du Cœur, or des étapes 11 à 20.");
P("- **Le seuil** (" + pct(G.HERO_RISE_HP_PCT) + " des PV) : banc à faire.");
P("- **Reforges hautes de toutes les pièces** : longues (Résine et Chitine des mondes précédents). Décision de Seb du 09/10 : on garde, c'est un objectif facultatif.");
P("- **Labyrinthe aux leviers** (RU12) : reporté.");
P("- **Recharge des Petites Aventures** (" + fr(PA_RECHARGE_H) + " h) : à confirmer en jeu.");
P("- **Compteur Chaos** posé par le choix `roi`, sans effet visible. **Descriptions des compétences** : n'affichent pas les valeurs modifiées par les talents.");
P("- Inchangés : Piste C (production par bâtiment), courbe d'XP linéaire, Fiole de réserve aux Ruines, sac à 25, section [85] du harnais.\n");

fs.writeFileSync(OUT, out.join("\n"));
console.log("Guide écrit : " + OUT + " (" + out.length + " lignes)");

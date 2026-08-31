"use strict";
/* ui/combat-round-sandbox-view.js — v3.102.3 : bac à sable de combat reconstruit sur js/sim/combat-round-sim.js (module pur, décision §10 n°11).
   Lit les VRAIES données (héros, kits, ennemis, boss, mondes) et les coefficients courants du moteur ; produit les tableaux P1
   (budgets duel RPT/RPM, sorties Monte-Carlo) + export Markdown. Aucun effet sur la partie. Classes CSS .rsb-* (04-panel-combat-sandbox.css). */

var rsbState = {
  heroId: "knight",
  profile: "naked",          // naked | current | act3
  worldIndex: 0,
  adventureIndex: 0,
  fights: 8,
  runs: 300,
  potions: 2,
  seed: 1000,
  overrides: null,           // coefficients édités (null = valeurs courantes du moteur)
  allClasses: true,
  patterns: true,
  resultsHtml: "",
  markdown: ""
};

var RSB_HERO_BY_CLASS = { knight: "knight", archer: "ranger", mage: "mage" };

function rsbLiveCoefs() {
  return {
    enemyHpCoef: (typeof ENEMY_PV_MULT === "number") ? ENEMY_PV_MULT : 3.33,
    bossHpCoef: (typeof BOSS_PV_MULT === "number") ? BOSS_PV_MULT : 3.1,
    enemyDmgCoef: (typeof ENEMY_POWER_DMG_COEF === "number") ? ENEMY_POWER_DMG_COEF : 0.5,
    bossDmgMult: (typeof BOSS_DMG_MULT === "number") ? BOSS_DMG_MULT : 1.5,
    resistMult: (typeof RESIST_DMG_MULT === "number") ? RESIST_DMG_MULT : 0.85,
    weakMult: (typeof WEAK_DMG_MULT === "number") ? WEAK_DMG_MULT : 1.15,
    bossNeutral: true,
    potionHealPct: 0.35,
    // v3.105.0 (distance) : approche câblée sur les constantes réelles (enemy-archetypes.js)
    engageEnabled: true,
    engageDefaultRounds: (typeof ENGAGE_DEFAULT_ROUNDS === "number") ? ENGAGE_DEFAULT_ROUNDS : 1,
    engageBossRounds: (typeof ENGAGE_BOSS_ROUNDS === "number") ? ENGAGE_BOSS_ROUNDS : 1,
    engageTable: (window.ENEMY_ENGAGE_ROUNDS && typeof ENEMY_ENGAGE_ROUNDS === "object") ? ENEMY_ENGAGE_ROUNDS : {}
  };
}

function rsbCoefs() {
  return Object.assign(rsbLiveCoefs(), rsbState.overrides || {});
}

function rsbConfig() {
  var c = rsbCoefs();
  c.potionsPerSortie = rsbState.potions;
  c.patternsEnabled = !!rsbState.patterns;
  return CombatRoundSim.config(c);
}

/* Échelle d'ennemi = formule de WorldManager.generateEnemy (composante monde + aventure), sans cycle. */
function rsbScale() {
  var w = rsbState.worldIndex;
  var mult = (typeof WORLD_MULT_BY_WORLD !== "undefined" && WORLD_MULT_BY_WORLD[w] != null) ? WORLD_MULT_BY_WORLD[w] : 0.9;
  var exp = (typeof ENEMY_PV_WORLD_EXP === "number") ? ENEMY_PV_WORLD_EXP : 1.45;
  return Math.pow(1 + w * mult, exp) + rsbState.adventureIndex * 0.30;
}

function rsbAdventure() {
  var world = (window.WORLDS || [])[rsbState.worldIndex];
  if (!world || !world.adventures || !world.adventures.length) return null;
  return { world: world, adventure: world.adventures[Math.min(rsbState.adventureIndex, world.adventures.length - 1)] };
}

function rsbEnemyDef(id) {
  var e = ENEMY_DB[id];
  return e ? { id: id, name: e.name, stats: e.stats, resists: e.resists, weak: e.weak } : null;
}

function rsbBossDef(id) {
  var b = BOSS_DB[id];
  return b ? { id: id, name: b.name, stats: b.stats, resists: b.resists, weak: b.weak } : null;
}

function rsbHeroDef(heroId) {
  var h = HEROES_DB[heroId];
  var cls = (typeof getClassByHeroId === "function") ? getClassByHeroId(heroId) : null;
  var def = { classId: cls ? cls.id : "knight", weaponType: h.weaponType, stats: h.stats, trained: {} };
  if (rsbState.profile === "act3") {
    def.trained = { power: 8, endurance: 8, celerity: 8, precision: 8, will: 8 };
    def.equipDefensePct = 0.05;
  } else if (rsbState.profile === "current") {
    def.trained = Object.assign({}, game.trainedStats || {});
    def.trained.celerity = Number(def.trained.celerity || 0) + Number(game.bonusCelerity || 0);
    def.equipDefensePct = Number(game.equipDefensePct || 0);
    def.bonusCritChance = Math.max(0, Number(game.critChance || 5) - 5 - Number(game.heroPrecisionRaw || 0) * 0.06);
  }
  return def;
}

function rsbKit(heroDef) {
  return (typeof getClassSkills === "function") ? getClassSkills(heroDef.classId) : CLASS_SKILLS[heroDef.classId];
}

function rsbHeroList() {
  if (!rsbState.allClasses) return [rsbState.heroId];
  var seen = {}, list = [];
  Object.keys(HEROES_DB).forEach(function (id) {
    var cls = (typeof getClassByHeroId === "function") ? getClassByHeroId(id) : null;
    var cid = cls ? cls.id : id;
    if (seen[cid]) return;
    seen[cid] = true;
    list.push(id);
  });
  return list;
}

function rsbF1(x) { return (Math.round(x * 10) / 10).toFixed(1); }
function rsbPct(x) { return Math.round(x * 100) + " %"; }

/* ---------- Tableaux ---------- */
function rsbBudgetTable(ctx, cfg, scale) {
  var pool = ctx.adventure.enemyPool.map(rsbEnemyDef).filter(Boolean);
  var boss = rsbBossDef(ctx.adventure.boss);
  var rows = [], md = [];
  var head = ["Classe", "PV", "Dég./round"].concat(pool.map(function (e) { return e.name + " RPT / RPM"; })).concat([boss.name + " RPT / RPM"]);
  md.push("| " + head.join(" | ") + " |");
  md.push("|" + head.map(function () { return "---"; }).join("|") + "|");
  rsbHeroList().forEach(function (heroId) {
    var hd = rsbHeroDef(heroId), kit = rsbKit(hd);
    var first = CombatRoundSim.duelBudget(hd, kit, pool[0], false, cfg, scale);
    var cells = [HEROES_DB[heroId].name, String(first.heroHp), rsbF1(first.heroDmg)];
    pool.forEach(function (e) { var b = CombatRoundSim.duelBudget(hd, kit, e, false, cfg, scale); cells.push(rsbF1(b.rpt) + " / " + rsbF1(b.rpm)); });
    var bb = CombatRoundSim.duelBudget(hd, kit, boss, true, cfg, scale);
    cells.push(rsbF1(bb.rpt) + " / " + rsbF1(bb.rpm));
    rows.push(cells);
    md.push("| " + cells.join(" | ") + " |");
  });
  return { head: head, rows: rows, md: md.join("\n") };
}

function rsbSortieTable(ctx, cfg, scale) {
  var pool = ctx.adventure.enemyPool.map(rsbEnemyDef).filter(Boolean);
  var boss = rsbBossDef(ctx.adventure.boss);
  var head = ["Classe", "Réussite", "Boss atteint", "PV au boss", "Morts au boss", "Rounds", "Décisions", "Potions"];
  var rows = [], md = [];
  md.push("| " + head.join(" | ") + " |");
  md.push("|" + head.map(function () { return "---"; }).join("|") + "|");
  rsbHeroList().forEach(function (heroId) {
    var hd = rsbHeroDef(heroId), kit = rsbKit(hd);
    var a = CombatRoundSim.aggregateSorties(hd, kit, pool, boss, cfg, { runs: rsbState.runs, fights: rsbState.fights, scale: scale, seed: rsbState.seed });
    var cells = [HEROES_DB[heroId].name, rsbPct(a.winRate), rsbPct(a.bossReached / a.runs), rsbPct(a.avgHpAtBoss), rsbPct(a.deathsAtBoss / a.runs), rsbF1(a.avgRounds), rsbF1(a.avgDecisions), rsbF1(a.avgPotions)];
    rows.push(cells);
    md.push("| " + cells.join(" | ") + " |");
  });
  return { head: head, rows: rows, md: md.join("\n") };
}

function rsbTableHTML(t) {
  var h = '<div class="rsb-table-wrap"><table class="rsb-table"><thead><tr>';
  t.head.forEach(function (c) { h += '<th>' + esc(c) + '</th>'; });
  h += '</tr></thead><tbody>';
  t.rows.forEach(function (r) { h += '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join("") + '</tr>'; });
  h += '</tbody></table></div>';
  return h;
}

function rsbSingleSortieHTML(ctx, cfg, scale) {
  var pool = ctx.adventure.enemyPool.map(rsbEnemyDef).filter(Boolean);
  var boss = rsbBossDef(ctx.adventure.boss);
  var hd = rsbHeroDef(rsbState.heroId), kit = rsbKit(hd);
  var hero = CombatRoundSim.buildHero(hd, kit, cfg);
  var rng = CombatRoundSim.makeRng(rsbState.seed);
  var lines = [];
  for (var i = 0; i < rsbState.fights; i++) {
    var def = pool[i % pool.length];
    var enemy = CombatRoundSim.buildEnemy(def, false, scale + i * 0.05, cfg);
    var f = CombatRoundSim.simulateFight(hero, enemy, cfg, { rng: rng });
    lines.push((i + 1) + ". " + def.name + " (" + enemy.maxHp + " PV) : " + f.rounds + " rounds, " + f.decisions + " décision(s), " + f.bonusStrikes + " frappe(s) bonus, " + f.patternImpacts + " impact(s) — PV héros " + hero.hp + "/" + hero.maxHp + (f.won ? "" : " ☠️"));
    if (!f.won) break;
  }
  if (hero.hp > 0) {
    var b = CombatRoundSim.buildEnemy(boss, true, scale, cfg);
    var fb = CombatRoundSim.simulateFight(hero, b, cfg, { rng: rng });
    lines.push("👑 " + boss.name + " (" + b.maxHp + " PV) : " + fb.rounds + " rounds, " + fb.decisions + " décision(s), " + fb.counters + " contre(s) — PV héros " + hero.hp + "/" + hero.maxHp + (fb.won ? " ✔ victoire" : " ☠️"));
  }
  lines.push("Potions utilisées : " + (cfg.potionsPerSortie - hero.potions) + "/" + cfg.potionsPerSortie);
  return '<ol class="rsb-log">' + lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join("") + '</ol>';
}

/* ---------- Actions ---------- */
function rsbReadForm() {
  var v = function (id) { var el = document.getElementById(id); return el ? el.value : null; };
  var n = function (id, def) { var x = Number(v(id)); return isFinite(x) ? x : def; };
  var c = function (id) { var el = document.getElementById(id); return !!(el && el.checked); };
  rsbState.heroId = v("rsb-hero") || rsbState.heroId;
  rsbState.profile = v("rsb-profile") || rsbState.profile;
  rsbState.worldIndex = Math.max(0, Math.floor(n("rsb-world", 0)));
  rsbState.adventureIndex = Math.max(0, Math.floor(n("rsb-adventure", 0)));
  rsbState.fights = Math.max(1, Math.min(30, Math.floor(n("rsb-fights", 8))));
  rsbState.runs = Math.max(10, Math.min(2000, Math.floor(n("rsb-runs", 300))));
  rsbState.potions = Math.max(0, Math.min(5, Math.floor(n("rsb-potions", 2))));
  rsbState.seed = Math.floor(n("rsb-seed", 1000));
  rsbState.allClasses = c("rsb-allclasses");
  rsbState.patterns = c("rsb-patterns");
  var ov = {};
  [["enemyHpCoef", "rsb-c-ehp"], ["bossHpCoef", "rsb-c-bhp"], ["enemyDmgCoef", "rsb-c-edmg"], ["bossDmgMult", "rsb-c-bdmg"], ["resistMult", "rsb-c-res"], ["weakMult", "rsb-c-weak"], ["potionHealPct", "rsb-c-pot"]].forEach(function (p) {
    var x = Number(v(p[1]));
    if (isFinite(x) && x > 0) ov[p[0]] = x;
  });
  ov.bossNeutral = c("rsb-c-neutral");
  rsbState.overrides = ov;
}

function rsbRun(kind) {
  if (!window.CombatRoundSim) { showToast("Simulateur indisponible", 1400); return; }
  rsbReadForm();
  var ctx = rsbAdventure();
  if (!ctx) { showToast("Monde/aventure introuvable", 1400); return; }
  var cfg = rsbConfig(), scale = rsbScale();
  var title = ctx.world.name + " › " + ctx.adventure.name + " (échelle ×" + rsbF1(scale) + ")";
  var coefs = rsbCoefs();
  var coefLine = "PV ennemi " + coefs.enemyHpCoef + " · PV boss " + coefs.bossHpCoef + " · dég. ennemi " + coefs.enemyDmgCoef + " · dég. boss ×" + coefs.bossDmgMult + " · résist/faibl. " + coefs.resistMult + "/" + coefs.weakMult + " · boss " + (coefs.bossNeutral ? "neutre" : "typé") + " · potions " + rsbState.potions + " × " + Math.round(coefs.potionHealPct * 100) + " %" + (rsbState.patterns ? "" : " · sans patterns");
  var html = '<div class="rsb-result-title">' + esc(title) + '</div><div class="rsb-result-sub">' + esc(coefLine) + '</div>';
  var md = "### " + title + "\n" + coefLine + "\n\n";
  if (kind === "budget" || kind === "all") {
    var bt = rsbBudgetTable(ctx, cfg, scale);
    html += '<h4>Budgets duel (Attaque seule = borne basse) — RPT rounds pour tuer / RPM rounds pour mourir</h4>' + rsbTableHTML(bt);
    md += "#### Budgets duel\n" + bt.md + "\n\n";
  }
  if (kind === "sortie" || kind === "all") {
    var st = rsbSortieTable(ctx, cfg, scale);
    html += '<h4>Sorties Monte-Carlo (' + rsbState.fights + ' combats + boss, ' + rsbState.runs + ' runs, politique « joueur raisonnable »)</h4>' + rsbTableHTML(st);
    md += "#### Sorties (" + rsbState.fights + " combats + boss, " + rsbState.runs + " runs)\n" + st.md + "\n\n";
  }
  if (kind === "single") {
    html += '<h4>Une sortie détaillée — ' + esc(HEROES_DB[rsbState.heroId].name) + ', graine ' + rsbState.seed + '</h4>' + rsbSingleSortieHTML(ctx, cfg, scale);
  }
  rsbState.resultsHtml = html;
  rsbState.markdown = md;
  if (typeof renderPanel === "function") renderPanel();
}

function rsbResetCoefs() {
  rsbState.overrides = null;
  if (typeof renderPanel === "function") renderPanel();
}

function rsbCopyMarkdown() {
  var ta = document.getElementById("rsb-md");
  if (!ta) return;
  ta.select();
  try { document.execCommand("copy"); showToast("📋 Markdown copié", 1200); } catch (e) { showToast("Sélectionne et copie le texte", 1400); }
}

/* ---------- Vue ---------- */
function buildCombatSandboxHTML() {
  if (!window.CombatRoundSim) {
    return '<div class="nb-page-frame"><div class="panel-card"><h3>🧪 Bac à sable</h3><p class="panel-sub">js/sim/combat-round-sim.js n\'est pas chargé.</p></div></div>';
  }
  var coefs = rsbCoefs();
  var h = '<div class="nb-page-frame">';
  h += '<div class="panel-card rsb-card"><h3>🧪 Bac à sable — simulateur de rounds</h3>';
  h += '<p class="panel-sub">Rejoue le modèle du moteur (héros puis ennemi, jauge de célérité, patterns télégraphe → impact, contres) sur les vraies données, sans toucher à ta partie. Les coefficients sont pré-remplis avec les valeurs courantes du jeu.</p>';

  h += '<div class="rsb-grid">';
  h += '<label>Héros<select id="rsb-hero">';
  Object.keys(HEROES_DB).forEach(function (id) { h += '<option value="' + esc(id) + '"' + (id === rsbState.heroId ? ' selected' : '') + '>' + esc(HEROES_DB[id].name) + '</option>'; });
  h += '</select></label>';
  h += '<label>Profil<select id="rsb-profile">'
    + '<option value="naked"' + (rsbState.profile === "naked" ? ' selected' : '') + '>Niveau 1 nu</option>'
    + '<option value="current"' + (rsbState.profile === "current" ? ' selected' : '') + '>Mon héros (entraînement + équipement)</option>'
    + '<option value="act3"' + (rsbState.profile === "act3" ? ' selected' : '') + '>Acte III (+8 partout, +5 % déf.)</option>'
    + '</select></label>';
  h += '<label>Monde<select id="rsb-world">';
  (window.WORLDS || []).forEach(function (w, i) { h += '<option value="' + i + '"' + (i === rsbState.worldIndex ? ' selected' : '') + '>' + esc(w.name) + '</option>'; });
  h += '</select></label>';
  var world = (window.WORLDS || [])[rsbState.worldIndex] || (window.WORLDS || [])[0];
  h += '<label>Aventure<select id="rsb-adventure" onchange="rsbReadForm(); renderPanel();">';
  ((world && world.adventures) || []).forEach(function (a, i) { h += '<option value="' + i + '"' + (i === rsbState.adventureIndex ? ' selected' : '') + '>' + esc(a.name) + '</option>'; });
  h += '</select></label>';
  h += '<label>Combats avant le boss<input type="number" id="rsb-fights" min="1" max="30" value="' + rsbState.fights + '"></label>';
  h += '<label>Runs<input type="number" id="rsb-runs" min="10" max="2000" value="' + rsbState.runs + '"></label>';
  h += '<label>Potions / sortie<input type="number" id="rsb-potions" min="0" max="5" value="' + rsbState.potions + '"></label>';
  h += '<label>Graine<input type="number" id="rsb-seed" value="' + rsbState.seed + '"></label>';
  h += '</div>';
  h += '<label class="rsb-check"><input type="checkbox" id="rsb-allclasses"' + (rsbState.allClasses ? ' checked' : '') + '> Les 3 classes (une ligne par kit)</label>';
  h += '<label class="rsb-check"><input type="checkbox" id="rsb-patterns"' + (rsbState.patterns ? ' checked' : '') + '> Patterns (charge, bouclier, soin) et contres</label>';
  h += '</div>';

  h += '<div class="panel-card rsb-card"><h3>⚙️ Coefficients</h3>';
  h += '<div class="rsb-grid">';
  h += '<label>PV ennemi (ENEMY_PV_MULT)<input type="number" step="0.01" id="rsb-c-ehp" value="' + coefs.enemyHpCoef + '"></label>';
  h += '<label>PV boss (BOSS_PV_MULT)<input type="number" step="0.01" id="rsb-c-bhp" value="' + coefs.bossHpCoef + '"></label>';
  h += '<label>Dégâts ennemi (coef puissance)<input type="number" step="0.01" id="rsb-c-edmg" value="' + coefs.enemyDmgCoef + '"></label>';
  h += '<label>Dégâts boss (×)<input type="number" step="0.05" id="rsb-c-bdmg" value="' + coefs.bossDmgMult + '"></label>';
  h += '<label>Résistance (×)<input type="number" step="0.01" id="rsb-c-res" value="' + coefs.resistMult + '"></label>';
  h += '<label>Faiblesse (×)<input type="number" step="0.01" id="rsb-c-weak" value="' + coefs.weakMult + '"></label>';
  h += '<label>Potion (% PV max)<input type="number" step="0.05" id="rsb-c-pot" value="' + coefs.potionHealPct + '"></label>';
  h += '</div>';
  h += '<label class="rsb-check"><input type="checkbox" id="rsb-c-neutral"' + (coefs.bossNeutral ? ' checked' : '') + '> Boss neutres (ni résistance ni faiblesse)</label>';
  h += '<div class="rsb-actions">';
  h += '<button class="settings-btn" onclick="rsbRun(\'budget\')">📐 Budgets duel</button>';
  h += '<button class="settings-btn" onclick="rsbRun(\'sortie\')">🎲 Sorties Monte-Carlo</button>';
  h += '<button class="settings-btn" onclick="rsbRun(\'all\')">📊 Les deux</button>';
  h += '<button class="settings-btn" onclick="rsbRun(\'single\')">🔍 Une sortie détaillée</button>';
  h += '<button class="settings-btn" onclick="rsbResetCoefs()">↺ Valeurs du jeu</button>';
  h += '</div></div>';

  if (rsbState.resultsHtml) {
    h += '<div class="panel-card rsb-card rsb-results">' + rsbState.resultsHtml;
    if (rsbState.markdown) {
      h += '<textarea id="rsb-md" class="rsb-md" readonly>' + esc(rsbState.markdown) + '</textarea>';
      h += '<button class="settings-btn" onclick="rsbCopyMarkdown()">📋 Copier en Markdown</button>';
    }
    h += '</div>';
  }

  h += '<button class="settings-btn" onclick="switchTab(\'admin\')">← Retour Admin</button>';
  h += '</div>';
  return h;
}

window.buildCombatSandboxHTML = buildCombatSandboxHTML;
window.rsbRun = rsbRun;
window.rsbReadForm = rsbReadForm;
window.rsbResetCoefs = rsbResetCoefs;
window.rsbCopyMarkdown = rsbCopyMarkdown;

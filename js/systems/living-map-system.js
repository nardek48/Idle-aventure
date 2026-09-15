"use strict";
/* systems/living-map-system.js — v3.255.0 (Cartes Vivantes, lot C-1) : LivingMapManager.
   Rapport de conception « Cartes Vivantes » v1.0 (13/09/2026), §4, §5, §10.

   Principe (§2) : la carte ne crée pas de boucle, elle donne un lieu à ce qui
   existe déjà et rend la progression perdable. Ce module ne lance aucun run :
   il connaît l'état des secteurs, dit si un départ est possible et pourquoi,
   et encaisse le résultat d'un run par onRunEnd(). Aucune écriture de
   ressource directe : la Sève passe par WarehouseManager.

   État persisté (§10.2), rien d'autre — le front, l'atteignabilité et la
   protection se DÉDUISENT de l'état et du niveau de Palissade :
     game.livingMaps = {
       lastAscensionSeen: N,
       forest: { sectors: { gue: { state, firstRewardClaimed, liberatedCount } } }
     }
   États : "voile" (jamais libéré), "libere", "recouvert" (libéré puis repris).
   v3.256.0 (C-2) : `fight` s'ajoute au même objet — le combat d'élite direct en cours
   ({ mapId, sectorId, eliteId }), nul hors combat. Il vit là pour rester sur le seul
   champ câblé en sauvegarde ; un run d'expédition, lui, est porté par game.sceneRun.
   Un secteur recouvert ne redevient jamais voilé : ce qui a été vu reste vu.

   Le Recouvrement n'a pas d'horloge (décision 2). Il avance sur un ÉCHEC de
   run ciblé (un seul secteur, jamais en cascade) et sur l'ASCENSION (tout ce
   que la Palissade ne tient pas). L'Ascension est appliquée paresseusement par
   ensureDefaults() en comparant game.ascensionCount au repère persisté —
   aucune accroche dans ascendNow() ni hardResetState(). */

var LivingMapManager = {
  STATES: ["voile", "libere", "recouvert"],

  /* ---------- Accès aux données ---------- */

  getMap: function (mapId) {
    return (window.LIVING_MAPS && LIVING_MAPS[mapId]) || null;
  },

  getMapIds: function () {
    return window.LIVING_MAPS ? Object.keys(LIVING_MAPS) : [];
  },

  /* Carte d'un monde de WORLDS (par id), ou null : « pas de carte pour l'instant ». */
  getMapForWorld: function (worldId) {
    var ids = this.getMapIds();
    for (var i = 0; i < ids.length; i++) {
      if (LIVING_MAPS[ids[i]].worldId === worldId) return LIVING_MAPS[ids[i]];
    }
    return null;
  },

  getSectorDef: function (mapId, sectorId) {
    var map = this.getMap(mapId);
    if (!map) return null;
    for (var i = 0; i < map.sectors.length; i++) {
      if (map.sectors[i].id === sectorId) return map.sectors[i];
    }
    return null;
  },

  getRules: function () {
    return window.LIVING_MAP_RULES || { ringIntensity: {}, firstReward: {}, palisade: {} };
  },

  /* ---------- État persisté ---------- */

  /* Idempotent. Complète les manques (nouvelle partie, sauvegarde d'avant la version,
     secteur ajouté aux données) puis applique la régression d'Ascension par repère. */
  ensureDefaults: function () {
    if (!game.livingMaps || typeof game.livingMaps !== "object") game.livingMaps = {};
    var lm = game.livingMaps;
    /* Chemin rapide : l'objet déjà validé est reconnu par identité (getState() passe ici à
       chaque lecture). Un chargement ou un reset pose un nouvel objet et rejoue la validation. */
    if (this._validated === lm && Number(game.ascensionCount || 0) <= lm.lastAscensionSeen) return [];
    this._validated = lm;
    var ids = this.getMapIds();
    for (var i = 0; i < ids.length; i++) {
      var map = LIVING_MAPS[ids[i]];
      if (!lm[map.id] || typeof lm[map.id] !== "object") lm[map.id] = { sectors: {} };
      if (!lm[map.id].sectors || typeof lm[map.id].sectors !== "object") lm[map.id].sectors = {};
      for (var j = 0; j < map.sectors.length; j++) {
        var s = lm[map.id].sectors[map.sectors[j].id];
        if (!s || typeof s !== "object") s = lm[map.id].sectors[map.sectors[j].id] = {};
        if (this.STATES.indexOf(s.state) < 0) s.state = "voile";
        s.firstRewardClaimed = !!s.firstRewardClaimed;
        s.liberatedCount = Math.max(0, Math.floor(Number(s.liberatedCount || 0)));
      }
    }
    /* Repère absent (première fois) : on s'aligne sur le compteur SANS recouvrir,
       sinon un joueur qui a déjà ascendé avant la version perdrait... rien, mais
       le journal mentirait. */
    if (typeof lm.lastAscensionSeen !== "number") lm.lastAscensionSeen = Number(game.ascensionCount || 0);
    if (lm.fight && (typeof lm.fight !== "object" || !this.getSectorDef(lm.fight.mapId, lm.fight.sectorId))) lm.fight = null;
    if (!lm.fight) lm.fight = null;
    return this._applyPendingAscension();
  },

  /* §5.2 : le Cycle reprend tout ce qu'Aeswyn ne tient pas. Une seule fois par
     Ascension, quel que soit le nombre d'appels. Renvoie les secteurs repris. */
  _applyPendingAscension: function () {
    var lm = game.livingMaps;
    var count = Number(game.ascensionCount || 0);
    if (count <= lm.lastAscensionSeen) return [];
    lm.lastAscensionSeen = count; // posé AVANT : getState() rappelle ensureDefaults(), qui doit ressortir aussitôt
    lm.fight = null; // un combat d'élite ne traverse pas l'Ascension (comme dungeonRun)
    var taken = [];
    var ids = this.getMapIds();
    for (var i = 0; i < ids.length; i++) taken = taken.concat(this._regressAllUnprotected(ids[i]));
    if (taken.length && typeof addLog === "function") {
      addLog("Ascension : le Cycle reprend " + taken.map(function (t) { return t.name; }).join(", ") + ".", "event");
    }
    return taken;
  },

  _regressAllUnprotected: function (mapId) {
    var map = this.getMap(mapId), taken = [];
    if (!map) return taken;
    for (var i = 0; i < map.sectors.length; i++) {
      var def = map.sectors[i];
      if (this.isLiberated(mapId, def.id) && !this.isProtected(mapId, def.id)) {
        this.getState(mapId, def.id).state = "recouvert";
        taken.push(def);
      }
    }
    return taken;
  },

  getState: function (mapId, sectorId) {
    this.ensureDefaults();
    var m = game.livingMaps[mapId];
    return (m && m.sectors[sectorId]) || null;
  },

  isLiberated: function (mapId, sectorId) {
    var s = this.getState(mapId, sectorId);
    return !!(s && s.state === "libere");
  },

  /* ---------- Lectures déduites ---------- */

  getIntensity: function (def) {
    return this.getRules().ringIntensity[def.ring] || "sentier";
  },

  getFirstReward: function (def) {
    return Number(this.getRules().firstReward[def.ring] || 0);
  },

  /* §4.2 : atteignable si anneau 1, ou si un voisin est libéré. */
  isReachable: function (mapId, sectorId) {
    var def = this.getSectorDef(mapId, sectorId);
    if (!def) return false;
    if (def.ring === 1) return true;
    for (var i = 0; i < def.neighbors.length; i++) {
      if (this.isLiberated(mapId, def.neighbors[i])) return true;
    }
    return false;
  },

  /* Le voisin libéré le plus proche du village, ou à défaut le voisin d'anneau le plus
     bas : c'est « le secteur par lequel revenir » (§2, le mur parle). */
  getGateway: function (mapId, sectorId) {
    var def = this.getSectorDef(mapId, sectorId);
    if (!def) return null;
    var best = null;
    for (var i = 0; i < def.neighbors.length; i++) {
      var n = this.getSectorDef(mapId, def.neighbors[i]);
      if (!n) continue;
      if (!best || n.ring < best.ring || (n.ring === best.ring && this.isLiberated(mapId, n.id) && !this.isLiberated(mapId, best.id))) best = n;
    }
    return best;
  },

  /* Niveau de Palissade (C-3). Sans bâtiment ni système : 0. */
  getPalisadeLevel: function () {
    var pal = this.getRules().palisade || {};
    if (!window.VillageBuildingManager || typeof VillageBuildingManager.getLevel !== "function") return 0;
    return Number(VillageBuildingManager.getLevel(pal.buildingId || "palisade") || 0);
  },

  /* §5.4 : anneau tenu par la Palissade (0 = rien). Paliers 3 / 7 / 10, à confirmer au banc. */
  getHeldRing: function (level) {
    var lvls = (this.getRules().palisade || {}).holdRingLevels || {};
    var held = 0;
    for (var ring = 1; ring <= 3; ring++) {
      if (lvls[ring] != null && level >= lvls[ring]) held = ring;
    }
    return held;
  },

  /* Protégé = libéré ET dans l'anneau tenu. Un modificateur, pas un état (§4.2). */
  isProtected: function (mapId, sectorId) {
    var def = this.getSectorDef(mapId, sectorId);
    if (!def || !this.isLiberated(mapId, sectorId)) return false;
    return def.ring <= this.getHeldRing(this.getPalisadeLevel());
  },

  getProtectedSet: function (mapId) {
    var map = this.getMap(mapId), out = [];
    if (!map) return out;
    for (var i = 0; i < map.sectors.length; i++) {
      if (this.isProtected(mapId, map.sectors[i].id)) out.push(map.sectors[i].id);
    }
    return out;
  },

  /* §5.4 : le nom d'un secteur voilé est révélé au front à partir du niveau 5 de Palissade. */
  isNameRevealed: function (mapId, sectorId) {
    var s = this.getState(mapId, sectorId);
    if (!s) return false;
    if (s.state !== "voile") return true;
    var reveal = Number((this.getRules().palisade || {}).revealLevel || 0);
    return reveal > 0 && this.getPalisadeLevel() >= reveal && this.isReachable(mapId, sectorId);
  },

  /* Contenu effectif : une élite se joue UNE fois (première libération), les reprises
     jouent content.then (décision Seb 15/09/2026, Camp des toiles). */
  getContentFor: function (mapId, sectorId) {
    var def = this.getSectorDef(mapId, sectorId);
    if (!def || !def.content) return null;
    var s = this.getState(mapId, sectorId);
    if (def.content.type === "elite" && s && s.liberatedCount > 0 && def.content.then) return def.content.then;
    return def.content;
  },

  /* Effet tenu actif (§4.3) : lu par les systèmes concernés en C-2/C-3, jamais par stats-system. */
  hasEffect: function (effectId) {
    var ids = this.getMapIds();
    for (var i = 0; i < ids.length; i++) {
      var map = LIVING_MAPS[ids[i]];
      for (var j = 0; j < map.sectors.length; j++) {
        var def = map.sectors[j];
        if (def.heldEffect && def.heldEffect.id === effectId && this.isLiberated(map.id, def.id)) return true;
      }
    }
    return false;
  },

  /* Secteurs atteignables non libérés : ce qui reste à prendre. */
  getOpenTargets: function (mapId) {
    var map = this.getMap(mapId), out = [];
    if (!map) return out;
    for (var i = 0; i < map.sectors.length; i++) {
      var id = map.sectors[i].id;
      if (!this.isLiberated(mapId, id) && this.isReachable(mapId, id)) out.push(id);
    }
    return out;
  },

  getSummary: function (mapId) {
    var map = this.getMap(mapId);
    var out = { total: 0, voile: 0, libere: 0, recouvert: 0, protege: 0 };
    if (!map) return out;
    out.total = map.sectors.length;
    for (var i = 0; i < map.sectors.length; i++) {
      var id = map.sectors[i].id;
      out[this.getState(mapId, id).state] += 1;
      if (this.isProtected(mapId, id)) out.protege += 1;
    }
    return out;
  },

  /* ---------- Départ ---------- */

  /* canStart(mapId, sectorId) -> { ok, reason, content, intensity }. Le mur parle (§2) :
     chaque refus dit pourquoi et par où. Le cap journalier est celui des Petites Aventures
     (décision 9) et ne porte que sur les expéditions ; un secteur d'élite est un combat. */
  canStart: function (mapId, sectorId) {
    var def = this.getSectorDef(mapId, sectorId);
    if (!def) return { ok: false, reason: "Secteur inconnu" };
    var content = this.getContentFor(mapId, sectorId);
    var intensity = this.getIntensity(def);
    if (!(game.unlockedTabs && game.unlockedTabs.village)) {
      return { ok: false, reason: "Aeswyn n'a pas encore ouvert ses portes. Avance l'Histoire.", content: content, intensity: intensity };
    }
    if (!this.isReachable(mapId, sectorId)) {
      var gw = this.getGateway(mapId, sectorId);
      return { ok: false, reason: "Rien ne mène encore là. Libère d'abord " + (gw ? gw.name : "un secteur voisin") + ".", content: content, intensity: intensity };
    }
    if (game.sceneRun && game.sceneRun.status !== "completed") {
      return { ok: false, reason: "Une expédition est déjà en cours.", content: content, intensity: intensity };
    }
    if (this.getFight()) {
      return { ok: false, reason: "Un combat est déjà engagé sur la carte.", content: content, intensity: intensity };
    }
    if ((game.heroHp || 0) <= 0) {
      return { ok: false, reason: "Tes PV sont à zéro. Repose-toi au Campement.", content: content, intensity: intensity };
    }
    if (window.SortieManager && typeof SortieManager.isMission === "function" && SortieManager.isMission()) {
      return { ok: false, reason: "Une sortie est déjà en cours. Rentre d'abord.", content: content, intensity: intensity };
    }
    if (this.isLiberated(mapId, sectorId)) {
      /* §6.1 : un secteur libéré ne se rejoue que quand plus rien d'atteignable n'attend. */
      var open = this.getOpenTargets(mapId);
      if (open.length) {
        var next = this.getSectorDef(mapId, open[0]);
        return { ok: false, reason: "La brume attend encore ailleurs : " + (next ? next.name : open[0]) + ".", content: content, intensity: intensity };
      }
    }
    if (content && content.type === "expedition" && window.SceneRunManager
        && typeof SceneRunManager.canStartPetiteAventureToday === "function"
        && !SceneRunManager.canStartPetiteAventureToday()) {
      return { ok: false, reason: "Plus d'expédition aujourd'hui. Reviens demain.", content: content, intensity: intensity };
    }
    return { ok: true, reason: "", content: content, intensity: intensity };
  },

  /* ---------- Départ effectif (C-2) ---------- */

  /* start(mapId, sectorId) -> { ok, reason }. Expédition : SceneRunManager.startRun avec la
     cible de carte (l'anneau fixe l'intensité, les pools du secteur surchargent le gabarit,
     SceneRunManager rappelle onRunEnd à la fin). Élite : combat direct, voir startEliteFight. */
  start: function (mapId, sectorId) {
    var cs = this.canStart(mapId, sectorId);
    if (!cs.ok) return cs;
    if (cs.content && cs.content.type === "elite") return this.startEliteFight(mapId, sectorId, cs.content);
    if (!window.SceneRunManager || typeof SceneRunManager.startRun !== "function") return { ok: false, reason: "Expéditions indisponibles" };
    var r = SceneRunManager.startRun(cs.content.templateId, { livingMap: { mapId: mapId, sectorId: sectorId } });
    if (!r.ok) return { ok: false, reason: r.reason };
    if (typeof switchTab === "function") switchTab("scene");
    return { ok: true, reason: "" };
  },

  /* Combat d'élite direct (§6.3) : EliteManager.spawn à l'échelle du monde, sortie en
     contexte "mapelite". combat-engine.js rappelle onFightWon / onFightLost, SortieManager.flee
     rappelle abandonFight. L'objet unique de l'élite reste la récompense de SA quête
     d'aventure ; ici la récompense est celle du secteur (Sève de première libération). */
  startEliteFight: function (mapId, sectorId, content) {
    var map = this.getMap(mapId);
    if (!map || !content || !window.EliteManager || !window.SortieManager) return { ok: false, reason: "Combat indisponible" };
    if (!window.ELITE_DB || !ELITE_DB[content.eliteId]) return { ok: false, reason: "Élite inconnue" };
    this.ensureDefaults();
    game.livingMaps.fight = { mapId: mapId, sectorId: sectorId, eliteId: content.eliteId };
    SortieManager.end("return"); // un farm en cours est rangé, comme pour une quête ou une chasse
    if (!SortieManager.start("mapelite")) { game.livingMaps.fight = null; return { ok: false, reason: "Une sortie est déjà en cours." }; }
    var enemy = EliteManager.spawn(content.eliteId, map.worldId, 0);
    if (!enemy) { SortieManager.end("return"); game.livingMaps.fight = null; return { ok: false, reason: "L'élite n'a pas paru." }; }
    this._applyFightTheme(map);
    if (typeof addLog === "function") addLog("Carte : " + this.getSectorDef(mapId, sectorId).name + " — " + enemy.name + " se dresse devant toi.", "event");
    if (typeof switchTab === "function") switchTab("combat");
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: "" };
  },

  getFight: function () {
    this.ensureDefaults();
    return game.livingMaps.fight || null;
  },

  /* Décor de combat du monde de la carte (même geste qu'AdventureQuestManager.applyQuestTheme). */
  _applyFightTheme: function (map) {
    var root = (typeof document !== "undefined") ? document.documentElement : null;
    if (!root || !root.style || !window.WORLDS) return;
    var world = WORLDS.find(function (w) { return w.id === map.worldId; });
    if (world && world.combatMap) root.style.setProperty("--world-combat-map", 'url("' + world.combatMap + '")');
  },

  /* Reprise après rechargement : l'élite reparaît (QuestEnemyManager.respawnActiveRunEnemy). */
  respawnFightEnemy: function () {
    var f = this.getFight();
    if (!f || !window.EliteManager) return false;
    var map = this.getMap(f.mapId);
    if (map) this._applyFightTheme(map);
    return !!EliteManager.spawn(f.eliteId, map ? map.worldId : "forest", 0);
  },

  /* Appelé par combat-engine.js:killEnemy quand un combat de carte est actif. Seule l'élite
     visée compte ; un autre ennemi (impossible en principe) ne clôt rien. */
  onFightWon: function (enemy) {
    var f = this.getFight();
    if (!f) return false;
    if (!enemy || enemy.id !== f.eliteId) return false;
    if (window.SortieManager) SortieManager.end("success");
    game.livingMaps.fight = null;
    var report = this.onRunEnd(f.mapId, f.sectorId, "success");
    this._afterFight(f, report, "success");
    return true;
  },

  /* Appelé par combat-engine.js:onHeroDefeated (SortieManager.end("death") déjà fait). Même
     traitement PV / justDied / retour au Campement que les autres systèmes. */
  onFightLost: function () {
    var f = this.getFight();
    if (!f) return false;
    game.livingMaps.fight = null;
    var report = this.onRunEnd(f.mapId, f.sectorId, "fail");
    var keptPct = (game.talents && game.talents.t_essence_bloom) ? game.talents.t_essence_bloom * 0.10 : 0;
    game.heroHp = Math.floor((game.heroMaxHp || 1) * keptPct);
    game.justDied = true;
    if (typeof showToast === "function" && report.message) showToast(report.message, 2600);
    if (typeof switchTab === "function") switchTab("campement");
    if (typeof saveGame === "function") saveGame();
    return true;
  },

  /* Fuite (SortieManager.flee, contexte "mapelite") : end("flee") puis échec de secteur. */
  abandonFight: function () {
    var f = this.getFight();
    if (!f) return false;
    if (window.SortieManager) SortieManager.end("flee");
    game.livingMaps.fight = null;
    var report = this.onRunEnd(f.mapId, f.sectorId, "fail");
    if (typeof showToast === "function" && report.message) showToast(report.message, 2600);
    if (typeof saveGame === "function") saveGame();
    return true;
  },

  _afterFight: function (f, report, result) {
    if (typeof showToast === "function" && report.message) showToast(report.message, 2600);
    if (typeof openLivingMap === "function") openLivingMap(f.mapId, f.sectorId);
    else if (typeof switchTab === "function") switchTab("map");
    if (typeof saveGame === "function") saveGame();
  },

  /* ---------- Fin de run ---------- */

  /* onRunEnd(mapId, sectorId, result) -> compte rendu. result : "success" (resolveFinale, ou
     leaveNow après le dernier palier), "fail" (évacuation, abandon, défaite — décision 4),
     "neutral" (leaveNow avant la fin : rien ne bouge). Appelé par SceneRunManager (C-2)
     après SortieManager.end() ; le run ne connaît pas la carte au-delà de cet appel. */
  onRunEnd: function (mapId, sectorId, result) {
    var def = this.getSectorDef(mapId, sectorId);
    var report = { result: result, liberated: false, firstReward: 0, regressed: null, braked: false, message: "" };
    if (!def) return report;
    var s = this.getState(mapId, sectorId);

    if (result === "success") {
      s.state = "libere";
      s.liberatedCount += 1;
      report.liberated = true;
      report.message = def.name + " est libéré.";
      if (!s.firstRewardClaimed) {
        s.firstRewardClaimed = true;
        var seve = this.getFirstReward(def);
        var rules = this.getRules();
        if (seve > 0 && window.WarehouseManager && typeof WarehouseManager.addResource === "function") {
          WarehouseManager.addResource(rules.seveResourceId || "seve_aeswyn", seve, true);
        }
        report.firstReward = seve;
        if (seve > 0) report.message += " +" + seve + " Sève d'Aeswyn.";
      }
      if (typeof addLog === "function") addLog("Carte : " + report.message, "event");
      return report;
    }

    if (result === "fail") {
      report.message = "Échec devant " + def.name + ".";
      var brake = this.getBrakeChance();
      if (brake > 0 && this._rand() < brake) {
        report.braked = true;
        report.message += " La Palissade a tenu.";
      } else {
        var victim = this.pickRegression(mapId, sectorId);
        if (victim) {
          this.regress(mapId, victim.id, "echec devant " + sectorId);
          report.regressed = victim.id;
          report.message += " " + this.buildRegressionMessage(mapId, victim.id);
        } else {
          report.message += " Rien à reprendre pour le Recouvrement.";
        }
      }
      if (typeof addLog === "function") addLog("Carte : " + report.message, "event");
      return report;
    }

    return report; // "neutral" : ni succès ni échec, rien ne bouge
  },

  /* §5.4 : frein de Palissade, 7 % par niveau (70 % au niveau 10). À confirmer au banc. */
  getBrakeChance: function () {
    var per = Number((this.getRules().palisade || {}).brakePerLevel || 0);
    return Math.min(1, Math.max(0, per * this.getPalisadeLevel()));
  },

  /* Source d'aléa isolée : le harnais et le banc la remplacent pour rendre l'échec déterministe. */
  _rand: function () { return Math.random(); },

  /* §5.2 : parmi les voisins libérés non protégés du secteur visé, celui d'anneau le plus
     élevé ; sinon le secteur libéré non protégé le plus lointain. Un seul, jamais en cascade. */
  pickRegression: function (mapId, targetId) {
    var def = this.getSectorDef(mapId, targetId), map = this.getMap(mapId);
    if (!def || !map) return null;
    var pool = [], i;
    for (i = 0; i < def.neighbors.length; i++) {
      var n = this.getSectorDef(mapId, def.neighbors[i]);
      if (n && this.isLiberated(mapId, n.id) && !this.isProtected(mapId, n.id)) pool.push(n);
    }
    if (!pool.length) {
      for (i = 0; i < map.sectors.length; i++) {
        var sd = map.sectors[i];
        if (this.isLiberated(mapId, sd.id) && !this.isProtected(mapId, sd.id)) pool.push(sd);
      }
    }
    if (!pool.length) return null;
    pool.sort(function (a, b) { return b.ring - a.ring; });
    return pool[0];
  },

  /* libéré -> recouvert. Ne touche jamais un secteur voilé ni un secteur protégé. */
  regress: function (mapId, sectorId, reason) {
    var s = this.getState(mapId, sectorId);
    if (!s || s.state !== "libere" || this.isProtected(mapId, sectorId)) return false;
    s.state = "recouvert";
    return true;
  },

  /* §5.3, message type : ce qui est perdu et par où revenir. */
  buildRegressionMessage: function (mapId, sectorId) {
    var def = this.getSectorDef(mapId, sectorId);
    if (!def) return "";
    var msg = "Le Recouvrement a repris " + def.name + ".";
    if (def.heldEffect) msg += " L'effet est perdu : " + def.heldEffect.label;
    var gw = this.getGateway(mapId, sectorId);
    msg += " Reprends-le depuis " + (def.ring === 1 || !gw ? "le village" : gw.name) + ".";
    return msg;
  },

  /* ---------- Accroche narrative (§11) ---------- */

  /* setState(mapId, sectorId, state, reason) : un choix pesant peut libérer, recouvrir ou
     protéger un secteur sans passer par un run. Raison journalisée. Pas de Sève ici. */
  setState: function (mapId, sectorId, state, reason) {
    var s = this.getState(mapId, sectorId);
    if (!s || this.STATES.indexOf(state) < 0) return false;
    if (state === "voile" && s.state !== "voile") return false; // ce qui a été vu reste vu
    if (state === "libere" && s.state !== "libere") s.liberatedCount += 1;
    s.state = state;
    if (typeof addLog === "function") addLog("Carte : " + sectorId + " -> " + state + " (" + (reason || "sans raison") + ")", "event");
    return true;
  }
};

window.LivingMapManager = LivingMapManager;

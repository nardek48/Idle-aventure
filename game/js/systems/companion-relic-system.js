"use strict";
/* systems/companion-relic-system.js — chantier du héros, H4 (reliques ; décisions de Seb du 26/10 : R1, emplacements aux
   paliers 5/15/25, 6 familles, atelier atelier/reliques-compagnons.html variante A).

   - Source : les patrouilles. Chaque heure de patrouille terminée donne 4 % de chance, et 24 h cumulées sans relique
     en garantissent une (game.companionRelics.pity). La première patrouille terminée en rapporte toujours une (audit P4). Famille au hasard, monde = celui du secteur patrouillé.
   - Force = rang du monde (Forêt 1 … Montagne 5). Une relique n'est portée que par un compagnon à la fois, une seule
     relique par famille sur un même compagnon.
   - État : game.companionRelics = { inv: [{ id, f, w }], next, pity } ; ce que porte un compagnon : state(id).relics. */

/* Constantes (familles, paliers, chances) : data/companions.js. */
/* « Croc de la Forêt » : le nom de famille, puis le monde avec sa préposition (traduits au chargement). */
var COMPANION_RELIC_OF = [_t("{f} de la Forêt"), _t("{f} du Désert"), _t("{f} des Ruines"), _t("{f} de la Crypte"), _t("{f} de la Montagne"), _t("{f} de la Tour")];

var CompanionRelics = {
  ensure: function () {
    var r = game.companionRelics;
    if (!r || typeof r !== "object") r = game.companionRelics = { inv: [], next: 1, pity: 0 };
    if (!Array.isArray(r.inv)) r.inv = [];
    r.inv = r.inv.filter(function (x) { return x && COMPANION_RELIC_FAMILIES[x.f] && typeof x.id === "number"; });
    if (typeof r.next !== "number" || r.next < 1) r.next = 1 + r.inv.reduce(function (m, x) { return Math.max(m, x.id); }, 0);
    if (typeof r.pity !== "number" || r.pity < 0) r.pity = 0;
    return r;
  },
  byId: function (id) { return this.ensure().inv.filter(function (x) { return x.id === id; })[0] || null; },
  rank: function (relic) { return Math.max(1, Math.min(5, Number(relic.w || 0) + 1)); },
  /* v3.512.0 (Seb 27/10) : la couleur suit le monde, comme l'équipement (rareté la plus haute du monde). */
  rarity: function (relic) {
    var u = window.WORLD_RARITY_UNLOCKS || [["common"]], row = u[Math.max(0, Math.min(Number(relic.w || 0), u.length - 1))];
    return row[row.length - 1];
  },
  /* Ajoute une relique à l'inventaire (patrouille ou échoppe) et la rend. */
  grant: function (f, w) {
    var R = this.ensure(), relic = { id: R.next++, f: f, w: Math.max(0, Number(w || 0)) };
    R.inv.push(relic);
    return relic;
  },
  icon: function (relic) { return COMPANION_RELIC_DIR + "relic_" + relic.f + ".webp"; },
  name: function (relic) { return I18n.fill(COMPANION_RELIC_OF[Math.min(relic.w, COMPANION_RELIC_OF.length - 1)] || "{f}", { f: _td(COMPANION_RELIC_FAMILIES[relic.f].name) }); },
  effectText: function (relic) {
    var F = COMPANION_RELIC_FAMILIES[relic.f], r = this.rank(relic);
    if (F.dmgPct) return _t("+{n} % dégâts", { n: Math.round(F.dmgPct * r * 100) });
    if (F.hpPct) return _t("+{n} % PV", { n: Math.round(F.hpPct * r * 100) });
    if (F.threatPct) return _t("+{n} % menace", { n: Math.round(F.threatPct * r * 100) });
    if (F.cd) return _t("Recharge −{n}", { n: r >= 5 ? F.cdAt5 : F.cd });
    if (F.heroPct) return _t("Héros +{n} % dégâts", { n: Math.round(F.heroPct * r * 100) });
    return _t("+{n} % butin de patrouille", { n: Math.round(F.patrolPct * r * 100) });
  },

  /* ---------- Emplacements ---------- */
  slotsOpen: function (companionId) {
    var st = window.CompanionManager ? CompanionManager.state(companionId) : null, n = st ? st.upgrades : 0;
    return COMPANION_RELIC_SLOTS_AT.filter(function (s) { return n >= s; }).length;
  },
  worn: function (companionId) {
    var st = window.CompanionManager ? CompanionManager.state(companionId) : null;
    if (!st) return [null, null, null];
    if (!Array.isArray(st.relics)) st.relics = [null, null, null];
    while (st.relics.length < 3) st.relics.push(null);
    return st.relics;
  },
  /* Reliques réellement actives (emplacement ouvert, relique existante). */
  active: function (companionId) {
    var self = this, open = this.slotsOpen(companionId);
    return this.worn(companionId).map(function (id, k) { return k < open && id != null ? self.byId(id) : null; }).filter(Boolean);
  },
  wornBy: function (relicId) {
    var all = (game.companions || {}), out = null;
    Object.keys(all).forEach(function (cid) { if (Array.isArray(all[cid].relics) && all[cid].relics.indexOf(relicId) >= 0) out = cid; });
    return out;
  },
  sum: function (companionId, key) {
    var self = this;
    return this.active(companionId).reduce(function (s, x) { return s + Number(COMPANION_RELIC_FAMILIES[x.f][key] || 0) * self.rank(x); }, 0);
  },
  cooldownCut: function (companionId) {
    var self = this, cut = 0;
    this.active(companionId).forEach(function (x) { var F = COMPANION_RELIC_FAMILIES[x.f]; if (F.cd) cut = Math.max(cut, self.rank(x) >= 5 ? F.cdAt5 : F.cd); });
    return cut;
  },
  /* Emblème (id « talisman ») : bonus du héros, compagnons présents seulement. */
  heroDamageBonus: function () {
    if (!window.CompanionManager || typeof CompanionManager.partyIds !== "function") return 0;
    var self = this;
    return CompanionManager.partyIds().reduce(function (s, cid) { return s + self.sum(cid, "heroPct"); }, 0);
  },

  equip: function (companionId, slot, relicId) {
    var r = this.byId(relicId);
    if (!r || slot < 0 || slot >= this.slotsOpen(companionId)) return false;
    var w = this.worn(companionId), self = this;
    if (w.some(function (id, k) { return k !== slot && id != null && (self.byId(id) || {}).f === r.f; })) return false; // une par famille
    var other = this.wornBy(relicId);
    if (other && other !== companionId) { var ow = this.worn(other); ow[ow.indexOf(relicId)] = null; }
    else if (other === companionId) w[w.indexOf(relicId)] = null;
    w[slot] = relicId;
    this._after(companionId);
    return true;
  },
  unequip: function (companionId, slot) {
    var w = this.worn(companionId);
    if (w[slot] == null) return false;
    w[slot] = null;
    this._after(companionId);
    return true;
  },
  _after: function (companionId) {
    var st = CompanionManager.state(companionId);
    if (st && typeof st.hp === "number") st.hp = Math.min(st.hp, CompanionManager.maxHpOf(companionId));
    if (typeof saveGame === "function") saveGame();
  },

  /* ---------- Source : les patrouilles (R1) ---------- */
  /* Fin de patrouille (pas au rappel) : rend la relique trouvée ou null. rng injectable (harnais, banc). */
  rollPatrol: function (hours, mapId, rng) {
    rng = rng || Math.random;
    var R = this.ensure(), h = Math.max(0, Number(hours || 0));
    var chance = 1 - Math.pow(1 - COMPANION_RELIC_CHANCE_PER_H, h);
    R.pity += h;
    // audit P4 (26/10) : la toute première patrouille terminée rapporte une relique (next n'a jamais avancé)
    if (!(R.next === 1 || rng() < chance || R.pity >= COMPANION_RELIC_PITY_H)) return null;
    R.pity = 0;
    var w = 0;
    if (typeof WORLDS !== "undefined") WORLDS.forEach(function (x, i) { if (x.id === mapId) w = i; });
    return this.grant(COMPANION_RELIC_ORDER[Math.floor(rng() * COMPANION_RELIC_ORDER.length)], w);
  }
};

window.CompanionRelics = CompanionRelics;

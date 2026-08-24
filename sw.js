"use strict";
/* ============================================================
Quest Idle — sw.js (Service Worker, racine du projet)
PWA v1 — mise en cache pour fonctionnement hors-ligne + lancement
instantané une fois installé.

STRATÉGIE (volontairement simple, en 2 niveaux) :
  1. "App shell" (tout le JS/CSS + index.html + manifest + icônes,
     voir PRECACHE_APP_SHELL ci-dessous) : téléchargé et mis en cache
     en une fois à l'installation du service worker. C'est le code du
     JEU lui-même — il doit toujours être à jour et complet pour que
     la partie fonctionne, donc on le précharge explicitement plutôt
     que d'attendre que chaque fichier soit visité une fois.
  2. "Runtime" (tout le reste en même origine — concrètement
     images/, ~80 Mo au total) : PAS précaché d'un coup (trop lourd,
     rendrait l'installation longue et gourmande en stockage/données
     mobiles pour rien — un joueur ne visite pas forcément tous les
     mondes/donjons/bâtiments dès le premier lancement). À la place,
     chaque image est mise en cache la première fois qu'elle est
     réellement demandée par le jeu, puis servie depuis le cache
     ensuite (y compris hors-ligne).

VERSIONING (important à chaque livraison, voir CHANGELOG) :
  CACHE_VERSION doit être incrémenté à CHAQUE version livrée
  (convention proposée : le numéro de version du jeu, ex. "2.90.4").
  À l'activation d'un nouveau service worker, TOUS les caches d'une
  version précédente sont supprimés (voir l'event "activate")  — ça
  inclut le cache "runtime" des images : chaque nouvelle version
  retélécharge donc les images au fil de la navigation du joueur,
  ce qui élimine tout risque de servir une vieille image en cache
  sous un nom de fichier réutilisé (ex. si une image est remplacée
  par une nouvelle du même nom). C'est le compromis choisi (quelques
  Mo retéléchargés par mise à jour, en échange d'aucune image
  périmée jamais servie).

MISE À JOUR "IMMÉDIATE" (décision explicite de l'utilisateur, à
l'inverse du comportement par défaut d'un service worker qui attend
la fermeture de tous les onglets) : self.skipWaiting() +
self.clients.claim() ci-dessous font basculer une partie déjà
ouverte vers la nouvelle version dès qu'elle est prête, SANS attendre
un rechargement manuel. Comme ça peut changer le code du jeu sous les
pieds d'un joueur en pleine partie, le service worker prévient tous
les onglets ouverts via postMessage (voir la fin de l'event
"activate") ; c'est js/main/pwa.js (côté page) qui affiche alors la
petite bannière "Nouvelle version disponible — Recharger".
============================================================ */

var CACHE_VERSION = "3.73.0"; // <- à incrémenter à CHAQUE livraison
var CACHE_NAME = "quest-idle-" + CACHE_VERSION;

var PRECACHE_APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/00-components.css",
  "./css/00-tokens.css",
  "./css/01-base.css",
  "./css/02-layout.css",
  "./css/03-combat.css",
  "./css/04-panel-achievements.css",
  "./css/04-panel-adventures.css",
  "./css/04-panel-aether-shop.css",
  "./css/04-panel-bestiary.css",
  "./css/04-panel-codex.css",
  "./css/04-panel-dungeon.css",
  "./css/04-panel-equipment.css",
  "./css/04-panel-afflictions.css",
  "./css/04-panel-combat-sandbox.css",
  "./css/04-panel-hero-summary.css",
  "./css/04-panel-log.css",
  "./css/04-panel-quests.css",
  "./css/04-panel-camp.css",
  "./css/04-panel-settings.css",
  "./css/04-panel-talents.css",
  "./css/04-panel-upgrades.css",
  "./css/04-panel-village-shop.css",
  "./css/04-panel-village.css",
  "./css/04-panel-zones.css",
  "./css/04-panels-common.css",
  "./css/05-overlays.css",
  "./css/06-map.css",
  "./css/07-responsive.css",
  "./js/core/constants.js",
  "./js/core/state.js",
  "./js/core/utils.js",
  "./js/data/achievements.js",
  "./js/data/ascension.js",
  "./js/data/auto-policy-defaults.js",
  "./js/data/bosses.js",
  "./js/data/class-skills.js",
  "./js/data/classes.js",
  "./js/data/codex.js",
  "./js/data/dungeon.js",
  "./js/data/enemies.js",
  "./js/data/equipment.js",
  "./js/data/afflictions.js",
  "./js/data/heroes.js",
  "./js/data/potions.js",
  "./js/data/quests.js",
  "./js/data/talents.js",
  "./js/data/upgrades.js",
  "./js/data/world-quests.js",
  "./js/data/adventure-quests.js",
  "./js/data/worlds.js",
  "./js/main/boot.js",
  "./js/main/game-loop.js",
  "./js/main/pwa.js",
  "./js/main/log-service.js",
  "./js/main/utils.js",
  "./js/systems/achievement-system.js",
  "./js/systems/codex-system.js",
  "./js/systems/combat-engine.js",
  "./js/systems/combat-resource-system.js",
  "./js/systems/combat-cooldown-system.js",
  "./js/systems/combat-sandbox-system.js",
  "./js/systems/combat-auto-policy-system.js",
  "./js/systems/combat-batch-sim-system.js",
  "./js/systems/dungeon-system.js",
  "./js/systems/equip-shop-system.js",
  "./js/systems/equipment-system.js",
  "./js/systems/loot-system.js",
  "./js/systems/offline-system.js",
  "./js/systems/camp-system.js",
  "./js/systems/potion-system.js",
  "./js/systems/progression-system.js",
  "./js/systems/save-system.js",
  "./js/systems/special-attack-system.js",
  "./js/systems/stats-system.js",
  "./js/systems/affliction-system.js",
  "./js/systems/world-quest-system.js",
  "./js/systems/adventure-quest-system.js",
  "./js/ui/achievement-view.js",
  "./js/ui/ascension-view.js",
  "./js/ui/bestiary-view.js",
  "./js/ui/codex-view.js",
  "./js/ui/combat-view.js",
  "./js/ui/cycle-summary-view.js",
  "./js/ui/dungeon-view.js",
  "./js/ui/equip-shop-view.js",
  "./js/ui/equipment-view.js",
  "./js/ui/afflictions-view.js",
  "./js/ui/heros-view.js",
  "./js/ui/hud-view.js",
  "./js/ui/log-view.js",
  "./js/ui/map-view.js",
  "./js/ui/menu-view.js",
  "./js/ui/modal-view.js",
  "./js/ui/modal.js",
  "./js/ui/onboarding-view.js",
  "./js/ui/potion-view.js",
  "./js/ui/quests-view.js",
  "./js/ui/settings-view.js",
  "./js/ui/combat-sandbox-view.js",
  "./js/ui/shop-view.js",
  "./js/ui/talents-view.js",
  "./js/ui/toast.js",
  "./js/ui/ui-root.js",
  "./js/ui/village-view.js",
  "./js/ui/camp-view.js",
  "./images/Icons/icon-192.png",
  "./images/Icons/icon-512.png",
  "./images/Icons/icon-512-maskable.png",
  "./images/Icons/apple-touch-icon.png",
  "./images/Icons/favicon-32.png",
];

/* ============================================================
   Installation : précache l'app shell (JS/CSS/HTML/manifest/icônes),
   puis bascule immédiatement en position "waiting -> active" sans
   attendre la fermeture des onglets (voir note de versioning ci-dessus).
============================================================ */
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // {cache: "reload"} pour ne jamais réutiliser une réponse HTTP
      // déjà en cache navigateur (distincte du cache du Service
      // Worker) au moment de CONSTITUER le précache — sinon on
      // risquerait de precacher une version déjà périmée.
      var requests = PRECACHE_APP_SHELL.map(function (url) {
        return new Request(url, { cache: "reload" });
      });
      return cache.addAll(requests);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* ============================================================
   Activation : supprime tous les caches d'une version précédente
   (app shell ET runtime confondus, voir note de versioning), prend
   le contrôle immédiat de tous les onglets déjà ouverts, puis les
   prévient qu'une nouvelle version est active (voir js/main/pwa.js).
============================================================ */
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names
          .filter(function (name) { return name.indexOf("quest-idle-") === 0 && name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    }).then(function () {
      return self.clients.claim();
    }).then(function () {
      return self.clients.matchAll({ type: "window" }).then(function (clients) {
        clients.forEach(function (client) {
          client.postMessage({ type: "QUEST_IDLE_SW_UPDATED", version: CACHE_VERSION });
        });
      });
    })
  );
});

/* ============================================================
   Fetch : cache-first partout en même origine.
   - App shell (déjà précaché) : servi depuis le cache quasi toujours,
     avec repli réseau si jamais absent (ne devrait pas arriver).
   - Runtime (images, etc.) : cache-first également, mais mis en
     cache À LA VOLÉE lors du premier accès réseau (voir le .then()
     après fetch()).
   - Requêtes non-GET, cross-origin, ou schémas non http(s) (ex.
     chrome-extension:) : jamais interceptées, on laisse le
     navigateur faire son travail normal.
============================================================ */
self.addEventListener("fetch", function (event) {
  var req = event.request;

  if (req.method !== "GET") return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;

      return fetch(req).then(function (response) {
        // Ne met en cache que les réponses valides (200, même
        // origine) — jamais les erreurs 4xx/5xx, sans quoi une 404
        // resterait en cache indéfiniment.
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(req, responseClone);
        });
        return response;
      }).catch(function () {
        // Hors-ligne et pas en cache : pour une navigation HTML,
        // on retombe sur l'app shell déjà précaché plutôt que
        // l'erreur réseau brute du navigateur.
        if (req.mode === "navigate") {
          return caches.match("./index.html");
        }
        return new Response("", { status: 504, statusText: "Hors-ligne" });
      });
    })
  );
});

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
  À l'activation d'un nouveau service worker, les caches de code d'une
  version précédente sont supprimés (voir l'event "activate").
  v3.457.4 (audit P8) : les IMAGES vivent dans un cache à part, sans
  numéro de version (IMAGE_CACHE), qui survit aux mises à jour : hors
  ligne après une mise à jour, elles ne tombent plus en « ? ». Une image
  servie depuis ce cache est revérifiée en arrière-plan une fois par
  démarrage du service worker (requête conditionnelle, 304 le plus
  souvent) : une image remplacée sous le même nom s'affiche donc une
  fois périmée, puis à jour.

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

var CACHE_VERSION = "3.459.12"; // <- à incrémenter à CHAQUE livraison
var CACHE_NAME = "quest-idle-" + CACHE_VERSION;
var IMAGE_CACHE = "aethervale-images"; // v3.457.4 : hors du préfixe quest-idle-, jamais vidé par "activate"
var imagesRevalidated = {};             // URL déjà revérifiées depuis le démarrage de ce service worker

var PRECACHE_APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/00-components.css",
  "./css/00-title-screen.css",
  "./css/00-hero-creation.css",
  "./css/00-tokens.css",
  "./css/01-base.css",
  "./css/02-layout.css",
  "./css/03-combat.css",
  "./css/03-combat-v2.css",
  "./css/04-panel-achievements.css",
  "./css/04-panel-aether-shop.css",
  "./css/04-panel-bestiary.css",
  "./css/04-panel-codex.css",
  "./css/04-panel-forecast.css",
  "./css/04-panel-dungeon.css",
  "./css/04-panel-equipment.css",
  "./css/04-panel-combat-sandbox.css",
  "./css/04-panel-hero-summary.css",
  "./css/04-panel-heros-screens.css",
  "./css/04-panel-expeditions.css",
  "./css/04-panel-log.css",
  "./css/04-panel-quests.css",
  "./css/03-combat-group.css",
  "./css/03-combat-screen.css",
  "./css/04-panel-camp.css",
  "./css/04-panel-companions.css",
  "./css/04-panel-settings.css",
  "./css/04-panel-talents.css",
  "./css/04-panel-upgrades.css",
  "./css/04-panel-village-shop.css",
  "./css/04-panel-village.css",
  "./css/04-panels-common.css",
  "./css/05-overlays.css",
  "./css/06-map.css",
  "./css/04-panel-living-map.css",
  "./css/04-panel-pa2.css", // v3.382.0 (PA2-1) : NOUVEAU fichier
  "./css/04-panel-labyrinth.css", // v3.434.0 : NOUVEAU fichier (Labyrinthe aux leviers)
  "./css/04-panel-sortie-prep.css", // v3.440.0 : NOUVEAU fichier (préparation de sortie)
  "./css/04-panel-evolutions.css",
  "./css/07-responsive.css",
  "./css/08-desktop.css",
  "./css/09-wide.css",
  "./css/99-icon-assets.css",
  "./js/core/constants.js",
  "./js/core/combat-actors.js",
  "./js/core/state.js",
  "./js/core/utils.js",
  "./js/core/i18n.js",
  "./js/lang/en.js",
  "./js/data/achievements.js",
  "./js/data/auto-policy-defaults.js",
  "./js/data/elites.js",
  "./js/data/bosses.js",
  "./js/data/class-skills.js",
  "./js/data/companions.js",
  "./js/data/boss-moments.js",
  "./js/data/patrols.js",
  "./js/data/classes.js",
  "./js/data/codex.js",
  "./js/data/dungeon.js",
  "./js/data/enemies.js",
  "./js/data/equipment.js",
  "./js/data/heroes.js",
  "./js/data/living-maps.js",
  "./js/data/potions.js",
  "./js/data/talent-trees.js",
  "./js/data/upgrades.js",
  "./js/data/memory.js",
  "./js/data/adventure-quests.js",
  "./js/data/story-quests.js",
  "./js/data/worlds.js",
  "./js/data/world-caps.js",
  "./js/main/boot.js",
  "./js/main/instance-unique.js", // v3.457.4
  "./js/main/game-loop.js",
  "./js/main/pwa.js",
  "./js/main/log-service.js",
  "./js/main/journal-test.js",
  "./js/systems/achievement-system.js",
  "./js/systems/codex-system.js",
  "./js/sim/combat-round-sim.js",
  "./js/systems/combat-engine.js",
  "./js/systems/initiative-system.js",
  "./js/systems/rise-system.js",
  "./js/systems/sleep-system.js",
  "./js/systems/companion-system.js",
  "./js/data/combat-states.js",
  "./js/systems/elite-system.js",
  "./js/systems/combat-forecast-system.js",
  "./js/systems/sortie-system.js",
  "./js/systems/pa2-run.js", // v3.381.0 (PA2-0) : NOUVEAU fichier
  "./js/data/pa2-maps.js", // v3.381.0 (PA2-0) : NOUVEAU fichier
  "./js/data/pa2-content.js", // v3.381.0 (PA2-0) : NOUVEAU fichier
  "./js/data/labyrinth.js", // v3.434.0 : NOUVEAU fichier
  "./js/systems/labyrinth-run.js", // v3.434.0 : NOUVEAU fichier
  "./js/ui/map-camera.js", // v3.394.0 : NOUVEAU fichier (caméra commune des cartes)
  "./js/ui/pa2-view.js", // v3.382.0 (PA2-1) : NOUVEAU fichier
  "./js/ui/labyrinth-view.js", // v3.434.0 : NOUVEAU fichier
  "./js/ui/sortie-prep-view.js", // v3.440.0 : NOUVEAU fichier (préparation de sortie)
  "./js/data/combat-items.js", // v3.441.0 : NOUVEAU fichier (objets de combat)
  "./js/systems/combat-item-system.js", // v3.441.0 : NOUVEAU fichier (objets de combat)
  "./js/systems/combat-resource-system.js",
  "./js/systems/combat-cooldown-system.js",
  "./js/systems/combat-auto-policy-system.js",
  "./js/systems/dungeon-system.js",
  "./js/systems/mission-board-system.js",
  "./js/systems/equip-shop-system.js",
  "./js/systems/caravan-system.js", // v3.421.0 (E-2) : NOUVEAU fichier
  "./js/ui/caravan-view.js", // v3.421.0 (E-2) : NOUVEAU fichier
  "./js/systems/enchant-system.js",
  "./js/systems/equipment-system.js",
  "./js/systems/loot-system.js",
  "./js/systems/prefs-system.js",
  "./js/systems/return-system.js",
  "./js/systems/fil-rouge-system.js",
  "./js/systems/boss-moment-system.js",
  "./js/systems/patrol-system.js",
  "./js/systems/offline-system.js",
  "./js/systems/camp-system.js",
  "./js/systems/provisions-system.js",
  "./js/systems/resume-system.js",
  "./js/systems/potion-system.js",
  "./js/systems/progression-system.js",
  "./js/systems/talent-system.js",
  "./js/systems/world-travel-system.js",
  "./js/systems/save-system.js",
  "./js/systems/stats-system.js",
  "./js/systems/memory-system.js",
  "./js/systems/affliction-system.js",
  "./js/systems/living-map-system.js",
  "./js/systems/adventure-quest-system.js",
  "./js/systems/story-quest-system.js",
  "./js/systems/tutorial-catalog-system.js",
  "./js/ui/achievement-view.js",
  "./js/ui/ascension-view.js",
  "./js/ui/bestiary-view.js",
  "./js/ui/codex-view.js",
  "./js/ui/tutorials-view.js",
  "./js/ui/debug-touch-view.js",
  "./js/ui/tap-rescue.js",
  "./js/ui/desktop-scale.js",
  "./js/ui/combat-group-view.js",
  "./js/ui/combat-screen-view.js",
  "./js/ui/combat-view.js",
  "./js/ui/combat-forecast-view.js",
  "./js/ui/dungeon-view.js",
  "./js/ui/equip-shop-view.js",
  "./js/ui/equipment-view.js",
  "./js/ui/companions-view.js",
  "./js/ui/heros-view.js",
  "./js/ui/heros-screens-view.js",
  "./js/ui/hud-view.js",
  "./js/ui/fil-rouge-view.js",
  "./js/ui/or-a-investir-view.js", // v3.429.24 : NOUVEAU fichier (bulle « or à investir »)
  "./js/ui/hud-dock-view.js", // v3.396.0 : NOUVEAU fichier (bulles de raccourci du HUD)
  "./js/ui/return-view.js",
  "./js/ui/boss-moment-view.js",
  "./js/ui/patrol-view.js",
  "./js/ui/expeditions-view.js",
  "./js/ui/log-view.js",
  "./js/ui/map-view.js",
  "./js/ui/living-map-view.js",
  "./js/ui/menu-view.js",
  "./js/ui/modal-view.js",
  "./js/ui/modal.js",
  "./js/ui/potion-view.js",
  "./js/ui/quests-view.js",
  "./js/ui/settings-view.js",
  "./js/ui/save-transfer-view.js",
  "./js/ui/combat-round-sandbox-view.js",
  "./js/ui/shop-view.js",
  "./js/ui/talents-view.js",
  "./js/ui/title-screen-view.js",
  "./js/ui/toast.js",
  "./js/ui/ui-root.js",
  "./js/ui/village-view.js",
  "./js/ui/camp-view.js",
  /* v3.448.1 : fichiers chargés par index.html mais oubliés du précache (hors-ligne cassé après une mise à jour).
     Le round-harness [224] vérifie désormais que tout script et toute feuille de index.html est ici. */
  "./css/00-rframe.css",
  "./css/00-kbtn.css",
  "./css/00-kgauge.css",
  "./css/00-kframe-scope.css",
  "./css/04-panel-scene.css",
  "./css/04-panel-grimoire.css",
  "./css/04-panel-combat-report.css",
  "./css/04-panel-tutorial.css",
  "./css/04-panel-admin.css",
  "./css/04-panel-combat-speed.css",
  "./css/04-panel-production.css",
  "./css/04-panel-construction.css",
  "./js/data/enemy-archetypes.js",
  "./js/data/grimoire-conditions.js",
  "./js/data/hunt-quests.js",
  "./js/data/scene-nodes.js",
  "./js/data/scene-templates.js",
  "./js/data/production-buildings.js",
  "./js/data/production-plots.js",
  "./js/data/workshops.js",
  "./js/data/construction.js",
  "./js/data/village-buildings.js",
  "./js/data/apothecary-recipes.js",
  "./js/data/tavern-contracts.js",
  "./js/data/workshop-unlock.js",
  "./js/data/village-quests.js",
  "./js/systems/warehouse-system.js",
  "./js/systems/village-building-system.js",
  "./js/systems/apothecary-system.js",
  "./js/systems/tavern-system.js",
  "./js/systems/forge-system.js",
  "./js/systems/construction-system.js",
  "./js/systems/workshop-unlock-system.js",
  "./js/systems/village-quest-system.js",
  "./js/systems/quest-enemy-system.js",
  "./js/systems/hunt-quest-system.js",
  "./js/systems/scene-check-system.js",
  "./js/systems/scene-engine.js",
  "./js/systems/production-system.js",
  "./js/systems/resource-reserve-system.js",
  "./js/systems/production-plots-system.js",
  "./js/systems/workshops-system.js",
  "./js/systems/combat-report-system.js",
  "./js/systems/scene-run-system.js",
  "./js/systems/class-combat-system.js",
  "./js/ui/workshop-quest-modal.js",
  "./js/ui/combat-speed-view.js",
  "./js/ui/combat-report-view.js",
  "./js/ui/tutorial-view.js",
  "./js/ui/scene-view.js",
  "./js/ui/village-building-view.js",
  "./js/ui/warehouse-view.js",
  "./js/ui/workshop-summary-modal.js",
  "./js/ui/production-view.js",
  "./js/ui/construction-view.js",
  "./js/ui/grimoire-view.js",
  "./js/ui/admin-view.js",
  "./js/ui/kframe-decorator.js",
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
      // v3.457.4 (audit O2) : {cache: "no-cache"} au lieu de "reload" — le navigateur revérifie
      // chaque fichier auprès du serveur (ETag) : jamais de version périmée, mais un fichier
      // inchangé revient en 304 au lieu d'être retéléchargé à chaque version.
      var requests = PRECACHE_APP_SHELL.map(function (url) {
        return new Request(url, { cache: "no-cache" });
      });
      /* v3.303.1 (bug Seb : application installée bloquée sur une ancienne version) : addAll
         échouait en entier si UN SEUL fichier manquait sur le serveur — la nouvelle version ne
         s'installait jamais et l'ancienne restait en place. Chaque fichier est désormais mis en
         cache séparément : un fichier absent est signalé en console et ne bloque plus la mise
         à jour (il sera récupéré au réseau à la demande). */
      return Promise.all(requests.map(function (req) {
        return cache.add(req).catch(function (err) {
          console.warn("Précache : fichier ignoré", req.url, err);
        });
      }));
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

  // v3.457.4 (audit P8) : images d'abord depuis leur cache durable, revérifiées une fois en arrière-plan
  if (url.pathname.indexOf("/images/") !== -1) {
    event.respondWith(caches.open(IMAGE_CACHE).then(function (imgCache) {
      return imgCache.match(req).then(function (hit) {
        var refresh = function () {
          return fetch(req, { cache: "no-cache" }).then(function (response) {
            if (response && response.status === 200 && response.type === "basic") imgCache.put(req, response.clone());
            return response;
          });
        };
        if (hit) {
          if (!imagesRevalidated[req.url]) { imagesRevalidated[req.url] = true; refresh().catch(function () {}); }
          return hit;
        }
        return caches.match(req).then(function (old) { // précache de l'app shell (icônes)
          if (old) return old;
          imagesRevalidated[req.url] = true;
          return refresh().catch(function () { return new Response("", { status: 504, statusText: "Hors-ligne" }); });
        });
      });
    }));
    return;
  }

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

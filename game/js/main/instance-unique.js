"use strict";
/* main/instance-unique.js — v3.457.4 (audit P4) : une seule fenêtre écrit la partie.
   Deux onglets ouverts sur la même partie s'écrasaient en silence (la seconde sauvegarde effaçait
   les gains de la première). La fenêtre ouverte en dernier prend la main : elle l'annonce dans
   localStorage ; les autres, prévenues par l'événement « storage », cessent d'écrire
   (saveLockedKey, save-system.js) et se couvrent d'un voile « Recharger ici ». */

var INSTANCE_KEY = (typeof STORAGE_PREFIX === "string" ? STORAGE_PREFIX : "") + "aethervale_instance"; // v3.752.0 : l'Alpha ne verrouille pas le jeu
var instanceId = String(Date.now()) + "-" + Math.floor(Math.random() * 1e9);
var instanceLocked = false;
var instanceSlot = null; // audit 04/11 (QA-1) : emplacement de CETTE fenêtre au moment du verrou

function claimGameInstance() {
  try { localStorage.setItem(INSTANCE_KEY, JSON.stringify({ id: instanceId, at: Date.now() })); } catch (e) { noteErreur("instance-unique.claim", e); }
}

/* Audit 04/11 (SAVE-19) : avant de céder la main, la fenêtre écrit sa partie, si l'emplacement actif est
   toujours le sien (même héros) : jamais par-dessus un autre héros (QA-1). */
function saveBeforeInstanceLock() {
  if (typeof saveGame !== "function" || !game.heroId) return;
  var d = null;
  try { d = JSON.parse(localStorage.getItem(getActiveSaveKey())); } catch (e) { d = null; }
  if (d && d.heroId === game.heroId && d.playerName === game.playerName) saveGame();
}

function lockGameInstance() {
  if (instanceLocked) return;
  saveBeforeInstanceLock();
  instanceLocked = true;
  if (typeof getActiveSaveKey === "function") saveLockedKey = getActiveSaveKey(); // plus aucune écriture ici
  if (typeof getActiveSlot === "function") instanceSlot = getActiveSlot(); // saveGame refuse tout tant que instanceLocked
  var el = document.getElementById("instance-lock");
  if (!el) {
    el = document.createElement("div");
    el.id = "instance-lock";
    document.body.appendChild(el);
  }
  el.innerHTML = '<div class="instance-lock-card"><b>' + _t("Ta partie est ouverte dans une autre fenêtre.") + '</b>'
    + '<p>' + _t("Cette fenêtre ne sauvegarde plus, pour ne rien effacer. Continue dans l'autre, ou reprends la main ici.") + '</p>'
    + '<button type="button" class="kbtn primary" onclick="reloadGameInstanceHere()">' + _t("Recharger ici") + '</button></div>';
}

function initGameInstance() {
  if (!window.localStorage || !window.addEventListener) return;
  claimGameInstance();
  window.addEventListener("storage", function (ev) {
    if (ev.key !== INSTANCE_KEY || !ev.newValue) return;
    var other = null;
    try { other = JSON.parse(ev.newValue); } catch (e) { return; }
    if (other && other.id !== instanceId) lockGameInstance();
  });
}

/* « Recharger ici » : l'autre fenêtre a pu changer l'emplacement actif ; on rouvre le héros de celle-ci. */
function reloadGameInstanceHere() {
  if (instanceSlot && typeof setActiveSlot === "function") setActiveSlot(instanceSlot);
  window.location.reload();
}

window.lockGameInstance = lockGameInstance;
window.reloadGameInstanceHere = reloadGameInstanceHere;
initGameInstance();

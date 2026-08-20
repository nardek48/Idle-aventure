"use strict";
/* ============================================================
Aethervale — systems/workshop-unlock-system.js
v3.38 : WorkshopUnlockManager — logique de la chaîne de déblocage de
l'Atelier de Construction (voir data/workshop-unlock.js). Système
INDÉPENDANT de QuestManager (quêtes journalières, systems/progression-system.js)
— aucun des deux ne connaît l'autre. Consulté par hooks optionnels
(`window.WorkshopUnlockManager &&`) depuis WarehouseManager.craft()
et ConstructionManager.buy(), jamais l'inverse : ce fichier peut lire
game.resources et ConstructionManager, mais ni warehouse-system.js ni
construction-system.js ne dépendent de lui pour fonctionner seuls.
============================================================ */

var WorkshopUnlockManager = {
  /* Migration douce : une ancienne sauvegarde (ou le tout premier
     lancement) n'a pas game.workshopUnlock — comblé ici à l'état
     initial. currentStep = index dans WORKSHOP_UNLOCK_STEPS de la
     PROCHAINE étape à valider (0 au départ, 4 = chaîne terminée,
     redondant avec `completed` mais pratique pour les bornes). */
  ensure: function () {
    if (!game.workshopUnlock || typeof game.workshopUnlock !== "object") {
      game.workshopUnlock = { currentStep: 0, completed: false, planchesCrafted: 0 };
    }
    var wu = game.workshopUnlock;
    if (typeof wu.currentStep !== "number" || wu.currentStep < 0) wu.currentStep = 0;
    if (typeof wu.completed !== "boolean") wu.completed = false;
    if (typeof wu.planchesCrafted !== "number" || wu.planchesCrafted < 0) wu.planchesCrafted = 0;
  },

  /* v3.38 : hook appelé par WarehouseManager.craft() à chaque craft de
     planche réussi (voir systems/warehouse-system.js) — indépendant
     du stock actuel, jamais décrémenté même si les planches sont
     ensuite vendues ou consommées. `amount` = nombre de planches
     produites par CE craft (peut être > 1 avec le stepper). */
  notifyPlanchesCrafted: function (amount) {
    this.ensure();
    amount = Math.floor(Number(amount || 0));
    if (amount <= 0) return;
    game.workshopUnlock.planchesCrafted += amount;
    this.checkCurrentStep();
  },

  /* Vérifie SEULEMENT l'étape currentStep, et ne fait avancer QUE
     D'UNE étape maximum par appel — même si l'étape suivante est elle
     aussi déjà remplie (ex. le joueur a déjà 999 Pierre alors qu'il
     vient tout juste de finir l'étape 2) : la règle du brief est
     stricte, "l'étape N+1 ne doit pas pouvoir se valider avant
     l'étape N" s'applique en TEMPS RÉEL, pas seulement à la
     validation rétroactive du boot (voir runRetroactiveCheck()
     ci-dessous, qui boucle explicitement pour SON cas d'usage précis
     — une sauvegarde existante qu'on rattrape une seule fois avant
     que le joueur ait pu interagir). `silent` évite le toast/log
     individuel. */
  checkCurrentStep: function (silent) {
    this.ensure();
    var wu = game.workshopUnlock;
    if (wu.completed) return false;

    var advanced = this._advanceOneStepIfReady(silent);

    if (advanced) {
      if (typeof renderPanel === "function") renderPanel();
      if (typeof renderHud === "function") renderHud();
      saveGame();
    }

    return advanced;
  },

  /* Fait avancer d'AU PLUS une étape (jamais en boucle) — brique
     interne partagée par checkCurrentStep() (temps réel, une étape
     par appel) et runRetroactiveCheck() (boot, boucle explicite sur
     PLUSIEURS appels successifs). Ne sauvegarde ni ne rafraîchit
     l'UI elle-même : à la charge de l'appelant.
     v3.39 : déclenche le popup de complétion bloquant UNIQUEMENT
     quand !silent — donc jamais lors de runRetroactiveCheck() (silent
     toujours true), qui ne doit produire aucun popup en rafale au
     chargement. Hook optionnel (typeof === "function"), même
     principe que renderPanel/renderHud/saveGame déjà utilisés ici :
     ce fichier système ne dépend pas d'ui/workshop-quest-modal.js
     pour fonctionner seul (tests possibles sans DOM). */
  _advanceOneStepIfReady: function (silent) {
    var wu = game.workshopUnlock;
    if (wu.completed) return false;
    if (wu.currentStep >= WORKSHOP_UNLOCK_STEPS.length) return false;

    var step = WORKSHOP_UNLOCK_STEPS[wu.currentStep];
    if (!step.check(game)) return false;

    wu.currentStep += 1;

    if (!silent) {
      addLog("Objectif complété : " + step.label, "event");
      if (typeof showToast === "function") showToast("✅ " + step.label, 1600);
    }

    if (wu.currentStep >= WORKSHOP_UNLOCK_STEPS.length) {
      wu.completed = true;
      if (!silent) {
        addLog("L'Atelier de Construction est maintenant débloqué en permanence.", "event");
      }
    }

    if (!silent && typeof showWorkshopStepCompletionPopup === "function") {
      var nextStep = wu.completed ? null : WORKSHOP_UNLOCK_STEPS[wu.currentStep];
      showWorkshopStepCompletionPopup(step, nextStep);
    }

    return true;
  },

  /* v3.38 : appelée UNE FOIS au boot (voir main/boot.js), après
     loadGame() et le rattrapage offline. Fait avancer silencieusement
     autant d'étapes que l'état actuel de la sauvegarde le permet (ex.
     un stock déjà au-delà des seuils), SANS notification par étape
     rétroactivement franchie — une seule notification à la toute fin,
     sur la prochaine étape restante (ou aucune si la chaîne est déjà
     terminée). Cas particulier explicitement voulu : un joueur qui a
     DÉJÀ construit l'Atelier avant l'ajout de ce système passe direct
     à completed=true — boucle EXPLICITE ici sur _advanceOneStepIfReady()
     (contrairement à checkCurrentStep(), qui ne fait plus avancer que
     d'une étape par appel, voir sa note ci-dessus) : c'est le SEUL
     endroit du code où traverser plusieurs étapes d'un coup est
     voulu, parce que c'est une vérification ponctuelle sur un état
     déjà figé (la sauvegarde au boot), pas une réaction en temps réel
     à une action du joueur. */
  runRetroactiveCheck: function () {
    this.ensure();
    if (game.workshopUnlock.completed) return;

    var before = game.workshopUnlock.currentStep;
    while (this._advanceOneStepIfReady(true)) {
      // continue tant qu'une étape supplémentaire se valide silencieusement
    }
    var after = game.workshopUnlock.currentStep;

    if (after === before) return; // rien n'a bougé rétroactivement, pas de notification à faire

    if (game.workshopUnlock.completed) {
      addLog("L'Atelier de Construction est débloqué (progression déjà acquise).", "event");
    } else {
      var nextStep = WORKSHOP_UNLOCK_STEPS[after];
      if (nextStep) {
        addLog("Progression retrouvée — prochain objectif : " + nextStep.label, "event");
      }
    }

    saveGame();
  },

  /* true dès que l'étape 3 (index 2, "Récolter 15 Pierre") est
     validée — c'est à partir de là que la carte Atelier devient
     visible/cliquable (état "quête"), voir isWorkshopQuestPending(). */
  isWorkshopVisible: function () {
    this.ensure();
    return game.workshopUnlock.completed || game.workshopUnlock.currentStep >= 2;
  },

  /* true UNIQUEMENT entre l'étape 3 validée et l'étape 4 (construction
     du niveau 1) pas encore faite — fenêtre où la carte est visible
     mais doit être présentée comme un objectif de quête plutôt qu'un
     bâtiment standard. false une fois completed (déblocage permanent,
     jamais de re-verrouillage). */
  isWorkshopQuestPending: function () {
    this.ensure();
    return !game.workshopUnlock.completed && game.workshopUnlock.currentStep >= 2;
  },

  /* Texte du bandeau HUD pour l'étape en cours, null si la chaîne est
     terminée (le bandeau doit alors disparaître définitivement — lu
     par ui/hud-view.js, jamais recalculé après completed=true). */
  getBannerText: function () {
    this.ensure();
    var wu = game.workshopUnlock;
    if (wu.completed) return null;

    var step = WORKSHOP_UNLOCK_STEPS[wu.currentStep];
    if (!step) return null;

    return "Objectif : " + step.label + " (" + step.progress(game) + ")";
  }
};

window.WorkshopUnlockManager = WorkshopUnlockManager;

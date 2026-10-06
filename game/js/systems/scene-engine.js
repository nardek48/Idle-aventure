"use strict";
/* systems/scene-engine.js — v3.391.0 (lot P-3) : l'ancien moteur de scènes est retiré. Restent les
   deux lectures de données pures dont Pa2Run et les vues ont besoin : un canevas, la banque de nœuds. */

var SceneEngine = {
  getTemplate: function (templateId) {
    return (typeof SCENE_TEMPLATES !== "undefined" && SCENE_TEMPLATES[templateId]) || null;
  },

  getNodeBank: function () {
    return (typeof SCENE_NODES !== "undefined") ? SCENE_NODES : {};
  }
};

window.SceneEngine = SceneEngine;

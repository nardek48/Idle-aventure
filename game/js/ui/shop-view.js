"use strict";
/* ui/shop-view.js — écran Boutique (Potions).
   v3.411.0 (nettoyage, Seb) : l'onglet « Économie » (améliorations d'or : Bourse lourde, Contrats
   lucratifs) est vide depuis v3.313.0 ; son code mort est retiré — barre de sous-onglets, cartes
   d'amélioration, aperçus avant/après. Les entraînements (utrain_*) s'achètent dans Héros › Stats.
   setShopSubTab reste (l'Histoire l'appelle) et ouvre toujours les Potions. */

var activeShopSubTab = "potions";

function setShopSubTab(tab) {
  activeShopSubTab = "potions";
  if (typeof renderPanel === "function") renderPanel();
}

function buildShopHTML() {
  activeShopSubTab = "potions";
  // v3.705.0 : page standard à cadre (.kfp-wrap posé par le décorateur), comme le Village
  var h = '<div class="nb-page-frame nb-page-frame-fill kframe-page" data-kf-title="' + _t("Potions") + '">';
  h += typeof buildPotionShopHTML === "function" ? buildPotionShopHTML() : "";
  h += '</div>'; // fin .nb-page-frame
  return h;
}

window.buildShopHTML = buildShopHTML;
window.setShopSubTab = setShopSubTab;

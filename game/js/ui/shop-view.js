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
  var h = '<div class="subtab-page">';
  h += '<div class="subtab-page-content">';
  h += '<div class="nb-page-frame nb-page-frame-fill kframe-page" data-kf-title="' + _t("Potions") + '">';
  h += typeof buildPotionShopHTML === "function" ? buildPotionShopHTML() : "";
  h += '</div>'; // fin .nb-page-frame
  h += '</div>'; // fin .subtab-page-content
  h += '</div>'; // fin .subtab-page
  return h;
}

window.buildShopHTML = buildShopHTML;
window.setShopSubTab = setShopSubTab;

"use strict";
/* lang/en.js — v3.368.0 : dictionnaire FRANÇAIS → ANGLAIS (conception i18n v1.0, D1).
   La clé est le texte français exact passé à _t() ; la valeur, son anglais.
     "Santé du Héros": "Hero's Health",
     "quête|Partir": "Set out",                       contexte : _t("Partir", "quête")
     "Prochaine expédition dans {d}": "Next expedition in {d}",   mêmes {paramètres} des deux côtés
     "{n} place||{n} places": ["{n} slot", "{n} slots"]            pluriel : _tn(n, "{n} place", "{n} places")
   Une entrée absente affiche le français. Squelette et contrôles : node sim/i18n-audit.js .
   Lot L-0 : seulement la barre d'onglets, pour tester la chaîne ; l'interface s'y ajoute lot par lot (L-1 à L-5), puis la traduction (EN-1). */
I18n.register("en", {
  // Barre d'onglets (index.html) — preuve de bout en bout du lot L-0
  "onglet|Camp": "Camp",
  "onglet|Quêtes": "Quests",
  "onglet|Village": "Village",
  "onglet|Héros": "Heroes",
  "onglet|Menu": "Menu"
});

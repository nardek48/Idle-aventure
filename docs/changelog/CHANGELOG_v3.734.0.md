# v3.734.0 — Rappels : Marque du donjon et PV bas (07/11/2026)

Analyse du journal de test de Seb (Forêt, Rôdeur) : à forest_13, une descente sans Marque n'a pas compté ; en début de partie, étapes enchaînées à 25-31 % de PV. Décisions A et B de Seb (07/11). Aucun fichier protégé.

## Ajouté
- **A. Étape qui exige une Marque** (forest_13, détectée par le compteur `coeurKillsMarked` lu dans le `check` de l'étape) :
  - rappel dans la feuille de lancement du donjon, au-dessus des Marques : « L'étape « Marques du corrompu » demande au moins une Marque. » (rouge, puis doré avec une coche dès qu'une Marque est cochée) ;
  - départ sans Marque (bouton « Entrer » de la feuille et « Partir » de la carte Donjon du Camp) : confirmation « Aucune Marque choisie — Sans Marque, cette descente ne comptera pas pour l'étape. », boutons « Choisir une Marque » (rouvre les Marques) et « Partir quand même ». Rien de bloquant.
- **B. PV bas à l'acceptation d'une étape de combat** (sous 50 %, une fois, jamais pendant une activité) : « Tes PV sont bas : repose-toi au feu ou mange une ration avant de partir. », boutons « Plus tard » et « Aller au feu ». L'étape reste acceptée. Le lancement de la quête liée garde l'avertissement du pronostic (sous 60 %).
- `modal.js` : la fenêtre de confirmation accepte une action facultative sur le bouton de refus.

## Contrôles
round-harness 7 030 OK, 0 échec (2 passes), dont la section [495] (28 contrôles) ; boot ; création du héros ; i18n 0 manquant, 0 orphelin ; parcours 235 OK.

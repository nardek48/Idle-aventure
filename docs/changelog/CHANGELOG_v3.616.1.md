# v3.616.1 — Correctif : la description du Terrain d'entraînement

Signalé par l'audit de la Forêt (v3.616.0), corrigé à la demande de Seb.

- La description du bâtiment disait « 10 niveaux de plus sur chacune des cinq caractéristiques ». Depuis la v3.614.0, la caractéristique de classe et l'Endurance montent au plafond du Terrain, les trois autres à 70 % de ce plafond : +10 et environ +7 par niveau (14 → 21 → 28).
- Nouveau texte (français et anglais) : « Chaque niveau ouvre 10 niveaux d'entraînement de plus pour ta caractéristique de classe et l'Endurance, environ 7 pour les trois autres. »
- Deux commentaires de code périmés (seuil à 10 au lieu de 20) corrigés dans `village-buildings.js` et `tutorial-view.js`.

## Contrôles
- round-harness : 5 822 OK, 0 échec, stable sur 2 passes. Nouvelle section [414] (texte et calcul du moteur).
- boot : 4 OK. Création du héros : 44 OK. Parcours : 142 OK.
- i18n : 100 %.

# Aethervale v3.429.8 — Pronostic des quêtes et chasses : les groupes comptent

Suite de la deuxième heure de jeu testée dans Chromium. S'applique sur la v3.429.7.

## Le constat
Avant une quête ou une chasse, l'écran « Avant de partir » comptait un groupe (meute, escouade) comme un seul ennemi. Pendant l'heure 1, un Rôdeur neuf a lu « Sans danger, ~1 round contre ~14 » avant la Meute affamée, puis il est mort deux fois.

## Le correctif
`CombatForecast.forMission` compte les combats de groupe (cible ÷ taille du groupe) et l'usure de chacun membre par membre, avec `getGroupAttrition` (v3.429.7, donjons). Les quêtes à un ennemi ne changent pas.

## Mesures (`tools/sim/plafond-bench.js --pronostic`, 20 runs, Chevalier / Rôdeur / Mage)
| Meute affamée · profil | Réussite réelle | Avant | Après |
|---|---|---|---|
| foretI, entraînement 0 | 0 / 0 / 0 % | Sans danger ×3 | Sans danger / Hors de portée / Hors de portée |
| foretI | 45 / 100 / 100 % | Sans danger ×3 | Sans danger ×3 |
| foretII (prévu) | 100 / 100 / 100 % | Sans danger ×3 | Sans danger ×3 |

Sans changement de verdict : Lisière, Dunes, Nuée. Le Trône de sable passe de « Sans danger » à « Abordable », toujours trop optimiste (0 à 50 % de réussite réelle).

Limites connues, non traitées ici :
- Chevalier : l'usure reste sous-estimée (le modèle suppose les compétences lancées à chaque round).
- Quêtes avec compagnons (Gouffre, Seigneur de guerre orc) : « Hors de portée » pour 50 à 100 % de réussite, car Wenna et Maddoc ne sont pas comptés.
- Trône de sable : mécaniques de Nezzam non modélisées.

## Outils
- `tools/sim/plafond-bench.js --pronostic` : verdict de `forMission` aussi pour les quêtes et les chasses.

## Code
- `js/systems/combat-forecast-system.js` : `forMission` compte les groupes.
- Aucun fichier protégé touché. Aucun fichier ajouté.

## Contrôles
- Round : **3 963 OK**, 0 échec, sur trois passages. Boot : 4 OK. Création du héros : 44 OK.
- Chromium : Rôdeur neuf face à la Meute → « Hors de portée » (avant : « Sans danger »). Console sans erreur.
- `node --check` sur tous les fichiers modifiés.

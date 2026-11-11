# v3.771.0 — Petites Aventures : tutoriel des petites quêtes du chemin (11/11/2026)

Demande de Seb (11/11, point e : le tutoriel des Petites Aventures n'avait pas suivi les mini-quêtes de la v3.724.0). Aucun fichier ajouté.

## Ce qui change
- `js/ui/tutorial-view.js` : tutoriel générique `pa2_quests` (« Les petites quêtes du chemin »), 5 points : la quête lancée par une rencontre et rappelée en haut ; le verrou (clé sur une case, dans une poche à part ; Ouvrir, Forcer, Rebrousser) ; la cache (annoncée à une halte, à deux pas au plus, retour par une trace claire gardée par une bête sans or) ; les passages secrets (fouille gratuite à l'arrivée, « ? » et « Chercher encore » à 10 de Souffle, torche et lanterne) ; les fins imposée et cachée.
- Il s'ouvre la première fois qu'une petite quête est lancée (cache annoncée, verrou, fin), qu'un verrou arrête le héros ou qu'un passage secret est trouvé ; jamais dans les parcours d'Histoire. Il rejoint le catalogue d'aide comme les autres.
- Traductions anglaises avec les termes déjà en usage (Breath, Force, Turn back, Search again).

## Mesures
- Rendu (Chromium) : 390 × 844, fenêtre de 763 px sans défilement ; 320 × 568, 515 px, défilement « Suite ↓ » du kit, rien ne déborde.

## Contrôles
- `round-harness` 7304 OK sur 3 passes ([520] nouveau) ; boot 4 OK ; création du héros 44 OK ; parcours P11 15 OK ; i18n 100 %.
- Quoi de neuf : une ligne (FR + EN).

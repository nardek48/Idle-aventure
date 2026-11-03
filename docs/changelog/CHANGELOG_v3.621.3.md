# v3.621.3 — Cartes vivantes : l'élite qui garde un secteur

Suite de l'audit narratif (remarques hors périmètre), décisions de Seb : 1 rien, 2 rien avec une note, 3 option B.

## Changement (3, option B)
- `js/data/story-quests.js` : les cinq tutoriels des cartes vivantes (forest_brume, Désert, Ruines, Crypte, Montagne) disaient seulement « tu libères un secteur en terminant sa Petite Aventure » (ou « son parcours »). Chaque carte a des secteurs gardés par une élite (Arbre-mère, Camp des toiles, Armure du serment, Dard des profondeurs, Golem de la tour, Pleureuse de la nef, Mère des dragonnets, Vieux golem) : ajout de « , ou en battant l'élite qui le garde. », rien d'autre.
- `js/lang/en.js` : traductions alignées.
- Harnais [416] : les 5 phrases citent l'élite ; contrôle dans les données que les cartes ont des secteurs à élite.
- Quoi de neuf : une ligne (FR + EN).

## Non modifié (décisions)
1. Codex « Le Village hors-Cycle » (« ceux qui ont choisi de ne pas Ascensionner ») : l'Ascension reste une notion du lore (bible : traversée volontaire de la boucle, le Veilleur, la Crypte) ; la fiche ne décrit pas une mécanique du joueur.
2. Codex « Donjon » (« cinq couches ») : le 6ᵉ donjon (Sommet interdit) est verrouillé ; les fiches disent déjà « on raconte » et « dernier Sceau connu ». À l'ouverture de la Tour : prévoir une fiche du sixième Sceau.

## Contrôles
- Harnais, parcours, boot, création du héros, i18n.

# Aethervale v3.447.0 — L'initiative

Idée de Seb : l'initiative pour tout le monde, à la manière de D&D. Décisions (docs/pistes-combat.md) : un jet par combat,
bonus de célérité ramené au monde, le combat s'arrête au tour du héros, bandeau validé dans `atelier/initiative.html`.
Modification de `combat-engine.js` (fichier protégé) avec l'accord de Seb.

## Ce qui change
- **Jet d'initiative** à l'ouverture de chaque combat : d20 + bonus de célérité (10 × c / (c + 60), jamais plus de +10).
  Héros : célérité ÷ multiplicateur d'équipement du monde ; compagnons et ennemis : célérité de leurs données.
  **Le Rôdeur lance deux dés** et garde le meilleur. Égalité : ton camp d'abord. Un renfort lance son dé à son arrivée.
- **Les tours suivent l'ordre** : ceux qui te précèdent jouent seuls, puis le combat s'arrête à ton tour (Tactique : ton
  choix ; Grimoire : tes règles, lues à ce moment-là). En Tactique, chaque compagnon a son propre tour.
- **Rythme** : un combattant toutes les 0,4 s (× vitesse) ; 1 s à l'ouverture pour voir les dés. Tes boutons attendent ton tour.
- **Bandeau d'initiative** (44 px sous la barre du haut) : portraits dans l'ordre avec le jet, le dé défile au début ;
  celui qui joue s'allume (bandeau, scène, carte), ceux qui ont joué pâlissent. Le jet est aussi écrit dans le journal.
- **Garde** : quand un ennemi joue avant toi, elle se décompte à ton tour suivant, pour couvrir son prochain coup.
- Fichier ajouté : `js/systems/initiative-system.js` (index.html et précache du service worker).

## Mesure (plafond-bench, 30 runs, ordre d'avant → initiative)
- Forêt : 100 % partout, PV restants −0 à −13 points. Serment et Dard inchangés.
- Cité (campagne) : Rôdeur 83 → 77 %, Mage 87 → 80 % ; Cité (fin) : PV −7 à −11 points.
- Nezzam (fin) : Rôdeur 33 → 23 %, Mage 53 → 40 % — livré tel quel (décision Seb), Nezzam reste à revoir.
- `plafond-bench` : option `--ordre-ancien` pour comparer.

## Contrôles
- `round-harness` : 4 192 OK, 0 échec (3 passes) ; contrôle [222] ajouté, ordre d'avant gardé pour les contrôles historiques.
- `parcours-harness` : 139 OK (2 passes) ; `boot` 4 OK ; `hero-creation` 44 OK ; i18n 100 %, 0 orphelin.

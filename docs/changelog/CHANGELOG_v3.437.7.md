# Aethervale v3.437.7 — Deux textes dans les fichiers protégés

Suite de la v3.437.5 (textes neutres) et de la v3.437.4 (coquilles). Accord de Seb pour toucher `combat-engine.js` et `dungeon-system.js` : une ligne chacun, texte seulement. S'applique sur la v3.437.6.

## Ce qui change
- **Journal de combat** (`systems/combat-engine.js`) : « Tu es réduit au silence ! Tes techniques sont bloquées {n} round(s). » → « Silence ! Tes techniques sont bloquées {n} round(s). » (tournure neutre).
- **Fin de donjon** (`systems/dungeon-system.js`) : « {x} terminé ! +{g} or » → « {x} : sortie terminée ! +{g} or », accordé quel que soit le nom du palier, comme dans `dungeon-view.js`.
- Traductions anglaises alignées.

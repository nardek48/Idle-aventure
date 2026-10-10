# Aethervale v3.438.2 — Sanctuaire scellé : quatre traits pour trois règles

Fin du premier passage de la refonte des traits ennemis des donjons (courbe B, v3.438.0). Le Sanctuaire n'affichait qu'un trait (Blindé) : une règle suffisait pour tout le donjon.

## Ce qui change
- **Encart « Ce que tu vas affronter »** (`ui/combat-forecast-view.js`) : les **escortes d'élites** comptent. Le Bâtisseur du Contremaître (Bouclier) était dans le run mais invisible ; idem pour toute élite escortée (donjons, quêtes, carte).
- **La Goule devient Vampirique** (`data/enemy-archetypes.js`, trait fixe) : partout, pas seulement au Sanctuaire.
- **Varrek devient Enragé** (`data/dungeon.js`), au lieu de Blindé ; puissance 0,72 → 0,58 pour le garder au niveau de la v3.431.0.
- Traits du Sanctuaire : **Blindé** (Gargouille, Contremaître, Golem), **Bouclier** (Bâtisseur), **Vampirique** (Goule), **Enragé** (Varrek). Plus la Relève, qui occupe aussi le Grimoire.

## Progression des donjons
| Donjon | Règles actives | Traits |
|---|---|---|
| Tanière du Basilic | 2 | Enragé, Corrupteur |
| Cité engloutie | 2 | Blindé, Enragé, Corrupteur |
| Sanctuaire scellé | 3 | Blindé, Bouclier, Vampirique, Enragé |

## Mesure (ruines-acte3-bench, 40 runs, Varrek vaincu)
| Palier | Chevalier | Rôdeur | Mage |
|---|---|---|---|
| Rare, avant (v3.431.0) | 75 % | 58 % | 79 % |
| Rare, Varrek Enragé à 0,72 | 75 % | 42 % | 67 % |
| **Rare, v3.438.2 (0,58)** | **80 %** | **55 %** | **83 %** |
| Acte II, avant → après | 54 → 48 % | 29 → 28 % | 67 → 75 % |

Goule Vampirique : bancs des actes I et II des Ruines (étapes 2, 3, 8, 10, où elle apparaît en groupe) inchangés à ±1 point.

## Contrôles
- `round-harness` : 4 119 OK, 0 échec (3 passes) ; 3 contrôles ajoutés au [154] (Bouclier par l'escorte, Goule, Varrek, 4 traits).
- Aucun fichier ajouté, aucun fichier protégé touché.

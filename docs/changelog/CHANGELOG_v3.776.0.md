# v3.776.0 — Simplification : les objets de combat contre les traits sont retirés (12/11/2026)

Décision de Seb (12/11), lot 2 de la simplification avant l'Alpha. Les objets refaisaient le travail du Grimoire (contrer les traits des ennemis) et en ajoutaient un par trait à apprendre et à fabriquer. Le robot n'en emportait que 17 sur toute une partie. **La Fiole noire reste** jusqu'aux Bénédictions de la faille. Pas de remboursement : les objets disparaissent de l'inventaire. Aucun fichier ajouté ni supprimé, aucun fichier protégé modifié.

## Ce qui change
- **Retirés** : Baume froid, Encens amer, Huile de lame, Sel de fer, Acide mordant, Pastille de miel, Leurre de cendre, Coin d'obsidienne, leurs 8 recettes de l'Apothicaire et leurs constantes (`data/combat-items.js`, `data/apothecary-recipes.js`).
- **Halte de donjon « Râtelier »** (un objet contre le trait du boss) : retirée (`data/dungeon.js`).
- **Préparation de sortie** : une seule place d'objet, la Fiole noire. La 2e place verrouillée (Apothicaire niveau 4) disparaît.
- **Pronostic et « Tout préparer »** : plus de « Ou emporte » ni d'objet proposé.
- **Systèmes** :
  - `combat-item-system.js` ne pose plus de contre ;
  - le Tri et la Carapace de la Montagne gardent leur valeur (`vein-system.js`) ;
  - le Silence garde ses 2 rounds (`enemy-archetypes.js`) ;
  - la réserve de contre du Grimoire n'est plus levée par un objet (`combat-auto-policy-system.js`).
- **Moteur de combat** (`combat-engine.js`, protégé) : il garde deux tests « l'objet tient-il ce trait ? », désormais toujours faux. Je ne l'ai pas modifié, aucun effet.
- **Textes** :
  - l'Apothicaire « prépare des potions et la Fiole noire » ;
  - l'aide de la préparation ne parle plus que de la Fiole ;
  - 23 traductions orphelines sont retirées de `en.js` ;
  - le journal de test ne note plus de contre d'objet.
- **Vieilles sauvegardes** : les objets en stock ne s'affichent plus nulle part ; un objet noté dans une sortie en cours est ignoré au chargement (filtre déjà en place).

## Mesure (robot, 3 parties complètes, une par classe)
| | Morts | Temps simulé |
|---|---|---|
| Avec les objets (lot du 12/11, v3.774.0) | 0 / 0 / 0 | 25,7 / 29,2 / 26,3 h |
| Sans les objets | 0 / 1 / 0 | 31,1 / 30,4 / 32,5 h |

- **Le Grimoire à 3 règles suffit** : aucun mur, toutes les parties vont au bout.
- **La seule mort** est celle du Rôdeur contre le Seigneur orc, en Forêt, où aucun objet n'était encore disponible : c'est l'aléa connu de ce boss.
- **Les heures en plus** viennent surtout de l'attente d'une place de Petite Aventure à tour_07 : 6,0 / 4,7 / 1,5 h. Cette attente existait déjà (10 parties sur 18 du lot du robot prudent).

## Contrôles
- `round-harness` 7261 OK, 0 échec. Les contrôles des objets retirés sont réécrits en contrôles de retrait : [215], [217], [218], [293], [319], [498]. [235], [236], [237], [341], [502] et [503] passent sur la Fiole noire.
- boot 4 OK ; création du héros 46 OK ; parcours complet 239 OK ; i18n 100 %, 0 orphelin.
- Quoi de neuf : une ligne (FR + EN).

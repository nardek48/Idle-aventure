# v3.533.0 — Alerte « au plafond » des seules ressources demandées (audit, lot 10 : RES-2)

Décision de Seb : option A du banc des débouchés (Entrepôt, Montagne).

## Le constat
En fin de partie, les ressources brutes restent au plafond en permanence (banc à la Montagne : 2 % de la production récoltée, plafond atteint 100 % du temps). L'Entrepôt affichait donc « 6 ressources au plafond » sans arrêt, y compris pour des ressources que plus rien ne demande : l'alerte ne disait plus rien.

## Ce qui change en jeu
- La ligne d'alerte de l'Entrepôt ne compte que les ressources au plafond qu'un coût encore ouvert demande :
  - prochain niveau d'un bâtiment du village débloqué ;
  - prochain niveau d'un bâtiment de production débloqué ;
  - ouverture, amélioration et aménagement des parcelles ouvertes.
- L'or n'entre pas dans le compte. Les plafonds, la production et les tuiles de l'Entrepôt ne changent pas.
- Village terminé : plus aucune alerte.

## Mesures (fins de partie au robot)
| | Avant | Après |
|---|---|---|
| Chevalier et Mage, brutes au plafond | 6 alertées | **4** (bois, pierre, fer, eau) |
| Village fini | 6 alertées | **0** |

Options écartées : B (charrette d'écoulement) déconseillée, C non préparée (elle rouvrirait RE-3), D non retenue.

## Code
- `ui/warehouse-view.js` : `warehouseOpenDemand`, utilisée par `buildWarehouseHTML`.
- Harnais [352], et [188] suit la nouvelle règle.
- Aucun texte nouveau, aucun état sauvegardé, aucun fichier protégé ni ajouté.

## Contrôles
- Round : 5 355 OK, 0 échec, sur deux passes.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 6 591 textes, 100 %, 0 orphelin.
- Chromium à 390 px : fin de partie, « 4 ressources au plafond » ; brutes au plafond sans demande, aucune alerte ; village fini, aucune alerte ; 0 erreur.

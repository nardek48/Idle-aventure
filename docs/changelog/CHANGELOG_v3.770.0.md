# v3.770.0 — Forge 9 de la Tour : Givre bleu et Verre de faille fermés avant tour_06 ; deux points clos (11/11/2026)

Demande de Seb (11/11 : « ok pour tes recommandations », points a, b, c). Aucun fichier ajouté au jeu.

## a. Forge 9 de la Tour (audit A, MES-6, reste)
- Constat : la Forge 9 demande des Verres de faille, faits de Givre bleu à l'Atelier (ouvert) ; aucune source de Givre avant tour_06. La correction de la v3.754.0 ne regardait que les ateliers fermés : la Forge 9 paraissait à portée.
- `getResourceStoryLock` (`village-building-view.js`) : une ressource brute peut déclarer `openAtStoryStep` (Givre bleu : tour_06, `warehouse-resources.js`) ; un matériau fabriqué dont un ingrédient est encore fermé l'est aussi (Verre de faille). Le matériau est introuvable, l'aide dit « S'ouvre avec l'Histoire : « La rue qui tient » ».
- L'aide du Givre n'annonce plus de butin de « combats » (il n'en existe pas dans le code) ; traduction anglaise mise à jour.

## b. « Accepter » à crypte_12 sur iPhone SE : clos sans changement
- Mesuré dans le vrai jeu (Chromium, 320 × 568, texte Normale) : bas du bouton à **12 px au-dessus** de la barre du bas (6 px en v3.707.0) ; ruines_08 et forest_02 : 27 et 29 px. Bouton visible et touchable.

## c. Mage sur « Les pentes » : clos
- Robot, 54 parties (lots v3.765.0 à v3.768.0) : aucune mort ; coût médian Mage 67 % des PV, Chevalier 68 %, Rôdeur 36 %.

## Contrôles
- `round-harness` 7298 OK sur 3 passes ([519] nouveau) ; boot 4 OK ; création du héros 44 OK ; parcours P11 15 OK ; i18n 100 %.
- Quoi de neuf : une ligne (FR + EN).

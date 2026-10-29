# v3.551.0 — La caravane d'essai de l'Histoire

Retour de Seb, point 2 : aux étapes ruines_04 et crypte_04, il n'y avait rien d'autre à faire qu'attendre la caravane (1 h au plus court).

## Règle
- Tant que l'Histoire attend la caravane d'un marché (Ruines, Crypte), la feuille Caravane propose une **caravane d'essai** vers ce marché.
- Elle part à vide, rien ne quitte l'Entrepôt, et revient en **10 minutes**.
- Elle ne rapporte rien.
- Elle **ne prend pas de place** : elle part même si toutes les caravanes sont sur les routes.
- À son retour, il faut la décharger, comme toute caravane. Cela valide l'étape (`ruinsMarketDone`, `cryptMarketDone`).
- Une fois le marché ouvert, l'essai n'est plus proposé. Les caravanes ordinaires restent possibles vers ce marché, et une caravane ordinaire valide aussi l'étape.
- Le suivi de l'étape indique « Caravane d'essai prête : 10 minutes, depuis Campement › Expéditions ». Le tutoriel de l'étape la présente.
- La Halle marchande reste nécessaire.

## Fichiers
- `js/systems/caravan-system.js` : trajet `essai` (`story: true`, hors `CARAVAN_TRIP_ORDER`), `CARAVAN_STORY_FLAGS`, `isStoryTripFor`, `_regularCount`. Les places ne comptent que les caravanes ordinaires.
- `js/ui/caravan-view.js` : bloc `buildCaravanStoryHTML`, `departStoryCaravan`, vues « en route » et « rentrée » de l'essai.
- `js/data/story-quests.js` : suivi de ruines_04 et crypte_04, tutoriels des deux étapes.
- `js/lang/en.js` : 9 textes, dont 2 remplacés.
- `tools/sim/campagne-harness.js` : le robot envoie la caravane d'essai.
- `tools/harness/round-harness.js` : contrôle [368].

Campagne (Mage) : ruines_04 et crypte_04 passent de 1,0 h à 0,2 h chacune ; attente « caravane » de 2,0 h à 0,3 h ; 101 étapes réussies, 19,1 h.

Aucun fichier ajouté.

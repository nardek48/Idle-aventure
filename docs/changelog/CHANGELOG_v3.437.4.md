# Aethervale v3.437.4 — Textes : coquilles relevées au rejeu

Relevés au rejeu des 4 premières heures. Décision de Seb : corriger les textes, en commençant par ceux qui ne demandent pas de choix. S'applique sur la v3.437.3.

## Ce qui change
- **Grimoire** : « Si il va te silencer » → « Si l'ennemi va te museler » ; « Si il frappe 2 fois » → « Si l'ennemi frappe 2 fois ».
- **Pronostic** : « ~1 rounds » → « ~1 round » (pluriel selon le nombre).
- **Carte vivante** : « La tour de guet est libéré. » → « Libéré : La tour de guet. » (les secteurs ont les deux genres).
- **Bilan de donjon** : « Tanière du Basilic interrompu » → « Tanière du Basilic : sortie interrompue » (et « : sortie terminée ! »).
- **Coût d'une expédition** : « Il te manque 2 Outre pleine » → « Il te manque Outre pleine ×2 » ; même forme pour « consomme » et pour les rations de la carte.
- **Histoire** :
  - desert_12 : « Il ne regarde pas toi » → « Il ne te regarde pas » ;
  - desert_13 : « La lame sort du feu… sur le tranchant » → « L'arme sort du feu… sur le métal » (le Rôdeur porte un arc).
- **Tutoriel Village & Production** (erreur factuelle) : « dépensée ou vendue » → « dépensée (l'Entrepôt ne rachète rien) ».
- Traductions anglaises mises à jour.

## Non traité
- `systems/dungeon-system.js` (protégé) garde « {x} terminé ! +{g} or » dans son toast de fin : accord à revoir avec l'accord de Seb.
- Accords au masculin adressés au héros et dialogues de Wenna restée à la Borne : décision de Seb à venir.

## Code
- `js/ui/grimoire-view.js`, `js/ui/combat-forecast-view.js`, `js/ui/dungeon-view.js`, `js/ui/scene-view.js`, `js/ui/tutorial-view.js`, `js/systems/living-map-system.js`, `js/data/story-quests.js`, `js/lang/en.js`.
- Aucun fichier ajouté.

## Contrôles
- Chromium : rendu des nouveaux libellés (Grimoire, pronostic à 1 et 3 rounds, carte, donjon, coût).
- Round : 4 114 OK, 0 échec. Boot : 4 OK. i18n : 100 %, aucun orphelin.

# v3.778.0 — Simplification : les contrats de la Taverne passent au tableau des missions (12/11/2026)

Décision de Seb (12/11, option A), lot 4 de la simplification avant l'Alpha. Les contrats avaient leur propre liste dans la fiche de la Taverne, un deuxième tableau à côté de celui des missions. Ils deviennent des missions du tableau, livrées sur place. Aucun fichier protégé modifié, aucun changement de sauvegarde (`game.tavern` inchangé), aucun fichier ajouté ni supprimé.

## Ce qui change
- **Tableau des missions** (`systems/mission-board-system.js`) :
  - `_tavernMissions()` : chaque contrat non honoré devient une mission `sourceKind: "tavern"` (lieu « Taverne », objectif « Livrer N ressource », paie avec Campement tenu et Grand Ouvrage) ;
  - prête à livrer quand le stock suffit, sinon « Il manque N ressource » ; pas d'acceptation, hors du plafond des 3 quêtes actives ;
  - visible dans tous les mondes, comme le village ; un contrat honoré quitte le tableau jusqu'au renouvellement.
- **Écrans** :
  - Quêtes › Annexes accueille les contrats (`ui/quests-view.js`) ;
  - le bouton dit « Livrer » au lieu de « Réclamer », au tableau et au Camp (`claimLabel`, `ui/camp-view.js`).
- **Fiche de la Taverne** (`ui/village-building-view.js`) : la liste devient un résumé (contrats ouverts, or à gagner, livrables, renouvellement) et un lien « Voir les contrats au tableau des missions ». Les niveaux donnent toujours plus de contrats, mieux payés.
- **Fil rouge** (`systems/fil-rouge-system.js`) :
  - « Livrer à la Taverne » mène au tableau ;
  - un contrat livrable ne passe pas pour un « Réclamer » urgent : il garde son étape non urgente.
- **Tutoriel** « Les contrats de la Taverne » : 2 points réécrits (contrats au tableau, contrat honoré retiré). L'écran de retour garde « Tout livrer ».
- **Traductions** : 9 textes nouveaux traduits, 5 orphelins retirés de `en.js`.

## À signaler
La description de la Taverne cite encore « la caravane de la Halle » : elle sera revue avec le lot 6 (caravanes).

## Contrôles
- `round-harness` 7234 OK, 0 échec, sur 2 passes. [59b] vérifie la mission (paie majorée, bouton « Livrer », or versé, mission retirée, résumé de la fiche, catégorie Annexes).
- boot 4 OK ; création du héros 46 OK ; parcours complet 239 OK ; i18n 100 %, 0 orphelin.
- Capture à taille iPhone : carte « Livrer » et carte « Il manque », fiche résumée.
- Quoi de neuf : une ligne (FR + EN).

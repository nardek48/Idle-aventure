# Aethervale v3.440.0 — La préparation de sortie

Idée de Seb : préparer chaque sortie comme une Petite Aventure, et rassembler au départ les réglages éparpillés dans les onglets et sur l'écran de combat. Prototype validé dans `atelier/preparation-sortie.html`.

## Ce qui change
- **Feuille « Préparer la sortie »** avant chaque sortie de combat : chasse (et « Chasser à nouveau »), quête d'aventure, donjon (fiche ou tableau), élite de carte. Jamais avant un combat isolé. Les Petites Aventures et le Labyrinthe gardent leur propre préparation.
  - **Mode de combat**, Tactique ou Grimoire, **figé jusqu'au retour au Campement**.
  - **Règles du Grimoire** : les règles actuelles ou un preset, chargé à « Partir ».
  - En Grimoire : **Cible** et **potion automatique**.
  - **Équipe** : deux compagnons au plus (un compagnon en patrouille est grisé). Comportement de soin de Wenna ; voie de Maddoc en lecture (elle reste payante à sa fiche, décision D4b inchangée).
  - **Potions** : stock de soin (2 par sortie) ; potions à bonus à boire au départ, bues à « Partir ».
  - Sans rien à choisir (Grimoire fermé, ni compagnon ni potion à bonus), la sortie part directement.
- **Écran de combat** : la rangée Tactique | Grimoire disparaît. « Continuer » (Tactique) et la vitesse (Grimoire) passent en pastille dans la barre du haut. La scène gagne **41 px** (mesuré dans Chromium, 390 × 844 : 513 → 554 px en Grimoire).
- **Onglets** : le mode se lit dans le Grimoire et les Paramètres, il ne s'y change plus. Cible et potion automatique quittent le Grimoire ; « Avec toi / Au camp » et le comportement de Wenna quittent la fiche du compagnon.

## Choix d'intégration
- La feuille reprend le kit du jeu (feuille du bas parchemin, rails `.kseg`, blocs `.cp-behavior`) plutôt que le fond sombre du prototype.
- Pas de bouton « Comme la dernière fois » : mode, équipe et réglages sont déjà gardés d'une sortie à l'autre ; seules les potions à bonus sont à recocher. Aucun nouvel état sauvegardé, `save-system.js` non touché.

## Fichiers ajoutés (index.html + précache de sw.js)
- `js/ui/sortie-prep-view.js`
- `css/04-panel-sortie-prep.css`

## Contrôles
- `round-harness` : 4 129 OK, 0 échec (3 passes). Contrôle [214] ajouté ; contrôles de la fiche compagnon, du Grimoire, des Paramètres et de la bande Grimoire mis à jour vers la préparation.
- `parcours-harness` : 139 OK, 0 échec. `boot-harness` 4 OK, `hero-creation-harness` 44 OK.
- Traductions : 100 %, 0 orphelin (anglais : sortie = run, glossaire).
- Aucun fichier protégé modifié.

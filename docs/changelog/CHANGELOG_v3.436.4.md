# Aethervale v3.436.4 — Ruines : les Petites aventures d'Histoire des actes III et IV sont offertes

Bug relevé au rejeu des 4 premières heures (Rôdeur, Chromium 390 × 844). Décision de Seb : bug 1 du rapport. S'applique sur la v3.436.3.

## Le constat
- La règle de la v3.429.23 (Petite aventure offerte quand l'étape demande de libérer un secteur) ne couvrait que Ruines 6 et 7. Les actes III et IV sont arrivés après (v3.430 à v3.433), sans la donnée.
- « La porte qui descend » (ruines_11, « Libérer la porte du Sanctuaire ») et « La carte qui manque » (ruines_16, « Tenir les 3 quartiers qui touchent le Cœur ») prenaient donc une place de la réserve.
- En jeu : après 4 quartiers facultatifs, refus « Prochaine expédition dans 2 h 50 » sur l'étape d'Histoire. Pour ruines_16, les quartiers déjà libérés peuvent avoir été repris par la ville entre-temps.

## La correction
- Les deux étapes portent `storyPa: { worldId: "ruins" }`, comme Ruines 7 et le Désert.
- Règle inchangée : départ offert vers un secteur des Ruines pas encore libéré ; rejouer un secteur libéré reste payant.

## Code
- `js/data/story-quests.js` : `storyPa` sur ruines_11 et ruines_16.
- Aucun fichier ajouté.

## Contrôles
- Chromium (390 × 844), sauvegardes du rejeu, réserve vidée à la main :
  - ruines_11 : la porte du Sanctuaire et tous les quartiers non libérés partent ; les quartiers libérés gardent leur refus d'origine ;
  - ruines_16 : la place aux étals et la rue qui tourne (voisines du Cœur, reprises) partent.
- Round : 4 113 OK, 0 échec, sur deux passes. Boot : 4 OK.

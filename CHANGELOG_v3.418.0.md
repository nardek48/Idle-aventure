# Aethervale v3.418.0 — Équilibrage du Village (lot E-1)

Décisions de Seb du 01/10/2026 (R1 et R4). S'applique sur la v3.417.0.

## Ce qui change
- **Taverne** :
  - s'ouvre à l'**Atelier niveau 2** (avant : Atelier 4) ;
  - **2 contrats dès le niveau 1**, puis +1 par niveau, **6 au niveau 5** (avant : 1 → 5).
- **Halle marchande** : s'ouvre à l'**Atelier niveau 2** (avant : Atelier 4). Elle accueillera la Caravane (R3, prochain lot).
- **Production −20 %** sur **Blé, Viande, Eau et Pierre** (Champs, Chasse, Puits, Carrière). Bois et Fer sont inchangés.
  - L'aperçu « Niveau N+1 » de la fenêtre d'une zone affiche le débit réduit.
  - La récolte hors ligne suit le même débit.

## Pourquoi
Mesures du robot de campagne : en fin de Désert, Viande, Blé, Eau et Pierre plafonnent à 500. Seule une petite part sert :
- Blé 13 % ;
- Viande 21 % ;
- Eau 12 % ;
- Pierre 8 %.

À l'inverse, Bois (56 %) et Fer (97 %) sont bien consommés : on n'y touche pas.
Le banc `sim/village-economy-bench.js` est périmé (il répond « jamais » partout). Je ne m'en suis pas servi.

## Technique
- `production-plots.js` : propriété `rateMult: 0.8` sur farm, hunt, quarry et well.
- `production-plots-system.js` : `getPlotRatePerMin(index, plot, buildingId)` applique `rateMult`. Le débit total, le tick et le rattrapage hors ligne passent le bâtiment.
- `production-view.js` : l'aperçu de la fenêtre de zone passe le bâtiment.
- `village-buildings.js` : `rank: 2` pour la Taverne et la Halle.
- `tavern-system.js` : `getSlotCount` = niveau + 1, plafonné à 6.
- Aucun nouveau texte : « N contrats simultanés » existait déjà. La description de la Taverne (« seul débouché du surplus ») sera revue avec la Caravane.

## Fichiers protégés
Aucun.

## Harnais
- Contrôles Taverne et Halle passés à l'Atelier 2 ; nombre de contrats 2 / 3 / 6.
- Nouvelle section **[190]** : ouverture à l'Atelier 2, contrats 2 → 6, −20 % sur les quatre bâtiments, Bois et Fer inchangés.
- Résultats : round **3 711 OK** (deux passages), boot 4, création 44, parcours 139, campagne 38, i18n **100 % (3 719 textes, 0 orphelin)**.

## À tester en jeu
- Avec l'Atelier au niveau 2, la Taverne et la Halle sont constructibles.
- Taverne niveau 1 : deux contrats affichés.
- Ouvrir la fenêtre d'une zone des Champs : le débit affiché est plus bas qu'avant.

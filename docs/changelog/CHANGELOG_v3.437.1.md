# Aethervale v3.437.1 — Bulle de talent : pas avant l'ouverture des talents

Bug relevé au rejeu des 4 premières heures. Décision de Seb : bug 3 du rapport. S'applique sur la v3.437.0.

## Le constat
- La bulle « Un point de talent à placer » s'affichait dès qu'un talent était achetable (niveau 5, en Forêt).
- L'onglet des talents ne s'ouvre qu'à l'étape « L'éveil des talents » (forest_11). Avant, toucher la bulle (`switchTab('talents')`) retombait sur le Campement : rien ne se passait.

## Ce qui change
- La bulle n'apparaît qu'une fois l'onglet des talents ouvert par l'Histoire. Ensuite, comme avant : elle mène à Héros › Talents.

## Code
- `js/ui/hud-dock-view.js` : `hudDockItems()` teste `isTabUnlocked("talents")`.
- `tools/harness/round-harness.js` : le contrôle des bulles ouvre l'onglet des talents, et vérifie l'absence de bulle quand il est fermé.
- Aucun fichier ajouté.

## Contrôles
- Chromium (390 × 844), sauvegarde du harnais de campagne à l'entrée de forest_11 (niveau 6, 5 points) : onglet fermé → pas de bulle talent ; étape acceptée, onglet ouvert → bulle présente, elle ouvre Héros › Talents (« 5 points à placer »).
- Round : 4 114 OK, 0 échec, sur deux passes (un contrôle ajouté). Boot : 4 OK. i18n : 100 %.

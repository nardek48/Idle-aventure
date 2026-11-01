# v3.609.0 — Le Grand Ouvrage automatique (chantier surproduction, option C)

## Le relevé (banc, 01/11)
- Village au plafond de son monde : les 6 matières brutes restent pleines 100 % du temps, dans les 5 mondes. Les zones produisent 30 à 50 fois ce qui est récolté.
- Le village d'un monde se paie en moins d'une demi-journée de production des zones (`tools/sim/production-monde-bench.js`).
- Option B (baisser le débit des zones) abandonnée : elle n'agit qu'en divisant le débit par 10 à 20, ce qui casserait le début de partie (scénarios L35/L20/L10/D10/D20/D30 de `debouches-bench.js`).

## Option C, choisie par Seb
- **Versement automatique** : au-delà d'un seuil du plafond, chaque matière brute part au Grand Ouvrage dès qu'elle entre à l'Entrepôt (`WarehouseManager.addResource` → `GrandOuvrage.autoAbsorb`). Rien n'est perdu ; la réserve protégée reste.
  - Seuil réglable de 70 à 95 %, 80 % par défaut, avec un interrupteur dans la fiche du Grand Ouvrage.
  - Aucun achat ne demande plus de 62 % du plafond d'une matière brute : un seuil de 70 % minimum ne bloque donc aucune construction.
  - Tant que le versement est actif, la place libre d'une matière brute est infinie (`getFreeSpace`). Une récolte vide donc les zones.
- **Paliers à +18 %** au lieu de +12 %. Les parties en cours gardent leur palier et leur avancée : les points sont convertis une fois, marqueur `v: 2`.
- **Ouvert dès le Désert** au lieu des Ruines.
- Banc (Montagne, 9 jours) : rien n'est perdu, et l'or passe de 25 900 à 32 600 par jour.

## Fichiers
- `js/systems/grand-ouvrage-system.js`, `js/systems/warehouse-system.js`, `js/ui/grand-ouvrage-view.js`, `css/04-panel-village.css`, `js/lang/en.js`, `js/ui/news-view.js`.
- État : `game.village.grandOuvrage = { points, v, auto, seuil }`. `game.village` est sauvegardé tel quel.

## Contrôles
- round-harness : 5 752 OK, 0 échec, sur 2 passes. Nouvelle section [404] ; [376] mise à jour (+18 %, ouverture au Désert).
- boot : 4 OK. Création du héros : 44 OK. Parcours : 142 OK.
- i18n : 100 %.
- Aucun fichier ajouté, aucun fichier protégé modifié.

# Aethervale v3.448.3 — Images allégées : premier chargement 3,4 s plus court

Suite de l'audit du 11/10 (images trop lourdes). Validé par Seb. S'applique sur la v3.448.2.

## Ce qui change
- **Écran titre et barre d'onglets en WebP** (fichiers ajoutés, les PNG restent en place) :
  | Image | Avant | Après |
  |---|---|---|
  | `TitleScreen/title_background_new` (1536 × 2752) | PNG 5,5 Mo | WebP 211 Ko |
  | `TitleScreen/titre_logo` (affiché à 300 px au plus) | PNG 1 Mo, 1319 px | WebP 64 Ko, 1000 px |
  | `Borders/menu-bar-gold` (affichée à 430 px au plus) | PNG 8,9 Mo, 4064 px | WebP 231 Ko, 2032 px, même ratio |
- **Huit JPG recompressés sur place** (mêmes chemins, mêmes dimensions, qualité 90, progressifs) : fonds de combat Forêt, Ruines, Crypte, Tour, Montagne, Désert ; Mage corrompu, Gardien. 18,2 Mo → 3,4 Mo.
- Fidélité mesurée (PSNR, image composée sur fond pour la transparence) : 38 à 41 dB pour les WebP, 37 à 42 dB pour les JPG. Aucune différence visible en capture.
- La carte du monde (`world_map.jpg`, 1,5 Mo) n'est pas touchée : le gain était faible.

## Mesure (Chromium, 390 × 844, 4G simulée 9 Mbit/s et 150 ms, CPU ×4, premier chargement)
| | Avant | Après |
|---|---|---|
| Fin du chargement | 11,4 s | **8,0 s** |
| Octets transférés | 11,2 Mo | **5,0 Mo** |
| dont images | 7,2 Mo | **0,95 Mo** |

Le reste du temps tient aux 178 scripts (latence) : piste suivante possible, hors de cette version.

## Fichiers
- **Ajoutés (images, non précachées comme les autres images)** : `images/TitleScreen/title_background_new.webp`, `images/TitleScreen/titre_logo.webp`, `images/Borders/menu-bar-gold.webp`.
- Références basculées : `index.html`, `css/02-layout.css`, `css/08-desktop.css`, `js/ui/modal-view.js`, `js/ui/title-screen-view.js`.
- **Les trois PNG d'origine restent publiés** : une PWA encore sur l'ancienne version peut les demander. À supprimer dans une version suivante.
- `tools/harness/round-harness.js` : contrôle du chargement passé au WebP ; section [227] (plus de référence aux PNG lourds, poids des nouveaux fichiers et des JPG).
- Aucun fichier protégé, aucun JS/CSS ajouté.

## Contrôles
- Round : **4 228 OK**, 0 échec, sur trois passes. Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- `missing-icons.js` : aucune nouvelle absence (les 6 icônes d'objets de combat restent à dessiner).
- Chromium : écran titre, Campement et barre d'onglets capturés ; aucune réponse en erreur, aucune erreur de page.

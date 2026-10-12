# Aethervale v3.448.10 — Icônes allégées, texte de la Clé de voûte

Fin des points de l'audit du 11/10. Demandé par Seb. S'applique sur la v3.448.9.

## Images (128 → 89 Mo)
- **79 icônes surdimensionnées ramenées à 384 px au plus** (elles faisaient 600 à 850 px) : équipement, ressources, attaques spéciales, élites, onglets, hauts faits. Mêmes chemins, même format PNG.
  - Mesuré dans Chromium : la plus grande icône s'affiche à 86 px environ, soit 260 px sur un écran ×3 ; 384 px laisse de la marge.
  - 45,7 → 20,0 Mo sur ces fichiers (par exemple, une icône d'équipement légendaire : 840 → 310 Ko).
- **Trois anciens PNG supprimés** (15,4 Mo), remplacés par du WebP depuis la v3.448.3 et plus cités nulle part : `Borders/menu-bar-gold.png`, `TitleScreen/title_background_new.png`, `TitleScreen/titre_logo.png`.
- JPG des ennemis et des boss : déjà compressés raisonnablement (gain sous 25 %), laissés tels quels. Portraits de héros : non réduits (affichés en grand à la création).

## Texte
- Provenance de la Clé de voûte : « Pierres errantes et Pierre taillées au Tailleur de pierre (Carrière) » → « Se taille au Tailleur de pierre (Carrière), à partir de Pierres errantes et de Pierre » (même forme que l'Acier). Traduction anglaise alignée.

## Contrôles
- Chromium : barre d'onglets identique à l'œil (écart de rééchantillonnage seulement), icônes du combat nettes. `missing-icons.js` : inchangé (les 6 icônes d'objets de combat).
- `tools/harness/round-harness.js` : section [234] (3 contrôles).
- Round : **4 264 OK**, 0 échec, sur trois passes. Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK. i18n : 100 %, 0 orphelin.
- Aucun fichier ajouté, aucun fichier protégé touché.

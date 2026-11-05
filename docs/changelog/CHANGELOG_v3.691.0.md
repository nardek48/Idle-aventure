# v3.691.0 — Images et premier lancement (audit du 04/11, lot A3)

Le premier lancement et les écrans illustrés pèsent moins lourd, sans perte visible. Les images d'interface sans perte sont ré-encodées, les icônes de l'application sont allégées et la barre d'onglets est ramenée à une taille utile. Les bandeaux ont une variante téléphone, et les petits portraits de héros et de compagnons passent par une vignette. Le dictionnaire anglais n'est plus précaché chez les joueurs francophones. Aucune règle de jeu ni aucun chiffre d'équilibrage n'a changé.

Mesures dans Chromium (390 × 844 @3x, serveur de type GitHub Pages, cache vide) :

| | Avant (v3.690.0) | Après |
|---|---|---|
| Transféré au premier lancement (titre + précache) | 2 821 Ko | **2 211 Ko** (−610 Ko) |
| Dont transféré avant l'écran titre | 2 146 Ko | 2 013 Ko |
| Écran titre en 4G lente (CDP 150 ms, 1,6 Mb/s, CPU ×4) | 11,3 s | 11,2 s (2 relevés) |
| Voile levé / service worker en place (4G lente) | 12,8 s / 13,8 s | 12,7 s / 13,1 s |
| Précache de `sw.js` | 273 entrées, 2 155 Ko gzip | 272 entrées, **1 679 Ko** gzip (−476 Ko) |
| Images jusqu'au Camp, premier lancement | 2 889 Ko | **2 107 Ko** (−782 Ko) |
| Images d'une session complète (11 écrans + combat) | 9 478 Ko | **7 207 Ko** (−24 %) |

L'écran titre ne gagne presque rien en 4G lente : il attend surtout les 1,2 Mo de JS (PERF-7, non traité ici).

- **PERF-9** : les 27 images d'interface en WebP sans perte sont ré-encodées en WebP avec perte, sous les mêmes noms et aux mêmes dimensions. La transparence est gardée à l'identique (alpha sans perte). La qualité 88 suffit pour 23 d'entre elles ; 4 petites images passent en qualité 95 (badge, boutons rectangulaires, niveau du héros) pour rester au-dessus de 38,5 dB. Comparaison au pixel avec l'original : 38,5 à 53,5 dB. Total : 2 561 → 583 Ko. Exemples : `ecrantext2` 217 → 19 Ko, `bg-moss-stone` 312 → 55 Ko. Fichiers : `images/UI/**` (badges, boutons, cadres, jauges, emplacements, textures) et `images/Borders/` (`ecrantext2`, `affichage-des-stats`, `niveau-hero`).
- **PERF-12** : `images/Borders/menu-bar-gold.webp` passe de 2 032 à 1 536 px (même ratio 4064/971), 231 → 128 Ko. Taille d'affichage maximale mesurée : 1 158 px à 390 @3x, 1 277 px à 430 @3x, 1 376 px sur une tablette 13 pouces en colonne (1 032 × 1 376 @2). Sur PC, la barre devient une colonne sans cette image. Le rapport proposait 1 280 px, ce qui reste sous 430 × 3 = 1 290 px. Le commentaire de `css/02-layout.css` est mis à jour.
- **PERF-14** : les icônes PNG de l'application ont une palette refaite sans tramage, puis sont optimisées (oxipng). Mêmes dimensions, écart de 42 à 44 dB. `favicon-32` est seulement optimisé (sans perte). Total : 321 → 139 Ko. Fichiers : `images/Icons/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`, `favicon-32.png`.
- **PERF-13** : `js/lang/en.js` (≈ 300 Ko gzip, modifié à chaque version) sort du précache. Les joueurs francophones ne le téléchargent plus, ni à l'installation ni à chaque mise à jour.
  - La page en anglais demande au service worker de le garder dans le cache de la version : à l'enregistrement, à la prise de contrôle, puis après une mise à jour. Le service worker n'accepte que ce fichier (`LANG_EN_URL`).
  - Au passage du français à l'anglais, `I18n.setLang` charge `en.js` avant la relance.
  - Vérifié dans Chromium. En anglais : `en.js` est en cache, et la relance hors-ligne s'affiche en anglais (« Continue »). En français : `en.js` n'est jamais demandé, et le cache a 272 entrées.
  - Limite : passer en anglais **hors-ligne** pour la première fois reste en français jusqu'au prochain lancement en ligne (avant, `en.js` était toujours en cache).
  - Fichiers : `sw.js`, `js/main/pwa.js`, `js/core/i18n.js`. Contrôles [224] et [228] adaptés.
- **PERF-10** : chaque bandeau d'écran a une variante téléphone de 1 350 × 450 px (qualité 85), dans `images/Banners/phone/`. L'image entière de 2 172 px reste pour les grands affichages.
  - Le choix suit la taille réelle : largeur utile en `cover` (max(largeur, 3 × hauteur)) × `devicePixelRatio`. En dessous de 1 350 px, la variante est utilisée ; au-delà, l'image entière.
  - Relevés : téléphone 390 et 430 @3x → variante (1 350 px utiles). PC 1 280 et 1 920 @1 → variante (804 et 1 277 px). Tablette 820 @2 → variante (1 215 px). PC 1 440 @2, tablette 1 032 × 1 376 @2 et tablette paysage → image entière (1 440 à 1 938 px).
  - 6 042 → 3 780 Ko pour les 27 bandeaux (−37 % par bandeau affiché).
  - `js/ui/screen-banner.js` (`setImage`, choix refait par `fit` au redimensionnement).
- **PERF-11** : vignettes de 256 px (petit côté) pour les 12 portraits de héros et les 5 compagnons, dans `images/Heroes/vignettes/` et `images/Companions/vignettes/`. Elles reprennent la convention des vignettes d'ennemis (v3.527.0).
  - Utilisées seulement là où le portrait s'affiche en petit : 135 px physiques au plus, mesurés sur téléphone, PC @2 et tablette. Cela couvre le portrait du HUD, le mini-héros, les cartes et lignes du combat, l'équipe et les compagnons du Camp, et les compagnons de l'écran Héros.
  - Si une vignette manque, le portrait entier sert de repli (`data-full`, déjà géré par `onMissingImage`). Vérifié dans Chromium avec une vignette en 404 : le HUD retombe sur `knight_m.webp`, sans boucle au rendu suivant.
  - Les deux icônes de ressources de 400 px (`cendre_vive_icon`, `obsidienne_taillee_icon`) passent à 256 px, comme les 29 autres (affichage maximal mesuré : 68 px). 101 → 44 Ko.
  - Exemple en combat : Sarkel, 66 → 30 Ko.
  - Fichiers : `js/core/utils.js` (`smallPortrait`, `smallPortraitHTML`, `setSmallPortrait`), `js/ui/hud-view.js`, `js/ui/combat-screen-view.js` (`ico`), `js/ui/camp-view.js`, `js/ui/heros-screens-view.js`.
- **PERF-18** : `loading="lazy" decoding="async"` sur les icônes des traits du héros (Héros, volet « Ce que tu portes »). Mesuré : 599 → 374 Ko téléchargés à l'ouverture de l'écran Héros. Également essayé sur les scènes de la ligne de production du Village et sur les cartes des Hauts faits : aucun gain mesuré (images dans le seuil de chargement de Chromium), donc retiré. `js/ui/heros-screens-view.js`.
- Gain total sur les images remplacées (35 fichiers, mêmes noms) : 3,14 → 0,87 Mo, soit **−2,26 Mo**. Les originaux sont gardés hors dépôt.
- « Quoi de neuf » : une ligne (FR + EN). `tools/harness/round-harness.js` [456] : 16 contrôles.

**Fichiers ajoutés (44 images, toutes chargées à la demande, donc non précachées)** :
- `images/Banners/phone/*.webp` : 27 fichiers, un par bandeau, mêmes noms.
- `images/Heroes/vignettes/*.webp` : 12 fichiers.
- `images/Companions/vignettes/*.webp` : 5 fichiers.

Aucun fichier JS ou CSS ajouté, aucune image supprimée, aucune image empruntée.

À signaler (non corrigé) : le portrait du héros en tête de l'écran Héros (`hs-banner-img`) s'affiche à 1 026 px physiques à 390 @3x pour une image de 546 px. Il est donc agrandi environ 1,9 fois : c'est une image trop petite pour son affichage, pas un doublon.

Laissés :
- PERF-7 option B (retirer les commentaires de la copie publiée, −348 Ko gzip) : à trancher par Seb. Le regroupement des scripts est exclu (décision O6).

Contrôles : `node --check` sur chaque JS modifié ; round 6 391 OK, 0 échec (2 passes) ; boot 4 OK ; création 44 OK ; i18n 8 455 textes, 100 %, 0 orphelin ; parcours 212 OK. Aucun fichier protégé touché.

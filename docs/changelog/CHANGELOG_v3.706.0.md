# v3.706.0 — Atelier 4 « Signaux » : variantes A (choix de Seb du 05/11)

Intégration de l'atelier `atelier/signaux.html` (EQUI-2, CPL1-2, UI-18, SUIV-8), variante A partout, plus la barre de titre des pages sans bandeau signalée en v3.705. Aucun fichier protégé touché. Aucun état sauvegardé nouveau. Aucun fichier ajouté.

## Corrigés

- **EQUI-2 (A) — jauge marquée à l'Entrepôt.** Fonctions `warehouseGoKeep` (part gardée = `WarehouseManager.getUsableCap`, 0 si elle n'est pas sous le plafond), `warehouseAtGoKeep`, `warehouseRawSubtitle`. `js/ui/warehouse-view.js`, `css/04-panel-village.css`.
  - Tuile de chaque matière brute : repère 2×10 px (`.wh-go-tick`) à la part gardée ; barre et bordure bleues (`--c-blue-350`, la couleur du versement) quand le stock y est (`.wh-tile.is-go`).
  - Titre des matières brutes : « plafond 1 250 · Grand Ouvrage dès 1 000 » (la plus basse des parts gardées).
  - Fiche de la ressource : repère sur la jauge, jauge bleue à la part, ligne sous la jauge « Au-delà de 1 000 (80 %), le surplus part tout seul au Grand Ouvrage. » (pourcentage = part réelle / plafond : juste aussi quand la réserve ou la Forge de l'Histoire relève la part).
  - Pas de faux signal : versement automatique coupé, part au plafond ou ressource fabriquée : ni repère, ni bleu, ni « Grand Ouvrage dès ». Le mot « plein » n'apparaît pas.
- **CPL1-2 (A) — caravanes à l'écran de retour.** `js/ui/return-view.js`, `js/systems/return-system.js`, `css/04-panel-evolutions.css`.
  - `complete()` ajoute `caravansBack` ; `hasContent` le compte : l'écran s'ouvre aussi quand seule une caravane est rentrée (il restait fermé).
  - Rubrique « Caravanes » (icône de la caravane) juste après « Village » : « Rentrée de **Désert oublié** : **+336 or** · Verre des dunes ×2. » (or avec le bonus du Grand Ouvrage, `unloadGold`), lien « Décharger » d'un toucher (`returnUnloadCaravans` → `CaravanManager.unload()`, geste gratuit comme « Tout récolter »), puis « Une autre caravane rentre dans 1h 11m. » si une roule encore. Après le geste : « ✓ Déchargée : +336 or · Verre des dunes ×2 », la ligne de la caravane en route reste.
  - Formulation : « Rentrée de {monde} » au lieu de « La caravane du {monde} » de l'atelier, qui ne s'accorde pas avec « Forêt enchantée » ou « Ruines anciennes ».
- **UI-18 (A) — Tour du sorcier déplacée** de (76,8 ; 79,9) à (72 ; 85,5) dans `MAP_NODE_POSITIONS` (le tracé pointillé suit). `js/ui/map-view.js`.
- **SUIV-8 (A) — comparaison pesée dans le Sac.** `js/ui/equipment-view.js`, `js/ui/heros-screens-view.js`, `css/04-panel-heros-screens.css`.
  - `getEquipmentCompareWeight(candidat, équipé)` : chaque écart de `getEquipmentCompareLines` divisé par un tirage Épique moyen de sa stat (base : fourchette de l'emplacement ; affixe : `AFFIX_RANGES`), stats plates à l'échelle du monde (`getEquipWorldScale`) ; poids ½ pour or, XP et butin. Rend G, P et net.
  - `cmpState` : ▲ reste strict (que des gains) ; un ⇅ dont les gains pèsent moins du tiers des pertes (`EQUIP_WEIGH_SEUIL`) devient ▼. Le repère de l'emplacement (Équipé) et « Mieux que l'équipé » lisent la même fonction.
  - Nouveau tri « Intérêt » (`sortInventoryByInterest`, bilan net du meilleur au moins bon, ordre gardé à égalité, trié sur place).
  - Boutons « Trier » : 44 px de haut (25 avant) ; la rangée passe à la ligne au besoin.
- **Barre de titre des pages sans bandeau** (Paramètres, Ascension, Boutique, Donjon) : `width: auto` au lieu de 100 % + marges ; elle tient dans le cadre avec 4 px de chaque côté, comme les bandeaux. `css/00-kbtn.css`.
- Quoi de neuf : une ligne FR + EN (`js/ui/news-view.js`, `js/lang/en.js`) ; sept textes nouveaux traduits.
- `tools/harness/round-harness.js` : [471] (nouveau, 23 contrôles) : part gardée et absence de faux signal, repère, bleu, titre, réserve relevée, fiche ; hasContent avec une caravane seule, ordre des rubriques, butin, geste, caravane en route ; positions de la carte ; pesée, ▼ d'un ⇅ trop léger, ⇅ gardé, ▲ strict, tri « Intérêt », bouton traduit, 44 px ; barre de titre. Aucun contrôle existant adapté.

## Mesures (vrai jeu, Chromium, états de l'atelier : Rôdeur au Désert, Grand Ouvrage en versement automatique à 80 %, Entrepôt niveau 3 ; caravane du Désert rentrée + une en route ; Chevalier à la Montagne, six mondes atteints ; Sac de 20 objets tirés à graine fixe)

### EQUI-2

| | 320 N | 320 G | 390 N | 390 G |
|---|---|---|---|---|
| Matières à leur part repérées (avant → après) | 0 / 3 → 3 / 3 | 0 / 3 → 3 / 3 | 0 / 3 → 3 / 3 | 0 / 3 → 3 / 3 |
| Repère de tuile | 2×10 | 2×11 | 2×10 | 2×11 |
| Faux signal (Blé sous sa part : repère sans bleu) | 0 | 0 | 0 | 0 |
| Fiche : repère de jauge | 2×21 | 2×22 | 2×24 | 2×25 |
| Fiche : ligne « Au-delà de 1 000… » visible à l'ouverture | oui (35 px) | oui (59 px) | oui (35 px) | oui (39 px) |
| Versement auto coupé : repères / titre | 0 / « plafond 1 250 » | idem | idem | idem |

Avant : la seule mention du Grand Ouvrage dans la fiche était dans « Où ça part », sous le pli (856 px pour une zone qui finit à 1 096, à 320 N). Le titre « plafond 1 250 · Grand Ouvrage dès 1 000 » passe sur deux lignes à 390 px (comme dans l'atelier), sans coupe. Débordement horizontal 0.

### CPL1-2

| | 320 N | 320 G | 390 N | 390 G |
|---|---|---|---|---|
| Caravane seule : écran (avant → après) | fermé → ouvert | fermé → ouvert | fermé → ouvert | fermé → ouvert |
| Rubriques après (retour complet) | Village, Caravanes, Taverne | idem | Village, Caravanes | Village, Caravanes, Taverne |
| « Décharger » (hauteur au repos) | 44 px | 49 px | 44 px | 49 px |
| Bas de « Décharger » par rapport au pli | 71 px au-dessus | 7 px sous le pli | 184 au-dessus | 224 au-dessus |
| Haut de la rubrique sous le pli | non (105 px de marge) | non (13 px) | non (267) | non (334) |
| Un toucher : or versé / caravanes restantes | +336 / 1 | +336 / 1 | +336 / 1 | +336 / 1 |

« Décharger » : `min-height: 44px` des liens du retour (CPL1-9), 49 px rendus en texte Grande (zoom 1,12) ; mesuré pendant l'animation d'ouverture (scale 0,94) à 41 / 46 px. À 320×568 texte Grande, retour complet, le titre de la rubrique est lu à l'ouverture mais le bas de « Décharger » est 7 px sous le pli : un petit défilement (en-tête de la fenêtre sur deux lignes). Avant : aucune ligne sur la caravane ; écran fermé si elle était seule. Débordement 0.

### UI-18 (carte défilée jusqu'à la Tour)

| | 320 N | 320 G | 390 N | 390 G | PC 1280×800 |
|---|---|---|---|---|---|
| « Montagne brûlante » lisible (avant → après) | 67 → 100 % | 67 → 100 % | 75 → 100 % | 75 → 100 % | 75 → 100 % |
| Nom recouvert par un médaillon (px²) | 491 → 0 | 638 → 0 | 469 → 0 | 612 → 0 | 454 → 0 |
| Écart nom de la Montagne → médaillon de la Tour | −16 → 14 px | −20 → 9 | −12 → 24 | −16 → 20 | −11 → 27 |
| Bulles de raccourci sur le médaillon de la Tour (px²) | 94 → 0 | 39 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| Tour : marge au bas du cadre peint | 58 → 29 px | 56 → 26 | 76 → 39 | 73 → 37 | 81 → 42 |
| Tour : marge au bord droit du cadre | 36 → 50 px | 36 → 50 | 45 → 62 | 44 → 62 | 47 → 65 |

« Tour du sorcier » et son médaillon : 100 % visibles partout. Aucune autre paire nom ↔ médaillon ne se chevauche. La bordure peinte fait environ 16 px : la Tour reste au-dessus (26 px au plus juste). Débordement 0.

### SUIV-8

| | 320 N | 320 G | 390 N | 390 G |
|---|---|---|---|---|
| Repères ▲ · ⇅ · ▼ du Sac (avant → après) | 2 · 17 · 1 → 2 · 13 · 5 | idem | idem | idem |
| Boutons « Trier » (hauteur) | 25 → 44 px | 28 → 49 | 25 → 44 | 28 → 49 |
| Bas du menu au-dessus de la barre du bas | 2 → 2 px | 2 → 3 | 36 → 17 | 2 → 3 |

Mêmes comptes que l'atelier (13 ⇅ et 5 ▼ au lieu de 17 et 1). Menu en texte Grande à 320 : dans le vrai jeu, `revealDropdownMenu` faisait déjà défiler la zone pour montrer le menu entier (les 43 px de l'atelier venaient d'un instantané sans ce défilement) ; avec la rangée « Trier » plus haute et le bouton « Intérêt », il reste au-dessus de la barre (3 px), y compris avec un Sac d'un seul objet (zone courte : 3 px à 320 G, 2 à 320 N). Les trois boutons tiennent sur une ligne aux quatre combinaisons. Débordement 0.

### Barre de titre des pages sans bandeau (Paramètres, Ascension, Boutique, Donjon : mêmes chiffres sur les quatre)

| | 320 N | 320 G | 390 N | 390 G | PC 1280×800 |
|---|---|---|---|---|---|
| Marges gauche / droite avant | 4 / −4 (largeur 320) | 4 / −4 (320) | 4 / −4 (390) | 4 / −4 (390) | 14 / −14 (832) |
| Après | 4 / 4 (312) | 4 / 4 (311) | 4 / 4 (382) | 4 / 4 (381) | 14 / 14 (804) |
| Village (bandeau, référence) | 4 / 4 (312) | 4 / 4 (311) | 4 / 4 (382) | 4 / 4 (381) | — |

En mode PC le dépassement était de 14 px (marge de 14 px du grand écran), corrigé par la même règle.

Aucune erreur de page sur l'ensemble des relevés.

## Laissés

- Aucun.

## À signaler

- Écran de retour, 320×568 texte Grande : l'en-tête de la fenêtre (« Pendant ton absence » sur deux lignes) et la phrase d'ambiance prennent la moitié de la hauteur ; avec Village et Caravanes, « Décharger » est 7 px sous le pli. Antérieur, non traité (hors atelier).

Contrôles : `node --check` sur chaque JS modifié ; round-harness 6 591 OK, 0 échec (2 passes) ; boot 4 OK ; création 44 OK ; i18n 100 % (8 480 textes), 0 orphelin ; parcours 232 OK, 0 échec.

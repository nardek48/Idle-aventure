# Aethervale v3.409.0 — Nettoyage des couleurs en dur

Point 4 de la liste de fin d'audit (01/10/2026).

## Ce qui change
- **Palette de jetons** `--c-<famille>-<niveau>` en tête de `css/00-tokens.css` : **114 couleurs**, une par valeur (familles : black, white, grey, cream, gold, bronze, brown, red, green, blue, violet ; niveau 50 très clair → 950 très sombre ; à niveau égal, `-soft` la moins saturée, `-vivid` la plus saturée).
- **800 couleurs en dur remplacées** par `var(--c-…)` dans les 50 fichiers CSS (et dans les jetons existants : `--nb-cream`, `--nb-ink`… s'appuient maintenant sur la palette).
- **Couleurs quasi identiques fusionnées** : 48 teintes à moins de 7 points d'écart RGB (par exemple `#8a5a14` / `#8a5c14`) rejoignent la plus utilisée. Écart invisible à l'œil (au plus 8 sur 255 dans les captures).
- **Restent en clair : 122 couleurs** utilisées une seule fois et sans voisine proche (avant : **925** occurrences, 288 couleurs).
- **Jetons de la palette jamais redéfinis** dans un sélecteur : contrairement à `--nb-ink` (que le cadre redéfinit), remplacer une couleur par son jeton ne change rien à l'écran.

## Ancien thème Quest Idle
- Retirés : `--accent` (#8b5cf6), `--bg-card` (#2a2348), `--text-dim`.
- `--text` (texte sur fond de nuit) passe du gris violet `#e2dce8` à la **crème du kit** `#f4e9d0`. Seul changement visible : un texte un peu plus chaud au combat (« Deux frappes ! »).
- **CSS mortes supprimées** : `css/04-panel-zones.css` et `css/04-panel-adventures.css` (aucune classe utilisée), règle `.talent-cost`. **À supprimer aussi chez toi** ; `index.html` et `sw.js` ne les chargent plus.

## Outil
- **Nouveau** : `tools/css-palette.py`. Il relève les couleurs, pose la palette et remplace. **Relançable** : il remet d'abord les jetons en clair, puis recommence. Une nouvelle couleur écrite en dur à 2 endroits ou plus rejoindra la palette au prochain passage. `--dry` pour voir sans écrire.

## Vérification
- 58 écrans capturés avant/après (`sim/design-audit.js`) et comparés pixel à pixel : écart maximal de 8/255 partout. Les seuls écarts plus grands viennent du contenu tiré au hasard (objet Épée/Hache, carte de Petite aventure, citation de l'écran de retour), plus le texte du combat ci-dessus.
- Harnais : section [182] ; fonction `unpal()` pour les anciens tests qui cherchent une couleur précise. Round 3659 OK ×2, boot 4, création 44, parcours 139, campagne 38, i18n 100 %.
- Hors périmètre : 17 couleurs écrites dans le JavaScript (styles en ligne), à reprendre au fil des écrans.

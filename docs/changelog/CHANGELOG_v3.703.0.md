# v3.703.0 — Fenêtres : atelier 2 intégré (choix de Seb du 05/11)

Variantes choisies dans `atelier/fenetres.html`, reprises avec le CSS (`TUT_A_CSS`) et le comportement du prototype. Le CSS est regroupé en fin de `css/07-responsive.css` (bloc « v3.703.0 : fenêtres »), après celui de v3.702.0.

## Corrigés

- **TUTO-11** (A, présentation seule, aucun texte d'aide modifié) : sous 700 px de haut, en-tête des fenêtres d'aide en ligne (icône 36 px à gauche du titre), voile de 10 px au lieu de 16, cartes de points resserrées (8 px), texte gardé à 13 px. Partout : dégradé et pastille « Suite ↓ » au bas de la liste tant qu'elle déborde, effacés en fin de liste (classe `is-end`). La pastille est posée par `buildTutorialModalHTML` (`aria-hidden`), l'écouteur de défilement par `wireTutorialHint(host)`, appelé par les trois ouvertures d'aide (étape d'Histoire, aide générique, quête de village). Le choix du récit de la carte vivante (`.story-choice-card`, même habillage) est exclu : il n'était pas dans l'atelier. « Suite ↓ » traduit (« More ↓ »). Fichiers : `js/ui/tutorial-view.js`, `css/07-responsive.css`, `js/lang/en.js`.
- **CPL3-5** (A) : assistant commun `kDialog` (`js/ui/modal.js`).
  - `kDialog.open(fenêtre, origine)` : `role="dialog"` (un rôle déjà posé est gardé), `aria-modal="true"`, `aria-labelledby` sur le titre seul (`.ksheet-ttl` / `.kwin-ttl` ; le texte du titre est isolé dans un `<span class="kdlg-t">` quand un sous-titre suit), sous-titre `.ksheet-sub` en `aria-describedby`, `tabindex="-1"` et focus sur la fenêtre, Tab et Maj+Tab qui bouclent dedans, `inert` sur les voisins de la fenêtre à chaque niveau jusqu'à `<body>` (son voile reste actif), sauf `#toast`, `#howto-toast-root` (le toast « Pour y arriver », z-index 9 600, a des boutons) et `#pwa-update-banner`.
  - `kDialog.close(fenêtre)` : `inert` retiré, focus rendu à l'origine ; si l'origine a été redessinée, son double (même `onclick`, même onglet, ou même classe et même texte) ; sinon la fenêtre restée dessous.
  - Branchement : un `MutationObserver` sur `<body>` (`kDialog.sync`) appelle open / close pour chaque `.ksheet`, `.full-menu` ou `.kwin` qui apparaît ou disparaît, y compris les fermetures par `innerHTML = ""` et les feuilles redessinées sur place (même hôte : origine gardée, focus remis sur le bouton équivalent). La fenêtre du dessus suit l'ordre de `backNavCloseTop` (z-index, puis ordre d'ouverture) : une confirmation ouverte depuis une feuille rend la feuille inerte, puis la réactive en se fermant. `showConfirmModal` / `closeConfirmModal` appellent `kDialog` directement (fermeture avant le rappel, qui peut rouvrir une fenêtre). L'inert n'est posé et retiré que par kDialog (liste tenue à part) : il est toujours retiré quand la pile se vide.
  - Calques hors kit (prologue, moment de boss, conversation, nuit du monde…) : quand l'un d'eux s'affiche au-dessus de la fenêtre du dessus (élément fixe de z-index supérieur dans une autre racine de `<body>`), kDialog s'efface (ni inert ni boucle de Tab) jusqu'à sa fermeture. Sans cela, le prologue ouvert par-dessus la feuille « Installer » de l'écran titre et la carte de victoire d'un boss devenaient intouchables (vu au parcours, P1 et P4).
  - Échap : inchangé (`backNavCloseTop`, décision v3.536.0 option A ; une fenêtre sans croix ne se ferme pas).
  - CSS : la fenêtre focalisée n'a pas de liseré ; ses boutons gardent le leur. Fichiers : `js/ui/modal.js`, `css/07-responsive.css`.
- **MARGES** (suite de v3.702.0, demande de Seb) : les pages à sous-onglets (`#panel-container.has-subtab-page` : Quêtes et ses sous-onglets, Boutique, Donjon) passent aussi à 4 px de chaque côté sur téléphone (≤ 430 px, hors mode PC). Hauts faits, Tutoriels, Journal et Paramètres sont des pages à cadre, déjà à 4 px depuis v3.702.0. La Carte (12 px, pas une page de cadre) est laissée. Fichier : `css/07-responsive.css`.
- Quoi de neuf : une ligne FR + EN (`js/ui/news-view.js`, `js/lang/en.js`).
- `tools/harness/round-harness.js` : [468] bloc CSS et commentaires, règles TUTO-11 (en-tête, voile, cartes, texte non touché, choix du récit exclu), indice posé entre la liste et « Compris », écouteur dans les 3 ouvertures, traduction, textes d'aide inchangés ; kDialog exposé, rôle / modal / nom / description, sélecteur des fenêtres et éléments jamais inertes, observateur et retrait de l'inert, boucle de Tab, Échap inchangé, confirmModal branché, pile vide sans fenêtre, suspension sous un calque hors kit ; règle des pages à sous-onglets. Aucun contrôle existant modifié.
- `tools/harness/parcours-harness.js` : nouveau parcours **P15** (fenêtres au vrai clavier, 390 × 844 puis 320 × 568) : feuille Taverne (rôle, nom, description, focus, fond inerte et toast actif, Tab ×10, Maj+Tab, Échap, focus rendu à la carte, plus rien d'inerte) ; confirmation empilée sur la feuille (focus, feuille inerte puis réactivée, focus rendu au bouton de la feuille) ; aide « Le Campement » (Échap ×2 sans effet, Entrée sur « Compris », focus rendu à l'onglet) ; les 14 fiches du parcours d'habillage et le Menu, ouverts puis fermés par leur code : plus rien d'inerte ; calque hors kit posé au-dessus d'une feuille (rien d'inerte tant qu'il est là, fond de nouveau inerte après) ; aide à 320 × 568 (en-tête en ligne, « Suite ↓ » puis effacé). 20 contrôles ; aucun contrôle existant adapté.

## Mesures (vrai jeu, Chromium ; fonctions `zone` et `rowPage` de l'atelier, vraies touches Playwright)

Partie avancée (Rôdeur, Désert étape 16, village niveau 3). Avant = v3.702.0, après = v3.703.0.

### TUTO-11 — les 76 fenêtres d'aide (aide du Grimoire exclue, ouverte en feuille)

| Taille | Fenêtres qui défilent, avant → après | Plus long caché, avant → après | « Suite ↓ » quand ça défile |
|---|---|---|---|
| 320 × 568 Normale | **47 → 18** | 453 → 246 px | 18 / 18 |
| 320 × 568 Grande | 71 → 45 | 668 → 405 px | 45 / 45 |
| 390 × 844 Normale | 1 → 1 | 77 → 77 px | 1 / 1 |
| 390 × 844 Grande | 13 → 13 | 227 → 227 px | 12 / 13 (*) |

Identique au relevé de l'atelier (47 → 18, 71 → 45, 1, 13). (*) « La ferme » (`farm_improvement`) déborde de 1 px : sous le seuil de 4 px, pas de pastille (même règle que l'atelier). Aucune pastille sur une fenêtre qui tient.

Échantillon de l'atelier, 320 × 568 Normale (px cachés, avant → après) : Le Campement 284 → 92, Village & Production 298 → 98, Les ateliers 453 → 246, La Brume 420 → 228, Améliorations 347 → 189 ; liste visible 346 → 424 px. Dans les cinq : pastille présente, effacée en fin de liste, revenue en haut ; « Compris » 100 % visible, 181 × 49 px (Grande : 181 × 55) ; texte des points 13 px ; icône 48 → 36 px (Grande 54 → 40) ; aucun débordement horizontal. À 390 × 844, présentation inchangée (icône 48 px), seule la pastille joue.

### CPL3-5 — au vrai clavier (320 × 568 et 390 × 844, mêmes relevés aux deux tailles)

| Contrôle | Feuille « Taverne », avant → après | Aide « Le Campement », avant → après |
|---|---|---|
| role / aria-modal | absents → dialog / true | absents → dialog / true |
| Nom annoncé | aucun → « Taverne » (description « Niveau 3 / 5 ») | aucun → « Le Campement » |
| Focus à l'ouverture | resté derrière (carte) → dans la fenêtre | resté derrière (onglet Camp) → dans la fenêtre |
| Tab ×10 dans la fenêtre | 2 / 10, sort au 1er Tab → 10 / 10 | 1-2 / 10, sort au 1er Tab → 10 / 10 |
| Maj+Tab depuis le premier | sort (barre d'onglets) → reste dedans | sort à 390 → reste dedans |
| Fond inerte (écran, barre, HUD) | 0 / 3 → 3 / 3 (toast actif) | 0 / 3 → 3 / 3 |
| Échap ×1 / ×2 | fermée / fermée (inchangé) | ouverte / ouverte (inchangé, v3.536 A) |
| Focus après fermeture | perdu (barre d'onglets) → carte « Taverne » | perdu (page) → onglet Camp (Entrée sur « Compris ») |
| Inert restant après fermeture | 0 → 0 | 0 → 0 |

Fenêtres empilées (confirmation ouverte depuis un bouton de la feuille) : avant, focus resté dans la feuille, rien d'inerte ; après, focus dans la confirmation, feuille et barre inertes, Tab ×3 dedans ; Échap ferme la confirmation, focus rendu au bouton de la feuille, feuille réactivée (barre toujours inerte) ; second Échap ferme la feuille, focus rendu à la carte, 0 inert. Menu (onglet « Menu ») : rôle et nom « Menu », focus dedans, fond inerte ; Échap ferme, focus rendu à l'onglet, 0 inert.

### MARGES — pages à sous-onglets

| Page | Avant | Après |
|---|---|---|
| Quêtes (Histoire, Secondaires, Aventure), Boutique, Donjon — 320 et 390, Normale et Grande | contenu à 12 px de chaque bord (largeur utile 296 / 366 px) | 4 px (312 / 382 px) |
| Débordement horizontal (écran et zone qui défile) | aucun | aucun (24 combinaisons) |
| Hauts faits, Tutoriels, Journal, Paramètres (pages à cadre) | 4 px | 4 px (inchangé) |
| Carte | 12 px | 12 px (laissée) |

## Laissés

- Aucun.

Contrôles : node --check sur chaque JS modifié · round-harness 6 518 OK, 0 échec (2 passes) · boot 4 OK · création 44 OK · i18n 8 434 textes, 100 %, 0 orphelin · parcours 232 OK (212 + 20 de P15), 0 échec · mesures Chromium ci-dessus. Aucun fichier protégé touché. Aucun fichier ajouté.


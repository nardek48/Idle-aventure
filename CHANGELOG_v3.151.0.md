# CHANGELOG v3.151.0 — Portraits Homme/Femme (skin cosmétique)

## Contexte
Seb a fourni 12 nouveaux portraits (médaillon rond, cadre doré peint dans
l'image) : les 6 héros existants × Homme/Femme. Décision validée avant
démarrage : **option A — le genre est un skin cosmétique**, pas une
nouvelle identité de héros. `game.heroId` ne change pas de sens, aucune
stat ne dépend du genre, zéro migration de save nécessaire.

## Modèle de données
- `js/data/heroes.js` : chaque héros a désormais `imageM` / `imageF` au
  lieu d'un simple `image`. Une propriété **calculée** `image` (getter,
  `Object.defineProperty`) est posée sur chaque entrée de `HEROES_DB` :
  elle lit `game.heroGender` à chaque accès et retourne `imageM` ou
  `imageF` en conséquence. **Tous les appelants existants qui lisaient déjà
  `hero.image`** (`ui/heros-view.js`, `ui/hud-view.js`, `ui/more-view.js`,
  `ui/ui-root.js` via `getHeroByGameId`/`getSelectedHero`) continuent de
  fonctionner **sans aucune modification** — ils reçoivent simplement la
  bonne image.
- `game.heroGender` : nouveau champ, `"m"` (défaut) | `"f"`.
  - `core/state.js` : valeur par défaut dans `createInitialGameState()` +
    migration dans `ensureGameStateDefaults()` (vieilles saves sans ce
    champ → `"m"`).
  - `systems/save-system.js` : ajouté aux 3 points de contact pertinents —
    `buildSaveData()`, `restoreBaseState()` (appelée par `loadGame()`),
    `fullResetState()`. **`hardResetState()` (ascension) n'y touche pas** :
    le héros ne change pas d'identité à une ascension, cohérent avec
    `heroId` qui n'y est pas non plus réinitialisé.

## UI de création (`js/ui/modal-view.js`)
- Toggle "Homme / Femme" ajouté à l'étape Classe, sous la grille des 3
  colonnes, au-dessus du toggle Chaos existant.
- État `pendingHeroGender` (séparé de `game.heroGender`, même logique que
  `pendingHeroId`/`pendingPlayerName`) : le choix n'est écrit dans
  `game.heroGender` qu'à la confirmation réelle (`confirmHeroSelection()`),
  reste annulable via `cancelHeroSelection()`/`closeHeroSelection()`.
- Nouvelle fonction `getHeroImageForGender(hero, gender)` : utilisée
  **spécifiquement dans le picker** pour refléter le genre en cours de
  choix (pending) sans dépendre du getter `hero.image` qui lit
  `game.heroGender` déjà confirmé — sinon le portrait affiché pendant la
  sélection n'aurait pas suivi le toggle avant confirmation.
- Changer de classe conserve le genre choisi ; le toggle Chaos conserve
  aussi le genre choisi (les deux axes sont indépendants).

## Bug trouvé et corrigé en cours de route
`HeroSlotManager.getSlotSummary()` (save-system.js, utilisé par l'écran
"Charger la partie") utilisait `hero.image` — qui lit `game.heroGender` de
la **partie actuellement active en mémoire**, pas celui du **slot en train
d'être résumé**. Un joueur avec plusieurs sauvegardes de genres différents
aurait pu voir le mauvais portrait sur les cartes de l'écran "Charger la
partie". Corrigé : lecture directe de `d.heroGender` (les données brutes du
slot concerné) avec `imageM`/`imageF`. Couvert par un test dédié dans le
harness (genre différent en mémoire vs genre réellement sauvegardé sur le
slot).

## Cadres décoratifs dupliqués retirés (demande Seb)
Les nouveaux portraits ont déjà leur médaillon rond doré peint dans
l'image (fond transparent autour). Plusieurs endroits du jeu superposaient
un cadre CSS/image supplémentaire, pensé pour les anciens portraits
rectangulaires — retiré à ces 2 endroits (choix explicite de Seb) :
- **Fiche personnage** (`css/04-panel-hero-summary.css`,
  `.pc-portrait-frame`) : `big-hero-frame.png` (cadre carré) et le fond
  crème retirés, portrait affiché seul en `object-fit: contain`.
- **Mini-portrait HUD de combat** (`css/02-layout.css`,
  `.combat-hero-mini-portrait`) : `cadre-hero.png` retiré, dimensionnement
  simplifié (l'ancien `width:auto; height:auto` en position absolute,
  pensé pour un recadrage manuel dans le cadre carré, remplacé par un
  simple `inset:0; object-fit:contain`). Le badge de niveau (z-index 3,
  différent souci) n'est pas touché.
- **`.hero-card-image`** (carrousel de sélection en jeu,
  `css/05-overlays.css`) : laissé tel quel — pas de cadre-image superposé
  ici, juste un carré arrondi avec fond crème, pas de doublon visuel.
- **Écran titre** (`css/00-title-screen.css`, `.title-slot-portrait img`) et
  **picker de création** (`css/00-hero-creation.css`) : `object-fit`
  changé de `cover` à `contain` — `cover` recadrait/zoomait le médaillon
  peint dans les nouvelles images, le tronquant partiellement. `contain`
  affiche le médaillon complet, qui se superpose proprement au trou rond
  du cadre externe (`cadre_slot.png`) ou s'affiche seul (colonnes de
  classe, confirmation).

## Fichiers modifiés
- `js/data/heroes.js`
- `js/core/state.js`
- `js/systems/save-system.js`
- `js/ui/modal-view.js`
- `js/ui/title-screen-view.js` (numéro de version affiché)
- `css/00-hero-creation.css`
- `css/00-title-screen.css`
- `css/02-layout.css`
- `css/04-panel-hero-summary.css`
- `sw.js` (CACHE_VERSION 3.150.0 → 3.151.0)
- `hero-creation-harness.js` (nouveaux tests genre)

## Fichiers ajoutés
- `images/Heroes/{knight,ranger,mage,chaosKnight,chaosRanger,chaosMage}_{m,f}.png`
  (12 fichiers)

## Fichiers devenus orphelins (non supprimés)
- `images/Heroes/knight.jpg`, `ranger.jpg`, `mage.jpg`, `ChaosNight.jpg`,
  `ChaosRanger.jpg`, `ChaosSorcier.jpg` — plus référencés nulle part dans
  le code actif (vérifié par recherche). Laissés sur disque, à nettoyer
  si confirmé inutile.

## sw.js — pas de précache individuel nécessaire
Les images sont mises en cache à la demande (stratégie "runtime", voir
doc en tête de `sw.js`), pas précachées une par une. Le bump de
`CACHE_VERSION` purge l'ancien cache runtime à l'activation : les 12
nouvelles images seront retéléchargées naturellement au fil de la
navigation, aucune modification de la liste `PRECACHE_APP_SHELL`
nécessaire.

## Vérifications effectuées
- `node --check` sur les 5 fichiers JS modifiés + le harness : OK.
- Accolades CSS équilibrées sur les 4 fichiers CSS modifiés.
- `hero-creation-harness.js` (étendu avec des tests de genre) : **44/44**
  — genre par défaut Homme, toggle Homme/Femme, conservation du genre au
  changement de classe ET au toggle Chaos (indépendants), non-écriture de
  `game.heroGender` avant confirmation, écriture correcte à la
  confirmation, getter `hero.image` cohérent après confirmation, le bug
  `getSlotSummary` corrigé et vérifié (genre du slot ≠ genre en mémoire),
  migration `ensureGameStateDefaults()` sur vieille save sans
  `heroGender`.
- `boot-harness.js` : 4/4.
- `round-harness.js` ×2 : 914 et 912 OK, 0 échec (variance déjà observée
  avant cette session, non liée à ces changements).
- Recherche de références orphelines aux anciens noms de fichiers
  (`knight.jpg`, `ChaosNight.jpg`, etc.) dans le JS actif : aucune (les
  seules occurrences restantes sont `migrateHeroId`, qui mappe des
  *identifiants* de très vieilles saves, pas des noms de fichiers).

## À tester par Seb (rendu réel, non couvert par la VM)
1. Le toggle Homme/Femme à l'étape Classe : bascule visuelle correcte,
   cohérente avec le toggle Chaos juste en dessous.
2. Écran "Charger la partie" avec 2+ sauvegardes de genres différents :
   chaque carte doit afficher le bon portrait (c'est le bug corrigé,
   vérifié en VM mais pas en rendu réel).
3. Fiche personnage et mini-portrait HUD : rendu sans le cadre carré
   décoratif, portrait rond seul — à confirmer que ça rend bien
   visuellement dans son contexte (pas de fond transparent disgracieux
   derrière le médaillon).
4. Alignement du médaillon peint dans les cartes de l'écran titre
   (`cadre_slot.png`) : `contain` peut laisser un espace vide si le
   portrait n'a pas exactement le même diamètre de cercle que le trou du
   cadre — à valider visuellement.

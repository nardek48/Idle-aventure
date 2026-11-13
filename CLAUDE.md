# Aethervale — consignes pour Claude

RPG d'aventure + village idle, mobile-first (320–430 px), PWA en français, publiée sur GitHub Pages.
Seb est seul développeur, designer, testeur et décideur. Public : adultes et ados 12+.

## Communication
- Toujours en **français** : réponses, commentaires de code, changelogs.
- Commentaires de code : 2 lignes max, format « quoi + pourquoi bref ».
- Réponses directes et concises. Seb valide souvent d'un mot (« ok tu peux », « oui »).

## Arborescence
- `game/` : le jeu, **seul dossier publié** (workflow `.github/workflows/pages.yml`, après les harnais). Les chemins `js/…`, `css/…`, `index.html`, `sw.js` cités ici sont relatifs à `game/`.
- `tools/harness/` (round, boot, création du héros, parcours, `index-scripts.js`), `tools/sim/` (bancs, campagne), `tools/audit/` (i18n, icônes, design, captures), `tools/docs-gen/` (générateurs), `tools/publication/` (copie publiée sans commentaires JS, lancée par `pages.yml`), `tools/rendu-de/` (pré-rendu du d20, hors jeu). `tools/chemins.js` : racine du jeu et dossier de sortie, communs aux outils.
- `atelier/` : prototypes HTML d'interface. `docs/` : changelogs (`docs/changelog/`), glossaire i18n, notes de travail (passation, pistes, prompts).
- `captures/` : sorties des outils (captures, lots de campagne), ignoré par git.

## Méthode de décision
1. **Lire le vrai code avant de proposer quoi que ce soit.** Ne jamais inventer un nom de champ, une signature ou un état ; vérifier qu'une fonctionnalité existe (ou pas) avant de l'affirmer.
2. Proposer des **options chiffrées** avec une recommandation, attendre la validation, puis coder. Une décision à la fois.
3. Une **décision close ne se rouvre pas** sans demande explicite de Seb.
4. UI transversale : **atelier d'abord** (prototype HTML autonome dans `atelier/`, testé sur iPhone) avant de toucher au jeu.
5. Équilibrage : **mesurer au banc** (`tools/sim/`) contre le vrai moteur avant d'engager un chiffre. Pas besoin d'être au pour-cent près : un ou deux relevés, un ajustement, puis livrer et juger en jeu. Ne pas relancer le banc en boucle.
6. Mesures visuelles (tailles, positions) : au pixel, via Playwright/Chromium headless ou scan PIL, jamais à l'œil.

## Fichiers protégés — confirmation explicite de Seb AVANT toute modification
`js/main/game-loop.js`, `js/systems/save-system.js`, `js/systems/progression-system.js`,
`js/systems/combat-engine.js`, `js/systems/stats-system.js`, `js/systems/dungeon-system.js`
+ quêtes (liste fermée, Seb 05/11) : `js/systems/story-quest-system.js`, `js/systems/adventure-quest-system.js`,
`js/systems/companion-quest-system.js`, `js/systems/village-quest-system.js`, `js/data/story-quests.js`.
Une fois l'accord obtenu : modification minimale, limitée au besoin.

## Stack et conventions
- JavaScript vanilla **ES5 strict** : `var`, globales exposées sur `window`, pas de modules ES, pas de bundler, pas de framework, aucune dépendance runtime.
- Scripts chargés dans l'ordre par `index.html` : `prefs-system.js` et `desktop-scale.js` dans le `<head>`, puis `js/core` → `js/data` (dont `js/sim/combat-round-sim.js`) → `js/systems` → `js/ui` → `js/main`. `js/lang/en.js` n'est chargé qu'en anglais (`document.write` après `i18n.js`) et reste hors précache.
- CSS par écran, sur les jetons `css/00-tokens.css` (palette `--c-*`).
- Node.js uniquement pour l'outillage (harnais, bancs, générateurs).

## Règles de jeu à ne pas casser
- **Nouvel état persistant** : câbler les 4 points — `buildSaveData`, `restoreBaseState` (appelé par `loadGame`) et `fullResetState` dans `save-system.js`, plus la valeur par défaut dans `createInitialGameState` (`core/state.js`). En oublier un = perte de données au rechargement.
- Aucune progression (Histoire, monde, `worldIndex`) ne dépend d'un combat hors quête : seules les quêtes définies et testées font foi.
- **Icône manquante** : garder son vrai chemin et afficher l'icône générique. Ne jamais emprunter une autre image du jeu.
- **Images en double ou sans rapport** : dès qu'une image sert à deux choses différentes, ou ne correspond pas à ce qu'elle illustre, le signaler à Seb (sans la corriger d'office).
- Tutoriels : 28 s'affichent sur l'écran (`js/ui/coach-view.js`, atelier `tutoriels-ecran.html`, Seb 10/11 ; lot 1 en v3.781.0, lot 2 en v3.789.0, lot 3 (quêtes du village) en v3.790.0) ; les autres gardent la fenêtre. Chantier en cours (Seb 13/11, option A puis B) : les écrans de Forêt et Désert par lots, captures par `tools/audit/coach-captures.js` validées par Seb avant publication. Hors de ce chantier, corriger seulement une erreur factuelle.
- Le système de classes (Chevalier/Rage, Rôdeur/Concentration, Mage/Mana) est complet depuis v3.34.

## Pièges techniques connus
- CSS : une séquence `*/` dans un commentaire casse silencieusement tout le CSS qui suit.
- CSS : le raccourci `background:` sur un composant dont l'image vient d'une autre classe provoque des régressions.
- CSS : `isolation: isolate` peut passer les bottom sheets derrière la barre de navigation.

## Livraison d'une version
1. Incrémenter **`GAME_VERSION`** (`js/core/constants.js`) et **`CACHE_VERSION`** (`sw.js`) — toujours égaux, le harnais vérifie.
2. **Fichier nouveau** (JS/CSS) : l'ajouter à `index.html` **et** au précache de `sw.js`, et le publier dans le même commit que ce `sw.js`. Sinon le service worker échoue et la PWA reste bloquée sur l'ancienne version. **Signaler explicitement chaque fichier ajouté.** Exceptions : `en.js` (hors précache) et les images, chargées à la demande (jamais précachées).
3. Supprimer un fichier seulement après publication d'un `sw.js` qui ne le précache plus.
4. `node --check` sur chaque JS modifié.
5. `round-harness.js` à **0 échec**, stable sur plusieurs passes.
6. **Quoi de neuf** (demande de Seb, 31/10) : chaque version visible pour le joueur ajoute une ou deux lignes en tête de `newsEntries()` (`js/ui/news-view.js`), avec leur traduction anglaise.
7. Changelog `docs/changelog/CHANGELOG_vX.Y.Z.md` + commit git intitulé `vX.Y.Z`. Le push sur `main` publie `game/` si les harnais passent.
8. **Push sur `main` : automatique** une fois la version validée par Seb et les contrôles passés (points 4 à 7). Ne jamais pousser un travail en cours, non mesuré ou dont les contrôles échouent : le commit reste alors en local et Seb est prévenu.

## Tests et bancs
Depuis la racine du dépôt. Sans argument, les outils visent `game/` ; avec des options, passer la racine d'abord (`.` ou `game`).
```
node tools/harness/round-harness.js                  # >6 000 contrôles, 0 échec exigé
node tools/harness/boot-harness.js  /  node tools/harness/hero-creation-harness.js
node tools/harness/parcours-harness.js . P11         # Chromium (Playwright), parcours joueur à taille iPhone
node tools/sim/campagne-lot.js . --combats --joueur --n 4
node tools/audit/missing-icons.js
```
La liste des scripts est lue dans `game/index.html` (`tools/harness/index-scripts.js`) : rien à régénérer.

## Documentation
- Dépôt de conception : `/home/user/Idle-Aventure-Documentation`. Le document de conception fait foi sur les **décisions** ; l'État des chantiers (en cours : `Aethervale_Etat_des_chantiers_2026-11-10_v3761_0.md`) fait foi sur l'**état du code** ; le suivi d'audit (`Aethervale_Suivi_Audit_2026-11-04.md`) dit où en est chaque constat.
- Ne pas régénérer les références (fonctions, équilibrage) à chaque version : le code est la source de vérité.

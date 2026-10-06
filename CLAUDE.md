# Aethervale — consignes pour Claude

RPG d'aventure + village idle, mobile-first (320–430 px), PWA en français, publiée sur GitHub Pages.
Seb est seul développeur, designer, testeur et décideur. Public : adultes et ados 12+.

## Communication
- Toujours en **français** : réponses, commentaires de code, changelogs.
- Commentaires de code : 2 lignes max, format « quoi + pourquoi bref ».
- Réponses directes et concises. Seb valide souvent d'un mot (« ok tu peux », « oui »).

## Méthode de décision
1. **Lire le vrai code avant de proposer quoi que ce soit.** Ne jamais inventer un nom de champ, une signature ou un état ; vérifier qu'une fonctionnalité existe (ou pas) avant de l'affirmer.
2. Proposer des **options chiffrées** avec une recommandation, attendre la validation, puis coder. Une décision à la fois.
3. Une **décision close ne se rouvre pas** sans demande explicite de Seb.
4. UI transversale : **atelier d'abord** (prototype HTML autonome dans `atelier/`, testé sur iPhone) avant de toucher au jeu.
5. Équilibrage : **mesurer au banc** (`sim/`) contre le vrai moteur avant d'engager un chiffre. Pas besoin d'être au pour-cent près : un ou deux relevés, un ajustement, puis livrer et juger en jeu. Ne pas relancer le banc en boucle.
6. Mesures visuelles (tailles, positions) : au pixel, via Playwright/Chromium headless ou scan PIL, jamais à l'œil.

## Fichiers protégés — confirmation explicite de Seb AVANT toute modification
`js/main/game-loop.js`, `js/systems/save-system.js`, `js/systems/progression-system.js`,
`js/systems/combat-engine.js`, `js/systems/stats-system.js`, `js/systems/dungeon-system.js`
(+ systèmes de quêtes : liste exacte à confirmer par Seb).
Une fois l'accord obtenu : modification minimale, limitée au besoin.

## Stack et conventions
- JavaScript vanilla **ES5 strict** : `var`, globales exposées sur `window`, pas de modules ES, pas de bundler, pas de framework, aucune dépendance runtime.
- Scripts chargés dans l'ordre par `index.html`. `js/core` → `js/data` → `js/systems` → `js/ui` → `js/main`.
- CSS par écran, sur les jetons `css/00-tokens.css` (palette `--c-*`).
- Node.js uniquement pour l'outillage (harnais, bancs, générateurs).

## Règles de jeu à ne pas casser
- **Nouvel état persistant** : câbler les 4 points de `save-system.js` — `buildSaveData`, `loadGame`, `hardResetState`, `fullResetState`. En oublier un = perte de données au rechargement.
- Aucune progression (Histoire, monde, `worldIndex`) ne dépend d'un combat hors quête : seules les quêtes définies et testées font foi.
- **Icône manquante** : garder son vrai chemin et afficher l'icône générique. Ne jamais emprunter une autre image du jeu.
- Tutoriel d'onboarding : ne pas retravailler, corriger seulement une erreur factuelle.
- Le système de classes (Chevalier/Rage, Rôdeur/Concentration, Mage/Mana) est complet depuis v3.34.

## Pièges techniques connus
- CSS : une séquence `*/` dans un commentaire casse silencieusement tout le CSS qui suit.
- CSS : le raccourci `background:` sur un composant dont l'image vient d'une autre classe provoque des régressions.
- CSS : `isolation: isolate` peut passer les bottom sheets derrière la barre de navigation.
- `DEFAULT_QUEST_PROGRESS` est déclaré dans `core/constants.js` et redéclaré dans `data/quests.js` : garder les deux synchronisés.

## Livraison d'une version
1. Incrémenter **`GAME_VERSION`** (`js/core/constants.js`) et **`CACHE_VERSION`** (`sw.js`) — toujours égaux, le harnais vérifie.
2. **Fichier nouveau** (JS/CSS) : l'ajouter à `index.html` **et** au précache de `sw.js`, et le publier dans le même commit que ce `sw.js`. Sinon le service worker échoue et la PWA reste bloquée sur l'ancienne version. **Signaler explicitement chaque fichier ajouté.**
3. Supprimer un fichier seulement après publication d'un `sw.js` qui ne le précache plus.
4. `node --check` sur chaque JS modifié.
5. `round-harness.js` à **0 échec**, stable sur plusieurs passes.
6. Entrée de changelog `vX.Y.Z` + commit git intitulé `vX.Y.Z`.

## Tests et bancs
```
node round-harness.js .                 # >3 000 contrôles, 0 échec exigé
node boot-harness.js .  /  node hero-creation-harness.js .
node sim/parcours-harness.js . [P11]    # Chromium, parcours joueur à taille iPhone
node sim/campagne-lot.js . --combats --n 4
node sim/missing-icons.js .
```
⚠ Les harnais lisent actuellement la liste des scripts dans `/tmp/scripts.txt` (Linux uniquement) — à remplacer par une lecture d'`index.html` lors de la réorganisation.

## Documentation
- Le document de conception fait foi sur les **décisions** ; l'État des chantiers fait foi sur l'**état du code**.
- Ne pas régénérer les références (fonctions, équilibrage) à chaque version : le code est la source de vérité.

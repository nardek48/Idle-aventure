# v3.752.0 — Édition Alpha : sauvegardes séparées et blocage après desert_18 (lot Alpha, points 2 et 6)

Décisions de Seb le 09/11 : l'Alpha s'arrête après desert_18, le reste jouable ; accord pour `save-system.js` (préfixe des clés). Rien ne change pour le joueur du lien principal.

- **Sauvegardes séparées** : le jeu et l'Alpha partagent l'origine `nardek48.github.io`, donc le `localStorage`. En édition Alpha, les six clés prennent le préfixe `alpha:` (`STORAGE_PREFIX`, `js/core/edition.js`) : `SAVE_KEY` et `ACTIVE_SLOT_KEY` (`save-system.js`, fichier protégé, accord de Seb, deux lignes), préférences, résumé de retour, verrou de fenêtre, journal de test. En édition « jeu », les clés restent identiques. Vérifié dans Chromium : chaque lien écrit ses propres clés, aucun verrou croisé.
- **Fichier nouveau** `js/systems/alpha-system.js` (ajouté à `index.html` après les systèmes et au précache de `sw.js`) : en édition Alpha, `StoryQuestManager.isChapterOpen` ferme tout chapitre qui suit le Désert (`ALPHA_LAST_CHAPTER`). Les Ruines n'ouvrent pas : ni ruines_01, ni « La route du nord ». En filet, `WorldTravel.arrive` refuse tout monde au-delà du Désert. `AlphaEdition.isFinished()` sert à l'écran de fin (point 3). Enveloppes posées au chargement, sans toucher `story-quest-system.js`.
- `tools/harness/round-harness.js` : section [505] (clés inchangées en « jeu », préfixées en Alpha ; Désert fini en Alpha : Ruines fermées, aucune carte des Ruines, pas de voyage vers les Ruines, Désert accessible).

Contrôles : round-harness 7 241 OK, 0 échec (×2) ; boot 4 OK ; création du héros 44 OK ; parcours 235 OK.

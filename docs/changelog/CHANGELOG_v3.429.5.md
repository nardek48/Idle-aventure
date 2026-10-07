# Aethervale v3.429.5 — Correctifs : carte de victoire en mode Grimoire, libellés « Héros → Entraînement »

Relevés pendant la deuxième heure de jeu testée dans Chromium. S'applique sur la v3.429.4.

## La carte de victoire ne bloque plus le Grimoire
- Cause : la carte « Victoire / Nouveau trophée » (boss et élites) s'écrit dans `#cycle-modal-root`, une racine qui met les rounds en pause tant qu'elle a du contenu. En mode Grimoire, le combat restait figé jusqu'à ce qu'on touche « Continuer ». Mesuré : donjon arrêté à la vague 6 après l'élite de la vague 5.
- Correctif : en mode Grimoire, la carte se ferme seule après 2,5 s (`BOSS_GRIMOIRE_WIN_MS`) et le combat reprend. Elle reste fermable d'un toucher. En mode Tactique, rien ne change.

## Libellés « Héros → Stats »
- La fiche du Terrain d'entraînement (« S'entraîner dans Héros → Stats › ») et l'estimation de combat (« monte tes caractéristiques dans Héros → Stats ») disent maintenant « Héros → Entraînement », comme l'onglet. Restes oubliés par la v3.429.3.

## Code
- `js/ui/boss-moment-view.js` : fermeture automatique de la carte de victoire en mode Grimoire.
- `js/ui/village-building-view.js`, `js/systems/combat-forecast-system.js`, `js/lang/en.js` : libellés et clés de traduction.
- Aucun fichier protégé touché. Aucun fichier ajouté.

## Contrôles
- Round : **3 963 OK**, 0 échec, sur trois passages.
- Boot : 4 OK. Création du héros : 44 OK.
- i18n : 4 184 textes, 100 %, 0 orphelin.
- Chromium : en Grimoire, la carte bloque à l'ouverture puis plus après 2,8 s ; en Tactique, elle bloque jusqu'au toucher. Console sans erreur.
- `node --check` sur tous les fichiers modifiés.

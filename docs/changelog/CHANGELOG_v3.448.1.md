# Aethervale v3.448.1 — Sauvegarde illisible protégée, précache complet

Suite de l'audit du 11/10. S'applique sur la v3.448.0. Décision de Seb : corriger d'abord la perte de partie et le hors-ligne. Accord de Seb pour toucher `save-system.js`.

## Sauvegarde illisible
Avant : si une sauvegarde ne se lisait pas (JSON abîmé, erreur pendant la restauration), le jeu repartait d'une partie vierge sans rien dire, et la sauvegarde automatique l'écrasait. Reproduit : 1 octet tronqué, or 123 456 → 0.

Désormais :
- **Copie saine** : à chaque chargement réussi, la sauvegarde est recopiée dans `<clé>_bak`.
- **Partie illisible** :
  - elle est mise de côté dans `<clé>_illisible`, jamais écrasée ;
  - la copie saine est rechargée, avec l'avertissement « Ta sauvegarde était abîmée : la dernière copie saine a été rechargée. » ;
  - si la copie saine est illisible aussi, le jeu repart d'un état neuf propre (plus de partie à moitié restaurée) et prévient le joueur d'exporter ses sauvegardes ;
  - si la mise de côté échoue (stockage plein), l'emplacement est verrouillé : rien n'est écrit dessus pendant la session.
- **Export** : les versions illisibles partent dans le fichier (`unreadable`), pour pouvoir être réparées.
- Supprimer un héros, effacer la partie ou importer une sauvegarde retire la copie saine de l'emplacement (elle ne doit pas ressusciter un autre héros). Un import lève le verrou.
- Un seul avertissement par session.

## Précache complet
58 fichiers chargés par `index.html` (46 JS, 12 CSS) n'étaient pas précachés par `sw.js`. Après une mise à jour, le jeu pouvait casser hors-ligne ou mélanger deux versions. Ils sont ajoutés ; le cache compte 231 fichiers JS et CSS (mesuré dans Chromium).

## Code
- `js/systems/save-system.js` (protégé, accord de Seb) : `loadGameFromRaw`, `recoverUnreadableSave`, `resetGameToFreshState`, `notifySaveRecovery`, `dropSlotBackup`, `saveLockedKey` ; `saveGame`, `loadGame`, `clearSaveData`, `deleteSlot`, import et export.
- `sw.js` : 58 entrées de précache.
- `js/lang/en.js` : 3 traductions.
- `tools/harness/round-harness.js` : [224] index.html et précache concordent (et aucun fichier précaché n'est absent) ; [225] secours de sauvegarde (12 contrôles).
- Aucun fichier ajouté. Aucun nouvel état dans la sauvegarde (les copies sont des clés à part).

## Contrôles
- Round : **4 214 OK**, 0 échec, sur trois passes. Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK. i18n : 4 652 textes, 100 %, 0 orphelin.
- Chromium (390 × 844), vrai jeu : héros créé à 123 456 or, rechargé (copie saine créée), sauvegarde tronquée d'un octet, rechargé → 123 456 or, nom gardé, version illisible mise de côté, avertissement affiché ; aucune erreur de page.
- `node --check` sur les fichiers modifiés.

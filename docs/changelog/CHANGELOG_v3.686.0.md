# v3.686.0 — Sauvegarde et fiabilité (audit du 04/11, lot I7)

Sauvegarde, import et export, emplacements, fermeture. Accord de Seb (04/11) pour save-system.js et dungeon-system.js, modifiés au minimum. Chaque changement de `buildSaveData`/`loadGame` est prouvé par un aller-retour sur une vraie sauvegarde fabriquée par v3.685.0 (Rôdeuse niv. 12 à la Crypte, 5 compagnons, 54 objets) : chargement identique à celui de v3.685.0, seule la clé `gameVersion` s'ajoute ; même résultat sur les sauvegardes de l'audit (v3.636.0 et v3.673.0).

- **SAVE-2** : stockage plein, l'export prend l'emplacement actif dans la partie en mémoire (`buildSaveData`), plus la version ancienne restée sur le disque. `js/ui/save-transfer-view.js`.
- **SAVE-3** : import multi-héros validé : seuls les héros complets (nom, numéro de sauvegarde) sont écrits ; `{}` ou du texte est ignoré et compté (« 1 héros, 1 ignoré(s) ») ; un fichier sans héros valide est refusé sans rien écrire. Idem à l'accueil. `js/ui/save-transfer-view.js`.
- **SAVE-4** : import à l'ancien format chargé par le chemin protégé (`loadGameFromRaw`) avant d'être écrit ; en cas d'échec, la partie d'avant est rechargée et le joueur lit « Import impossible : ta partie n'a pas changé. » (`importSingleSave`). `js/ui/save-transfer-view.js`.
- **SAVE-5** : une date de remise plus loin qu'une période (horloge avancée puis corrigée) remet aussitôt : sorties de donjon, échoppe, Taverne. `js/systems/dungeon-system.js` **(protégé)**, `js/systems/equip-shop-system.js`, `js/systems/tavern-system.js`.
- **SAVE-7** : la sauvegarde porte `gameVersion` ; une partie écrite par une version plus récente est chargée sans être réécrite (verrou, message « Mets le jeu à jour ») ; son import est refusé. `compareGameVersions` écrite. `js/systems/save-system.js` **(protégé)**.
- **SAVE-8** : l'ancienne clé à plat d'avant v3.25 n'est migrée que sur un appareil qui n'a jamais utilisé les emplacements ; elle ne remplace plus le héros choisi. Rien n'est effacé. `js/systems/save-system.js` **(protégé)**.
- **SAVE-10** : un objet sans numéro de sauvegarde (`{}`, `[]`) n'est plus une partie : il est mis de côté et la copie saine est rechargée (plus écrasée). `js/systems/save-system.js` **(protégé)**.
- **SAVE-11** : la copie saine (`_bak`) suit la partie toutes les 10 min, plus seulement au chargement. `js/systems/save-system.js` **(protégé)**.
- **SAVE-12** (reste, l'écran titre est fait en v3.685.0) : message honnête (« ne peut pas être rechargée ; sa copie brute est jointe à l'export ») ; la copie illisible disparaît avec l'emplacement. `js/systems/save-system.js` **(protégé)**.
- **SAVE-13** : « Nouvelle partie » au démarrage ne réécrit plus le héros quitté (son absence n'est plus effacée) : `createHeroInSlot(n, skipSaveCurrent)`. `js/systems/save-system.js` **(protégé)**, `js/ui/title-screen-view.js`.
- **SAVE-14** : changement, création ou effacement de héros : l'écran de retour en attente est vidé (`ReturnManager.clear`). `js/systems/return-system.js`, `js/systems/save-system.js` **(protégé, une ligne)**.
- **SAVE-15 (= QA-6, CPL3-8)** : « Effacer la partie » supprime l'emplacement au lieu de réécrire un héros vide ; « Effacer {nom} ? … Tes autres héros sont gardés. » ; un autre héros reprend la main, sinon la création s'ouvre. `js/systems/save-system.js` **(protégé)**.
- **SAVE-16 (= ARCH-11)** : les 14 clés sauvegardées absentes de l'état initial y sont, avec les valeurs de `fullResetState`. `js/core/state.js`.
- **SAVE-17** : la quantité d'entraînement (×1, ×10, ×25, MAX) est une préférence de l'appareil, gardée au rechargement. `js/ui/heros-view.js`, `js/systems/prefs-system.js`.
- **SAVE-18** : sauvegarde à `pagehide` (iOS) et avant le rechargement de mise à jour. `js/systems/save-system.js` **(protégé, une ligne)**, `js/main/pwa.js`.
- **SAVE-19** : la fenêtre qui cède la main sauve d'abord sa partie, seulement si l'emplacement actif est toujours son héros (jamais par-dessus un autre, QA-1). `js/main/instance-unique.js`.
- **SAVE-20** : fichier d'export « aethervale-sauvegarde-AAAA-MM-JJ.json ». `js/ui/save-transfer-view.js`.
- **SAVE-21** : supprimer le héros actif (« Mes héros » ou « Effacer la partie ») rattrape l'absence du héros qui reprend. `js/ui/title-screen-view.js`, `js/systems/save-system.js` **(protégé)**.
- **ARCH-19** : une entrée d'`adventureQuestProgress` au mauvais type est réparée au lieu de lever à chaque sortie. `js/systems/adventure-quest-system.js` **(quêtes, protégé)**.
- **CPL1-8** : au chargement, la régénération hors ligne passe avant le rattrapage de production (son `renderHud` consommait l'absence sur l'onglet Combat), après la photo de l'écran de retour. `js/main/boot.js`.
- `js/lang/en.js` : textes nouveaux traduits, textes remplacés retirés. « Quoi de neuf » : une ligne.
- `tools/harness/round-harness.js` [451] : aller-retour et ancienne sauvegarde, un contrôle par correction (36).

Vérifié dans Chromium à 390×844 : deux héros, « Effacer la partie » par le vrai bouton (fenêtre 23→367 px, aucun débordement) : Beta supprimé, Alpha repris à 777 or ; fermeture sans sauvegarde manuelle : or gardé ; « Nouvelle partie » puis croix au démarrage : Alpha non réécrit ; export « aethervale-sauvegarde-2026-11-04.json » ; ×10 retrouvé après rechargement ; import `{}` refusé ; partie d'une version plus récente chargée, non réécrite, message ; dernier héros effacé : aucun emplacement, création ouverte.

Laissés :
- SAVE-9 (= COMB-5, QA-10, NOV-23) : ennemi gardé au rechargement, décision de Seb.
- SAVE-6 (= QA-11) : triche par l'horloge. « Ne jamais reculer un repère » bloquerait aussi pendant des mois le joueur dont l'horloge avancée a été corrigée (le cas de SAVE-5) : les deux cas sont indiscernables, la tolérance est un choix de Seb (l'audit la donne optionnelle).
- CPL1-6 : résumé en attente gardé au rechargement, stockage local à décider par Seb (lot I9).
- CPL1-7 : rattrapage séquentiel des ateliers (3,9 % passager) : accepter ou découper, choix de Seb.
- CPL1-1 à CPL1-5 : écran de retour, lot I9.
- SAVE-1, QA-1, QA-13 : déjà corrigés (v3.680.0, v3.681.0, v3.685.0).

Fichier ajouté (outillage, hors `game/`, pas de précache) : `tools/harness/sauvegarde-v3685.json`, sauvegarde réelle de v3.685.0 lue par [451].

Contrôles : round 6 277 OK (2 passes), boot 4 OK, création 44 OK, parcours 212 OK, i18n 100 % (0 orphelin).

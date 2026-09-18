# v3.301.0 — W-2b : voyage entre mondes et tableau par monde

Proposé par Seb après la traversée (18/09/2026) : toucher la Forêt sur la carte pour y revenir,
et ne montrer au tableau que les quêtes du monde où l'on se trouve. Validé avec quatre
exceptions. C'est la décision D7 (voyage libre) de la conception Désert.

## 1. Voyage libre depuis la carte du monde (D7)

- Un monde **atteint puis quitté** est ouvert sur la carte (« Atteint »), plus « Verrouillé ».
  Le monde courant affiche « Tu es ici ».
- Toucher un monde atteint mais quitté ouvre sa fiche, avec **« Y voyager »** et « Voir la
  carte » (sa carte vivante). Le monde courant ouvre toujours sa carte vivante directement.
- Voyage refusé, avec la raison affichée, pendant un combat, un run, un donjon, une élite de
  carte ou une expédition (« Termine d'abord ton combat ou ton expédition »).
- Aventure d'arrivée (`WorldTravel.defaultAdventureFor`) : chapitre du monde terminé -> sa
  dernière aventure (le Cœur pour la Forêt) ; sinon la première. Seuls les canevas sans
  aventure déclarée la lisent.
- Le fond de combat suit le monde (déjà en place).
- Retiré de la fiche de monde : « 10 combats avant le boss », souvenir du farm libre.

## 2. Le tableau montre le monde où tu es

`MissionBoard.list()` masque les quêtes d'un autre monde **tant qu'elles ne sont que proposées**.
Les quatre exceptions validées :
1. **L'Histoire** toujours visible, tous chapitres ;
2. **Le village** toujours visible (quêtes de village, « Les fondations ») : Aeswyn est partagé ;
3. **Rien de ce qui est engagé** n'est masqué : acceptée, en cours ou prête à réclamer ;
4. **Une ligne par monde** en bas de l'écran Quêtes : « 7 quêtes dans la Forêt enchantée », avec
   « Y aller » (absent si le voyage est impossible).

- Les quêtes de déblocage et la Petite Aventure portent désormais le monde de leur canevas
  (elles n'en avaient pas au tableau).
- `list({ allWorlds: true })` rend tout ; `getById` cherche dans tous les mondes.
- Le cap de 3 quêtes actives n'est pas touché : il ne compte que des quêtes engagées, jamais
  masquées. Le cap de Petites Aventures reste partagé entre les mondes (D10).

## Contrôles

- round-harness : 0 échec, stable sur 3 passages. Nouvelle section **[96]** (18 contrôles) :
  monde des cartes, masquage au Désert, Histoire visible, compte par monde, ligne « Y aller »,
  quête engagée jamais masquée, refus en run, retour en Forêt sur le Cœur, carte (« Atteint »,
  « Tu es ici », « Verrouillé »), bouton « Y voyager ».
- boot-harness 4 OK ; hero-creation-harness 44 OK ; `sim/forest-bench.js --diff` : écart nul.
- Playwright (iPhone 13) : écran Quêtes au Désert avec la ligne de la Forêt, fiche de la Forêt
  depuis la carte, voyage effectué (retour au Cœur, fond de la Forêt), aucune erreur de page.

Aucun fichier protégé modifié.

## Fichiers

`js/systems/world-travel-system.js`, `js/systems/mission-board-system.js`, `js/ui/quests-view.js`,
`js/ui/map-view.js`, `css/04-panel-quests.css`, `js/core/constants.js`, `sw.js`,
`round-harness.js`.

À appliquer après v3.300.0.

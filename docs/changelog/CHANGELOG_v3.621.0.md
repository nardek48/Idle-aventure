# v3.621.0 — Audit narratif : rythme des révélations, promesses tenues

Mission de Seb (02/11) : corriger les incohérences entre ce que le jeu raconte, promet et fait, sans nouveau lore. Décisions de Seb : prologue du Codex en deux fiches (option B), fiche déjà lue reste lisible, « hors du Cycle » retiré, Wenna inchangée.

## Codex : les feuillets du Veilleur (bible A, pilier 6)
- Règle : une fiche d'histoire ne se lit qu'une fois le Veilleur rencontré (`desert_07` terminée, `StoryQuestManager.isStepReached("desert_08")`), en plus de sa condition propre. Concerne : Prologue, les six mondes, Chaos, Bestiaire, Donjon et les cinq Sceaux, Village hors-Cycle, « Ce qui attend au sommet ». « La Mémoire » garde sa condition (le mot Aether est déjà dans l'interface à forest_15). Aucun nouvel état : compatible avec les sauvegardes.
- Prologue découpé sans réécriture : « Prologue — La Rupture » (§1-3) au Veilleur ; « Le Cycle » (§4, « Tu es l'un d'eux. ») quand Orwen nomme la Tour (fin du chapitre V) ou à l'arrivée à la Tour.
- `codex-system.js` : une fiche déjà lue reste lisible.
- `codex-view.js` : une catégorie sans fiche lisible s'affiche « ??? » (le titre « Le Cycle » s'affichait dès le début).
- Extraits qui sortaient trop tôt, désormais masqués avec leur fiche : première phrase de la Forêt sur la Carte, du Bestiaire en tête du Bestiaire.
- `dungeon-view.js` : la fiche de lancement du Donjon affichait le texte du Sceau sans vérifier son déblocage.

## Cartes vivantes
- « Le village hors du Cycle. » → « Le village. » (Forêt) ; « Le camp du Portail, hors du Cycle. » → « Le camp du Portail. » (Désert).

## La lame de Brannoc
- `LootSystem.rollWorldDrop(slot)` : emplacement facultatif ; `s_lame` (`giftSlot: "weapon"`) donne toujours une arme, du type de la classe (`generateEquipmentItem`), rareté du monde inchangée. Sans argument, rien ne change (vitrine, caravanes).
- Fiche de l'événement : « Cadeau : une arme forgée pour toi. »

## Prologue
- Sixième planche, dernière phrase seulement : « Cette nuit encore, quelqu'un devra les tenir à distance. »

## Tutoriels et objectifs (audit vérifié ligne à ligne)
- Grimoire : réglage « Cible » sur « Celle qui soutient » (et non « Le soutien »), dans « Préparer la sortie » (ruines_08, ruines_19, crypte_08, montagne_08) ; condition « L'ennemi invoque un bouclier » (et non « Bouclier au prochain tour », ruines_08, ruines_19).
- Caravanes : le trajet Long rapporte 2 raretés à coup sûr depuis la v3.611.0 (ruines_04, crypte_04, montagne_07, fiche « Les caravanes ») ; « parfois » retiré.
- montagne_03 : titres « Deux sur quatre » quand Ysolt est partie (le texte s'adaptait déjà).
- Champs, deuxième parcelle : « il reste une terre à reprendre » (3 parcelles depuis la v3.612.0).
- montagne_17 : coût annoncé, comme les autres traversées.
- Obsidienne taillée : « taillée au burin » (elle ne fond pas).

## Harnais
- Section [415] (29 contrôles) : Codex avant et après le Veilleur, fiche lue, « Le Cycle », découpage du prologue, catégorie « ??? », extraits et fiche du Donjon, arme pour les 3 classes et leurs variantes du Chaos, cadeau réel dans le sac, prologue, cartes vivantes, corrections des tutoriels (dont les noms vérifiés dans les données du Grimoire).

## Contrôles
- `node --check` sur les 19 fichiers JS modifiés ; harnais 5 846 OK, 0 échec (2 passes) ; parcours P1-P14 212 OK ; boot, création du héros, i18n 100 %, icônes.
- Robot de campagne (mode rapide), Rôdeur « garder » et Mage « donner » : Histoire jouée jusqu'à montagne_03, les deux branches de Ysolt traversées. Arrêt à montagne_04 identique sur le code d'avant (mode rapide, sans tailles de veines) ; les relevés avec combats réels du 01/11 passent les 95 étapes.

## Non modifié, à valider
- forest_13 : « passer 5 vagues » compte en réalité 5 ennemis tués (les vagues de groupe de la v3.471.0 comptent double). Correction juste dans `story-quest-system.js` (protégé) : en attente de l'accord de Seb.

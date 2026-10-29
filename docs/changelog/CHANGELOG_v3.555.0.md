# v3.555.0 — Grand écran, option B (1/5) : Quêtes en liste et détail

Accord de Seb du 29/10 (« tu peux lancer B par quêtes »), d'après la maquette `atelier/grand-ecran.html`. Format large seulement : **le téléphone ne change pas**.

## Ce qui change sur grand écran
- **À gauche, toutes les quêtes**, groupées par Histoire, Secondaires et Aventure, avec un filtre (Toutes, Histoire, Secondaires, Aventure) et le compteur des quêtes actives. Chaque ligne donne l'icône, le titre, une ligne d'état et l'avancée (5 / 20, ✓ pour un chapitre fini, « ! » quand il y a quelque chose à réclamer). Les quêtes d'un autre monde gardent leur ligne « Y aller ».
- **À droite, la quête choisie** ; à l'arrivée, le chapitre d'Histoire en cours :
  - en-tête du chapitre (vignette du monde, « Chapitre 3 · Ruines anciennes », titre en Cinzel, avancée) ;
  - **barre des actes** : un trait par étape, vert si terminée, or pour l'étape en cours, groupés sous le nom de chaque acte ;
  - l'étape en cours, avec les mêmes boutons qu'au téléphone (Accepter, Réclamer, choix, offrande, lien vers la quête) ;
  - les étapes terminées sur deux colonnes (un toucher affiche leur récit).
- Une mission du tableau s'affiche avec sa carte habituelle ; « Jalons » ouvre les jalons du village et du héros.
- « Voir les quêtes terminées » garde l'affichage actuel, en pleine largeur.

## Image
La vignette du chapitre est celle du monde sur la carte (`images/Worlds/thumb_<monde>.webp`) : même sujet (le monde), affichée à 150 × 100 px, donc nette (0,71 sur Mac Retina).

## Code
- `js/ui/quests-view.js` : `buildQuestsWideHTML` et ses aides (liste, chapitre) ; `buildQuestsGeneralSubTabHTML` passe la main au format large. Les blocs du téléphone sont réutilisés (`buildStoryCurrentStepHTML`, `buildQuestBoardCardHTML`, `buildMilestonesHTML`).
- `css/10-grand-ecran.css` : section « option B, Quêtes » ; Cinzel réservé au titre de l'étape en cours.
- `js/lang/en.js` : textes anglais. Aucun fichier ajouté, aucun fichier protégé.

## Contrôles
`round-harness` 5 463 OK, 0 échec (deux passes, section [370] ajoutée) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P11 15 OK. Captures à 1440 × 900 et 1180 × 820 ; téléphone inchangé.

# Passation — conversation du 30/10/2026 (v3.548.0 → v3.566.0)

À coller en ouverture de la prochaine conversation, avec CLAUDE.md.

## Fait dans cette conversation (retour de Seb sur ses journaux, 9 points)
- v3.548–3.549 : chemin de l'Histoire offert en PA (getStoryPath), objectif tracé sur la carte vivante (style A).
- v3.550 : élites de carte avec ressource (golem_tour Rare, pleureuse_nef Épique), pastille de gain.
- v3.551 : caravane d'essai de 10 min, gratuite et hors places.
- v3.554 : paliers de la Montagne, n'importe quelle pièce Épique.
- v3.560 : colporteur 15 potions par jour ; Apothicaire niveau max 10.
- v3.561 : Grand Ouvrage (débouché du surplus, +1 % d'or par palier, 5 hauts faits).
- v3.562 : difficulté de la Crypte et de la Montagne (WORLD_HERO_SCALING.byWorld, questEnemyByWorld).
- v3.563 : les feuilles gardent leur défilement après une action.
- v3.564 : réplique de Maddoc à montagne_09.
- v3.565 : fiche de l'Apothicaire allégée (recettes acquises repliées).
- v3.566 : images du Grand Ouvrage (icône du bâtiment et 5 hauts faits). Il ne reste aucune image absente.

## Points ouverts
1. **Difficulté (v3.562)** : Seb la juge en jeu. Le Mage est le plus exposé à la Montagne (2 à 21 morts sur la campagne au robot). Adoucir la Montagne seulement si Seb le demande.
2. **Image empruntée, signalée et non corrigée** : la pastille « pièce Épique/Rare » des élites de carte utilise l'icône d'armure.
3. **Artefact « Images à faire »** (https://claude.ai/artifact/1feSfpdAQx9i4euTn83WPW) :
   - les 6 images du Grand Ouvrage sont cochées (192/192) ;
   - les entrées `elite_golem_forge` et `elite_ifrit_trieur` ne servent plus et peuvent être retirées.

## Rappels de livraison
- Une autre conversation pousse aussi sur main : faire `git pull` et vérifier GAME_VERSION avant de numéroter.
- État des chantiers : `Idle-Aventure-Documentation/Aethervale_Etat_des_chantiers_2026-10-20_v3457_2.md`. Le paragraphe de la version s'insère à l'indice 28.
- Le parcours (`timeout 590 node tools/harness/parcours-harness.js . | tail -1`, 139) ne doit jamais tourner en même temps qu'une campagne.

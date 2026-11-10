# Passation du 10/11 (v3.761.0)

Pour reprendre dans une nouvelle conversation. Le code fait foi ; l'État des chantiers du 10/11 (`Aethervale_Etat_des_chantiers_2026-11-10_v3761_0.md`, dépôt de documentation) donne le détail.

## Livré depuis le 09/11
- v3.751.0 à v3.753.0 : **édition Alpha** (Forêt et Désert). Même dépôt, branche `alpha` figée, publiée sous `/alpha/` par `pages.yml` ; `js/core/edition.js` (« jeu » au dépôt, « alpha » écrit dans la copie publiée) ; caches et clés de stockage séparés ; Histoire arrêtée après desert_18 (`js/systems/alpha-system.js`) ; fenêtres, avis et envoi du journal (`js/ui/alpha-view.js`).
- v3.754.0, v3.755.0 : Forge 2 (MES-6) et pause « Objectif tenu » dans les donjons (DIF-1).
- v3.756.0 à v3.761.0 : dés instantanés, onglets collants, bouton des Talents, **Talents au kit**, **fil rouge** (construire, quête annexe), **tutoriels sur l'écran** (`js/ui/coach-view.js`, 7 tutoriels du début).

## Alpha
- Lien : https://nardek48.github.io/Idle-aventure/alpha/ — en **3.760.0** (le jeu est en 3.761.0). Seb décide quand la mettre à jour : `git push origin <commit>:refs/heads/alpha`, puis relancer « Publier le jeu » (Actions, sur `main`).
- Avant d'envoyer le lien aux testeurs : Seb génère les images absentes (19, dont celles des Petites Aventures et de la Forge des mondes).
- Un push sur `alpha` seul ne publie rien : la publication part de `main` (protection de l'environnement GitHub Pages).

## À suivre
- Tester sur iPhone : tutoriels sur l'écran, menu de partage de l'Alpha.
- Lire les journaux et les avis des testeurs à leur arrivée.
- End game (idée de Seb du 09/11 : bâtiments sans plafond, héros toujours plus fort, donjons toujours plus loin) : à concevoir, fichiers protégés.
- Publication : en cas d'échec de `deploy-pages` (délai de GitHub Pages, vu le 09/11), relancer le workflow.

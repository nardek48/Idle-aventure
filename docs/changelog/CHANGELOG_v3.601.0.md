# v3.601.0 — Parler aux compagnons : choisir de quoi parler

Atelier `atelier/sujets-compagnons.html` : Seb a choisi la mise en page M1 (la liste) et les sujets T1 le 31/10. T2, ce qu'un compagnon pense d'un autre, viendra plus tard. Les textes sont intégrés avant relecture (accord de Seb) et sont dans l'atelier des textes, groupe « Compagnons · sujets ».

## Ce qui change
- **Au coin du feu, toucher un compagnon ouvre la scène sur la liste des sujets :**
  - « Il veut te parler » : la conversation de l'histoire, en tête quand il y en a une ;
  - « Parle-moi de toi » : un souvenir. Un nouveau s'ouvre dans chaque monde atteint ; d'abord le plus ancien pas encore écouté, sinon le dernier, qu'on peut réécouter ;
  - « Et ce monde-ci ? » : ce qu'il pense du monde où vit le héros ;
  - « Ta quête » : l'étape en cours, puis son action (J'y vais, Donner ou Écouter) ;
  - « Rien, merci ».
- La phrase d'accueil est la phrase au toucher déjà validée pour le camp (`campSoirTapText`). Elle remplace l'ancienne bulle au toucher.
- Point rouge : sujet nouveau. Coche : déjà écouté. Après un sujet, « ‹ Autre chose » ramène à la liste.
- La pastille « … » au coin du feu signale aussi un souvenir ou un avis pas encore écouté.
- **Hors sortie, toute l'équipe est au coin du feu**, pas seulement les compagnons restés au camp : on peut parler à tout le monde.
- **30 textes** : un souvenir et un avis par compagnon et par monde où il est (Wenna 5 + 5, Maddoc 4 + 4, Edda 3 + 3, Ysolt 2 + 2, Sarkel 1 + 1).

## Fichiers
- **Fichier ajouté**, dans `index.html` et le précache de `sw.js` : `js/data/companion-topics.js`.
- `js/systems/companion-talk-system.js` : `topicToi`, `topicMonde`, `heard`, `markHeard`, `hasNewTopic`. Les sujets écoutés sont gardés dans `talks` (clés `s_toi_<monde>` et `s_monde_<monde>`) : pas de nouvel état à sauvegarder.
- `js/ui/companion-talk-view.js` : `openCompanionMenu`, `talkTopic`, `talkMenuTopics`, `talkQuestAction`.
- `js/ui/camp-view.js` : le feu ouvre le menu ; `campSoirTap` est retiré.
- `css/04-panel-camp.css`, `js/lang/en.js` (70 textes), `js/ui/news-view.js` (une ligne « Quoi de neuf »).
- Aucun fichier protégé touché.

## Images
Les icônes des sujets reprennent des images existantes : résumé du héros (« Parle-moi de toi »), monde du Codex (« Et ce monde-ci ? »), quêtes secondaires (« Ta quête »), feu de camp (« Il veut te parler »). Signalé à Seb.

## Contrôles
- `round-harness` : 5 671 OK, 0 échec, sur deux passes. Nouvelle section [398] ; la section [393] suit le nouveau coin du feu.
- `boot-harness` : 4 OK. `hero-creation-harness` : 44 OK. `parcours-harness` : 142 OK.
- Audit i18n : 100 %.
- Captures sous Chromium à 390 × 844 : menu de Maddoc, point sur la quête.

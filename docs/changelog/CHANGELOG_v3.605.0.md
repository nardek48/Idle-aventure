# v3.605.0 — Parler aux compagnons : « Et les autres ? »

T2, validé par Seb le 31/10 comme suite de la liste des sujets (M1). Les textes sont intégrés avant relecture (accord de Seb) et sont dans l'atelier des textes, groupe « Compagnons · sujets ».

## Ce qui change
- Nouveau sujet dans la liste au feu : **« Et les autres ? »**, dès qu'un autre compagnon est recruté. Il ouvre la liste des compagnons, chacun avec son portrait. On en choisit un, et le compagnon dit ce qu'il pense de lui.
- **20 avis**, un par paire de compagnons. Ils reprennent ce que l'Histoire a déjà posé :
  - Maddoc a appris la pioche à Sarkel ;
  - Wenna a donné une couverture à Ysolt ;
  - Sarkel a vendu une carte fausse à Edda ;
  - Ysolt dit que Wenna ronfle.
- Point rouge : avis nouveau (il allume aussi la pastille « … » au coin du feu). Coche : déjà écouté.
- Après un avis, « ‹ Autre chose » ramène à la liste des compagnons.
- Un compagnon parti pour de bon (Ysolt recouchée) n'a plus d'avis à son sujet.
- Icône dédiée `images/Icons/camp/topic_others.webp`. Le prompt est dans l'atelier des images ; l'icône générique s'affiche en attendant.

## Fichiers
- `js/data/companion-topics.js` : `companionAvisData`.
- `js/systems/companion-talk-system.js` : `topicAvis`. Les avis écoutés sont gardés dans `talks` (`s_avis_<compagnon>`) : pas de nouvel état.
- `js/ui/companion-talk-view.js` : la liste des compagnons, `talkBack`.
- `css/04-panel-camp.css`, `js/lang/en.js` (43 textes), `js/ui/news-view.js` (une ligne « Quoi de neuf »).
- Aucun fichier ajouté. Aucun fichier protégé touché.

## Contrôles
- `round-harness` : 5 712 OK, 0 échec, sur deux passes. Nouvelle section [401].
- `boot-harness` : 4 OK. `hero-creation-harness` : 44 OK. `parcours-harness` : 142 OK.
- Audit i18n : 100 %.
- Captures sous Chromium à 390 × 844 : liste des sujets, liste des compagnons.

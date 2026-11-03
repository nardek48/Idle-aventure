# v3.639.0 — Onglets allégés : Quêtes et Camp

Accord de Seb du 03/11, après l'atelier `atelier/onglets-alleges.html` (option B). Les bulles flottantes ne changent pas : elles feront l'objet d'un atelier plus général.

## Ce qui change (téléphone)
- **Quêtes › Histoire** : l'étape en cours arrive en premier. Le prologue, les ouvertures, la vision et les chapitres terminés sont rangés en bas, dans une carte « Déjà vécu » à deux lignes repliées. Le compteur « Quêtes actives » n'y figure plus (l'Histoire n'entre pas dans ce plafond).
- **Quêtes › Compagnons** (nouvel onglet, idée de Seb) : les quêtes des compagnons quittent Secondaires. Une section par compagnon (portrait, nom, nombre de quêtes) dès qu'il y a plusieurs quêtes. L'onglet n'apparaît qu'avec au moins une quête ; sa pastille s'allume quand une étape se fait tout de suite.
- **Quêtes › Secondaires** : les Jalons tiennent en une carte (monde, compte, « Voir les 6 jalons », « N à réclamer » quand il y en a). Une carte de quête ne montre que l'étape en cours ; « 4 étapes · 1 faite ▸ » déplie les autres.
- **Dans les autres mondes** : une seule carte au cadre standard, une ligne par monde (Secondaires et Aventure).
- « Quêtes actives » devient une petite mention à droite (Secondaires, Aventure).
- **Camp › Le feu** : la santé et les rations en tête, puis le coin du feu, la soirée, « Tu es ici ». Les cartes « X veut te parler » disparaissent pour les compagnons assis au feu (la bulle « … » de leur portrait les remplace) ; elles restent pour ceux qui sont en sortie.
- **Camp › Grimoire** : l'onglet montre le Grimoire lui-même (mode, règles, Presets, Rapport) ; toucher une règle l'ouvre sur place.
- Petits téléphones (320-359 px) : libellés des 4 onglets de Quêtes resserrés.
- Grand écran : inchangé, hormis la carte « Dans les autres mondes ».
- Deux lignes dans « Quoi de neuf ».

## Mesures (iPhone 390 × 844, fin de la Crypte, 3 quêtes de compagnons)
Hauteur à faire défiler : Secondaires 4,7 → 1,7 écran ; Histoire 1,9 → 1,4 ; Le feu 1,8 → 1,3 ; Compagnons 1,9 (sorti de Secondaires).

## Fichiers
`js/ui/quests-view.js`, `js/ui/companion-quest-view.js`, `js/ui/camp-view.js`, `js/ui/companion-talk-view.js`, `js/ui/ui-root.js` (feuilles du Grimoire ouvertes depuis le Camp), `js/ui/news-view.js`, `js/lang/en.js`, `css/04-panel-quests.css`, `css/04-panel-camp.css`, `tools/harness/round-harness.js`. Aucun fichier nouveau, aucun fichier protégé touché, aucun état sauvegardé nouveau (dépliages tenus en mémoire de session, comme avant).

## Contrôles
`round-harness` 0 échec (deux passes), avec le nouveau bloc [433] ; contrôles [18b], [92], [262], [394] mis à jour pour la nouvelle disposition. `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` (P1-P14) ; audit i18n 100 %, 0 orphelin. Captures sous Chromium : iPhone 390 et 320 px, Mac 1440 × 900, sans erreur.

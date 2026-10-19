# Aethervale v3.456.0 — Crypte, lot C-5 : acte IV « Ceux qui sont retenus »

Texte de l'acte IV validé par Seb le 19/10/2026 (document « Crypte — Acte IV »), avec l'option A pour les quatre points à trancher :
- les chaînes ne prennent que les compagnons ;
- l'étape 17 est un parcours dédié ;
- les effets du choix « bat » sont ceux proposés ;
- la bague *Le maillon* est le cadeau de fin de chapitre.

S'applique sur la v3.455.1. **Le chapitre IV est complet : 20 étapes.**

## Les cinq étapes
16. **La chaîne** : sur la carte de la Crypte, la chaîne de la Liche est tracée des côtes jusqu'à la porte murée. L'étape demande que Le cercle tracé, Les maisons des morts et La porte murée soient tenus. Un couloir déjà tenu compte, puisque la carte ne reprend rien.
17. **Derrière la porte murée** : le parcours dédié « Le long de la chaîne ». Il a cinq paliers, dont une source pleine au palier 3, et coûte une Ration moyenne.
18. **Les maillons** : une quête de 4 rencontres. Les chaînes y apparaissent, avec leur tutoriel. Le carnet de Wenna donne une ligne au début des rencontres 2 à 4.
19. **Celui qui retient** : 2 rencontres, puis le Nécromancien suprême, en combat unique.
20. **Ce qui bat** : le troisième choix pesant de la Crypte, puis la fin du chapitre et l'amorce de la Montagne. Le texte de fin est « Chapitre terminé — plus haut, la roche est chaude. »

Dans les cinq étapes, les répliques d'Ysolt suivent le choix de l'acte III. Sur la branche Garder, c'est Edda qui rapporte ce qu'Ysolt disait.

## Les chaînes
- Un ennemi qui enchaîne l'annonce d'abord, avec l'état de combat « Chaîne ». Au tour suivant, il enchaîne un compagnon : sur sa carte, le compte devient « ⛓️ 2 r ».
- Un compagnon enchaîné ne joue plus pendant 2 rounds. La chaîne cède plus tôt si l'ennemi qui la tient perd 15 % de ses PV max, et elle tombe avec lui.
- **Le héros n'est jamais enchaîné** : « Je ne tiens pas ceux qui reviennent. »
- Qui enchaîne : les Nécromanciens de « Les maillons » et de « Celui qui retient », qui enchaînent au lieu d'appeler, et le Nécromancien suprême, tous les 3 rounds.
- Nouvelle condition du Grimoire, « Un compagnon est enchaîné ». L'action de la règle vise l'ennemi qui tient la chaîne.

## Le Nécromancien suprême
- **Au premier coup**, deux morts dorment à ses pieds.
- **À 75 %, puis à 50 % de ses PV**, il tire : les dormeurs se lèvent, et deux autres morts arrivent endormis s'il reste de la place (3 ennemis au plus).
- **À 25 %**, il tire tout : les dormeurs se lèvent, et sa chaîne prend désormais les deux compagnons à la fois.
- Si Ysolt est dans le groupe, c'est elle qui annonce la chaîne dans le journal : « Il lève la main gauche. »

## Le choix « bat » (Donner + Soi / Garder + Aeswyn)
- **Réveiller les montés** :
  - *Ce qu'elle prend* : une fois, un quart d'un niveau de Mémoire est retiré de la jauge, seulement sur la part au-delà du dernier niveau atteint. On ne perd jamais un niveau.
  - *La garde des montés* : ensuite, dans chaque combat de boss et d'élite, un monté se lève au premier round. Pendant 3 rounds, au tour du boss ou de l'élite, il frappe pour 3 % des PV max. Il n'achève jamais.
- **Laisser battre** :
  - *La table des noms* : chez Orwen, une Cire consacrée par jour, versée au premier changement d'onglet de la journée.
  - **Le carnet de Wenna** apparaît dans le Codex.
- Selon le choix de l'acte III :
  - **Garder puis Réveiller** : Ysolt se lève avec les autres. C'est du texte seulement, elle ne redevient pas compagne.
  - **Donner puis Laisser battre** : Ysolt dit « Dis mon nom quelque part où il y a du pain ».
  - Les deux fins « Laisser battre » se terminent à Aeswyn, sur le pain et le chat.
- **Dans les deux branches** : *Le maillon*, une bague Épique de Wenna (critique, dégâts critiques +15 %, or +5 %).

## Mesures (banc `crypte-acte3-bench.js --quete`, profil Épique, Wenna et Maddoc, 12 runs)
- **Les maillons** :
  - au réglage de départ (×2,2 / ×5,4) : 100 % de réussite, 60 à 69 % des PV à la fin ;
  - retenu **×2,8 / ×6,8** : toujours 100 %, mais 41 à 59 % des PV à la fin, avec 2,6 à 3,4 tours enchaînés par run.
  - C'est la même limite qu'aux actes I et II : à cette difficulté, le Chevalier tombe avant le Rôdeur et le Mage.
- **Celui qui retient** :
  - au réglage de départ (×1,8 / ×0,9) : 58 / 100 / 100 % de réussite (Chevalier / Rôdeur / Mage) ;
  - retenu **×2,1 / ×0,8** : **75 / 92 / 100 %**, avec 38 à 50 % des PV à la fin, en 44 à 47 rounds. Le Mage reste au-dessus de la cible.

## Code
**Aucun fichier protégé n'a été touché, et aucun fichier JS ou CSS n'a été ajouté.**
- **Systèmes** :
  - `sleep-system.js` : les chaînes, les lignes du carnet, la garde des montés, `chainBoth`, et les phases de boss qui réveillent avant de coucher les nouveaux venus ;
  - `companion-system.js` : un compagnon enchaîné saute son tour ;
  - `combat-auto-policy-system.js` et `class-combat-system.js` : la condition « Un compagnon est enchaîné ».
- **Données** :
  - `adventure-quests.js` : `aq_crypte_maillons` et `aq_crypte_retient` ;
  - `scene-templates.js` et `pa2-maps.js` : le parcours ;
  - `living-maps.js` : `chainTrace` ;
  - `story-quests.js` : les étapes 16 à 20, le choix « bat », ses textes et la fin du chapitre ;
  - `elites.js` : *Le maillon* ;
  - `codex.js` : le carnet de Wenna ;
  - `grimoire-conditions.js` et `combat-states.js` : la condition et l'état « Chaîne ».
- **Interface** :
  - `combat-screen-view.js` : l'état « Chaîne » sur l'ennemi et le compte « ⛓️ » sur la carte du compagnon ;
  - `living-map-view.js` et `04-panel-living-map.css` : le tracé de la chaîne ;
  - `grimoire-view.js` : le libellé court de la condition ;
  - `ui-root.js` : la remise de la table des noms ;
  - `03-combat-screen.css` : la couleur du compte « ⛓️ ».
- **Sauvegarde** : aucun nouvel état sauvegardé hors de ceux qui existent déjà. Le jour de la table des noms est noté dans `explorationProgression`.
- **Langue** : `en.js` (137 textes) et `data-fields.js`. L'audit i18n donne 0 manquant et 0 orphelin.
- **Outils** : la section [244] du harnais, et l'option `--quete` du banc `crypte-acte3-bench.js`.

## Non fait
- Les hauts faits proposés (« Celui qui retient », « Personne ne reste ») ne sont pas créés, comme pour le Maître d'œuvre.

## Images à fournir (icône générique en attendant)
- `Icons/combat_status/chained.png` : l'état « Chaîne », la condition du Grimoire et le tutoriel.
- `Maps/parcours/le_long_de_la_chaine.jpg` (1024 × 1536) : le fond du parcours de l'étape 17. La piste est provisoire, elle sera relevée sur l'image.

# Aethervale v3.433.0 — Ruines, acte IV (livraison 2) : le Maître d'œuvre, le plan, la fin du chapitre III

Fin du chapitre III, « La ville rangée ». Textes : document « Ruines — Acte IV » v1.0 (validé par Seb le 09/10/2026). Choix du plan : option A du 09/10. S'applique sur la v3.432.0.

## L'histoire : les deux dernières étapes (ruines_19 et ruines_20)

| # | Étape | Ce qu'elle fait jouer |
| --- | --- | --- |
| 19 | Le plan fait pierre | Deux rencontres dans le Cœur, puis **le Maître d'œuvre**, boss d'Histoire unique. Tutoriel « Le Maître d'œuvre » |
| 20 | Ce qui tient | Le troisième choix des Ruines, **le plan**, sans combat. **L'arme du Cœur** d'Edda. Sarkel ferme le chapitre |

- Le chapitre III compte ses **20 étapes**. Fin affichée : « Chapitre terminé — d'autres sont montés avant lui. » C'est l'amorce de la Crypte.
- **Conséquence différée du choix « salle »** : si la salle a été rouverte à l'étape 14, la chaise qui manquait est au pied de l'arche quand le Maître d'œuvre se lève.
- Récompenses provisoires :
  - étape 19 : 3 800 or et 2 Clés de voûte ;
  - étape 20 : 4 500 or et l'arme du Cœur.

## Le Maître d'œuvre
- « Le plan fait pierre » : ce n'est pas un homme, c'est la cité, debout. Il craint l'épée et résiste à la magie.
- Trois phases :
  1. **il se relève une fois, quoi qu'il arrive**, avec la moitié de ses PV. Rien ne l'achève à terre, ni une règle, ni le toucher, ni Edda ;
  2. à la relève, **deux bâtisseurs** sortent des dalles ;
  3. à 30 % de sa seconde vie, **il se blinde**.
- Ces phases vivent dans sa fiche (`BOSS_DB`) et sont jouées par `rise-system.js` à la relève. **Aucune modification de `combat-engine.js`** : les renforts passent par `summonAdds`, la phase de blindage par `checkPhases`.

## Le plan (Donner / Garder et Soi / Aeswyn)

| Branche | Effet | Registre |
| --- | --- | --- |
| **Finir la cité** | **La carte se fige** : plus de chantier errant, plus d'Éboulement. **Le Cœur rapporte 3 Pierres errantes par jour**, au premier passage sur la carte. Le Veilleur s'assoit sur son banc | Donner + Soi |
| **La laisser tomber** | **Quatre quartiers passent en éboulis** : l'escalier, la bibliothèque, la carrière et les échafaudages. La carrière et les échafaudages perdent leur effet tenu. Chaque victoire dans un éboulis rapporte **+2 Pierres errantes**. Le chantier et l'Éboulement continuent. **À Aeswyn, la clé du Cœur** : les chantiers en Clés de voûte en demandent une de moins (au moins une), et la reforge 7 n'en coûte plus | Garder + Aeswyn |

Dans les deux branches : Edda reste, donne l'arme du Cœur, et Sarkel ferme le chapitre.

## L'arme du Cœur
- **Premier objet Épique du jeu**, donné par Edda dans les deux branches.
- Lame, Arc ou Bâton du Cœur selon la classe.
- Valeur 110 : c'est le bas de l'Épique aux Ruines (49 × 2,2). Affixes : dégâts +20 % et expérience +5 %.
- Remise après le Maître d'œuvre : aucun banc de l'Histoire ne bouge.

## Équilibrage (banc `ruines-acte3-bench.js --golem --quete aq_ruines_plan`, 24 runs, Wenna + Maddoc)

| Réglage du boss (PV, puissance) | Chevalier | Rôdeur | Mage |
| --- | --- | --- | --- |
| ×4 / ×1,7 (Nezzam) | 0 % | 0 % | 0 % |
| ×2 / ×1 | 13 % | 38 % | 81 % |
| ×1,6 / ×0,8 | 88 % | 100 % | 100 % |
| **retenu : ×1,8 / ×0,9** | **71 %** | **88 %** | **100 %** |

- Sa relève vaut déjà une demi-barre de PV, et la pente est raide : un cran de plus le rend injouable.
- Le Mage est le plus à l'aise, comme contre Nezzam.
- Gains de la carte (3 par jour, +2 par éboulis) et remise de la clé du Cœur : provisoires, à juger en jeu.

## Code
- `rise-system.js` :
  - la relève forcée (`riseForced`) ;
  - `onBossRisen` : la ligne, les renforts et les phases de la seconde vie.
- `living-map-system.js` :
  - `getPlan` et `collectFinishedCity` ;
  - pas de chantier ni d'Éboulement si la cité est finie ;
  - gain des éboulis.
- `village-building-system.js`, `forge-system.js` et `ui/village-building-view.js` : la clé du Cœur.
- Données :
  - `bosses.js` (le Maître d'œuvre), `adventure-quests.js` (`aq_ruines_plan`), `elites.js` (`arme_coeur`) ;
  - `living-maps.js` (`plan`, `effectLostOnChoice`) ;
  - `story-quests.js` (étapes, textes, axe `plan`) ;
  - `lang/data-fields.js`.
- **Aucun fichier protégé touché. Aucun fichier ajouté. Aucun nouvel état sauvegardé** : le choix passe par le registre, et la paie du jour par `game.livingMaps.ruins.coeurDay`, dans le bloc des cartes déjà sauvegardé.

## Images à fournir (avec les précédentes)
- `images/Boss/maitre_oeuvre.jpg` : le Maître d'œuvre.

## Contrôles
- Round : **4 058 OK**, 0 échec, sur deux passes. Nouvelle section [209] (30 contrôles).
- Boot : 4 OK. Création du héros : 44 OK.
- i18n : 4 446 textes, 100 %, 0 orphelin. 61 nouvelles traductions anglaises.
- Chromium (390×844), vrai jeu : la carte du choix du plan, console sans erreur.
- Parcours : 123 OK. L'échec P7 est antérieur, inchangé.
- `node --check` sur tous les fichiers modifiés.

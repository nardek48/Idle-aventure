# v3.488.0 — Montagne, lot M-2 : acte I « La montée »

Le chapitre V s'ouvre à la fin de la Crypte. Ses cinq premières étapes suivent le document « Montagne — Acte I » v1.0, validé par Seb le 25/10/2026. Aucun fichier protégé n'est touché, et aucun fichier du jeu n'est ajouté.

## Deux décisions de Seb (25/10)
- **Montée, palier 3 : option A.** Le combat de parcours se joue par approche (Charger, Tenir, Ruse), pas sur le moteur. La veine y est donc **dans le texte** (« une ligne bleue court dans la roche »). La première taille se fait à l'étape 2, avec le tutoriel qui l'explique.
- **Étape 4 : option A.** À l'acte I, la Montagne n'a pas de combat libre. Les cinq veines se taillent donc dans une quête dédiée, **« Ça ne fond pas »** :
  - cinq rencontres, avec Sarkel dans le groupe ;
  - les veines se comptent depuis l'acceptation de l'étape, celles du héros comme celles de Sarkel ;
  - si la quête finit sous cinq veines, elle se rouvre.

## Les cinq étapes
1. **La roche est chaude** : la montée, un parcours de quatre paliers.
   - Elle coûte deux Rations moyennes.
   - Au palier 3, trois dragonnets.
   - Le monde est posé à l'arrivée : `travelOnSuccess` vers la Montagne, drapeaux `mountainReached` et `mountainCrossingCompleted`.
   - Il n'y a pas de source : rien n'est rendu après le combat, comme à la descente de la Crypte.
2. **Ce qui affleure** : cinq rencontres aux Pentes de cendres, une veine dans chacune. Le tutoriel **« Les veines »** s'affiche à l'acceptation.
3. **Celui qui taille** : **Sarkel rejoint le groupe**.
   - Sur la carte d'étape, le choix « Deux sur cinq » désigne qui l'accompagne. Ysolt n'est proposée que si elle est restée.
   - Il y a ensuite quatre rencontres avec lui.
   - Le tutoriel « Deux sur cinq » donne le vrai nombre de compagnons : quatre si Ysolt est partie, cinq sinon.
4. **Ça ne fond pas** : tailler cinq veines (toi ou Sarkel). Puis, à Aeswyn, Brannoc ne fond pas l'éclat. L'étape rapporte 4 Cendres vives.
5. **La première veine** : premier choix pesant de la Montagne, clé `veine`, axe Soi / Aeswyn.
   - *La veine dans la lame* : +20 % de lame par taille.
   - *Le puits chaud* : une Cendre vive de plus par taille.

   Les deux effets étaient déjà lus par les veines depuis la v3.487.0. Ils s'affichent dans Héros › « Ce que tu portes ».

Après l'étape 5 : « La suite de l'histoire arrive bientôt… ». Comme l'exige le document, Ysolt n'a aucune réplique dans cet acte.

## Sarkel, cinquième compagnon
- **Rôle :** Celui qui taille. Il frappe peu (puissance 34, endurance 54).
- **Coup de pioche :** une fois par combat, il taille la veine à ta place.
  - Tu gagnes la Cendre sans perdre ton coup.
  - La chaleur monte.
  - La lame reste au héros : elle ne grandit que quand c'est toi qui tailles.
- **Charge en plus :** la Mémoire « Une charge de plus » **ne double pas** Coup de pioche, qui reste à une fois par combat (MT5).
- **Groupe :** il ne quitte pas le groupe pendant les étapes 3 et 4.
- **Prix :** ses améliorations vont de 1 920 à 20 000 or. Ses répliques de combat sont provisoires.
- **Patrouilles :** il y est accordé au masculin.
- **Composition :** l'écran a été vérifié à 320 px avec quatre compagnons. Aucun débordement.

## Équilibrage (au banc, sans potion, veines laissées)
Les mesures partent des **vraies sauvegardes de fin de Crypte** des trois classes, faites par la campagne. Le banc vise 25 à 35 % des PV en fin d'étape, aucun mort, 3 à 5 rounds par combat.

**La montée** : multiplicateur ×1,5, mesuré en campagne. PV restants à l'arrivée :

| Réglage | Chevalier | Rôdeur | Mage |
| --- | --- | --- | --- |
| ×1,7 | 20 à 25 % | 36 à 44 % | 1 à 5 % |
| ×1,5 (retenu) | 46 à 54 % | 34 à 48 % | 25 à 41 % |

À ×1,7, le Mage arrivait presque mort. ×1,5 reste un peu au-dessus de la cible, comme la descente de la Crypte.

**Les quêtes** (PV ×1,6 et puissance ×8 à l'étape 2 ; ×1,5 et ×4 aux étapes 3 et 4) :

| Quête | Réussite (Ch. / Rô. / Ma.) | PV restants (Ch. / Rô. / Ma.) | Rounds par combat |
| --- | --- | --- | --- |
| Ce qui affleure | 100 / 92 / 92 % | 41 / 53 / 36 % | 3,5 à 4,9 |
| Celui qui taille, Sarkel et Wenna | 100 / 100 / 75 % | 53 / 60 / 30 % | 3,2 à 4,8 |
| Celui qui taille, Sarkel et Maddoc | 100 / 100 / 100 % | 62 / 66 / 31 % | 3,2 à 4,8 |
| Ça ne fond pas, Sarkel et Wenna | 100 / 92 / 92 % | 53 / 58 / 19 % | 3,2 à 4,8 |

Dans « Ça ne fond pas », 4,7 à 5 veines sont taillées.

- **Écart entre classes :** il est du même ordre qu'à la Crypte. Sarkel n'a ni soin ni garde : avec lui, le Mage souffre le plus.
- **Campagne au robot** (avec potions), deux parties par classe : l'acte I passe sans échec et sans mur, et « Ça ne fond pas » se fait en un passage.
- **À savoir : tailler coûte en combat.** Avec la règle « Veine intacte → Tailler », chaque combat dure plus longtemps et la réussite baisse (Mage : 58 % à l'étape 2). La lame +15 % ne rattrape ni le coup perdu ni la chaleur. Tailler rapporte de la Cendre, pas de la facilité. C'est la règle de l'atelier, mais elle est à juger en jeu.

## Code
- `data/story-quests.js` :
  - chapitre `mountain` et récompenses `montagne_01` à `montagne_05` (provisoires) ;
  - choix `veine` ;
  - aides `storySarkelInParty`, `storyVeinsCut`, `storyVeinesRelance` et textes des branches.
- `data/scene-templates.js` : `traversee_montagne`. `data/scene-nodes.js` : trois gabarits de la montée. `data/pa2-maps.js` : piste provisoire de `montagne_montee`, à relever quand l'image arrivera.
- `data/adventure-quests.js` : `aq_montagne_pentes`, `aq_montagne_sarkel`, `aq_montagne_veines`.
- `data/companions.js` (Sarkel, rôle `cutter`) et `systems/companion-system.js` (Coup de pioche, groupe tenu, charge en plus exclue).
- `data/patrols.js`, `ui/heros-screens-view.js` (deux effets dans « Ce que tu portes »).
- `lang/en.js` : 118 textes. `lang/data-fields.js` : trois tables déclarées.
- Rien de nouveau dans la sauvegarde : la base du compteur des veines est rangée dans les compteurs du chapitre (`storyQuests.mountain.counters.veinsBase`), déjà sauvegardés.

## Images à fournir (prompts dans « Images à faire »)
Sans elles, le jeu affiche l'icône générique.

**Nouvelles dans ce lot :**
- `combat_status/vein_heat.webp` : la chaleur, pour le tutoriel ;
- `companions/sarkel_coup_de_pioche.webp` ;
- `traits/veine_dans_la_lame.webp` et `traits/puits_chaud.webp`.

**Toujours attendues :** le portrait de Sarkel, le fond `montagne_montee`, les icônes « Tailler » et « Veine intacte », la Cendre vive et l'Obsidienne taillée.

## Outils
- `tools/sim/montagne-acte1-bench.js` (nouveau, outillage) : les trois quêtes sur le vrai moteur, à partir de sauvegardes réelles. Options `--save`, `--enc` / `--enc2` / `--enc3`, `--tailler`.
- `tools/sim/campagne-harness.js` :
  - le chapitre `mountain` et ses solveurs ;
  - `SAVE_IN=<fichier>` reprend une sauvegarde de campagne ;
  - `TRACE_PA2=1` affiche l'estimation des combats de parcours.
- `round-harness.js` :
  - nouvelle section [310] (21 contrôles : chapitre, montée, quêtes, Sarkel et Coup de pioche, charge en plus, groupe tenu, Deux sur cinq, tutoriel, compteur et réouverture de l'étape 4, choix `veine`, patrouilles) ;
  - [262] passe de 14 à 16 effets dans « Ce que tu portes ».

## Contrôles
- `node --check` sur chaque JS modifié ou ajouté.
- round-harness 4963 OK, 0 échec (deux passes) ; boot, création du héros, parcours OK.
- i18n : 100 %, aucun orphelin.
- Chromium, vrai jeu, à 390 et 320 px, sur la sauvegarde de fin de Crypte :
  - la montée se lance depuis la carte d'étape ;
  - Sarkel rejoint le groupe et s'affiche avec l'icône générique ;
  - le choix « Deux sur cinq » propose Wenna, Maddoc et Edda (Ysolt partie) ;
  - en combat, Sarkel taille la veine au premier round (« Tailler · encore 2 ») ;
  - aucune erreur.

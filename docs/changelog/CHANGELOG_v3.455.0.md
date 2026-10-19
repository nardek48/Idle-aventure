# Aethervale v3.455.0 — Crypte, lot C-4 : acte III « L'Ossuaire »

Texte de l'acte III validé par Seb le 19/10/2026 (document « Crypte — Acte III »), avec l'option A pour la branche Garder : Ysolt quitte le groupe pour de bon, et son carquois compense. Également retenus : une reprise gratuite de la Mémoire 15 après Garder, un palier de 3 Épiques avec la Forge 5 et l'arme reforgée à 9, et la Pleureuse à la fois au donjon et dans la quête de l'étape 14. S'applique sur la v3.454.1.

## Les cinq étapes
11. **Les os rangés** : libérer « Les côtes » sur la carte vivante de la Crypte.
12. **L'Ossuaire** : le donjon 4 s'ouvre. Il faut atteindre son campement dans un même run, c'est-à-dire vaincre le Porte-couronne (vague élite 8).
13. **La cire qui ne coule plus** : le palier Épique. Il demande 3 pièces Épiques portées (l'arme du Cœur compte), la Forge 5 et l'arme reforgée à 9. « Ce qui manque » dit où chercher.
14. **Ce qu'elle garde** : la quête de la Pleureuse (3 rencontres, puis elle, avec Ysolt dans le groupe), puis le choix « ysolt » :
    - **La laisser se recoucher (Garder)** : Ysolt quitte le groupe pour de bon. On reçoit **le carquois d'Ysolt**, une amulette Épique (critique, +6 % de PV max). Porté, il retarde d'un round le réveil des dormeurs. La Mémoire 15 peut alors être reprise **une fois, sans frais**.
    - **La garder éveillée (Donner)** : Ysolt reste. *Pas encore* sert deux fois par combat, et Ysolt n'a plus que 85 % de ses PV.
15. **La Liche des sépulcres** : terminer l'Ossuaire. Sur la branche Garder, Edda reprend les répliques d'Ysolt.

Les étapes 11 et 12 donnent chacune une pièce Épique. Le plafond de talents de l'acte III est de 18.

## L'Ossuaire (donjon 4)
- Matériau du donjon : Cire de sépulcre (×3). Ennemis : spectres, âmes en peine, nécromanciens, chevaliers morts. Butin jusqu'à Épique.
- **Le Porte-couronne** (vague élite 8) : chaque fois qu'il est frappé, il réveille un dormeur de son escorte, sans or en plus, au plus une fois par round.
- **Le campement** est après la vague 8.
- **La Pleureuse** (vague élite 12) : elle commence à pleurer, puis endort un compagnon au tour suivant. Ce compagnon saute un tour.
- **La Liche des sépulcres** a trois phases :
  - à 80 %, elle couche deux morts à ses pieds, endormis ;
  - à 60 %, elle les réveille tous ;
  - à 30 %, elle se recouche à moitié : pendant 2 rounds, elle ne frappe pas mais se soigne de 4 % de ses PV par round.
- Les dormeurs n'apparaissent que dans les escortes d'élites et dans les renforts de la Liche, pas à chaque vague : les vagues normales du donjon n'ont qu'un ennemi.
- Le texte prévoyait deux phases pour la Liche. La phase à 80 % a été ajoutée pour que la phase à 60 % ait des morts à réveiller.

## Forge 5 et Cire consacrée
- La **Cire consacrée** se coule à la Fonderie : 3 Cires de sépulcre et 2 lingots, en 30 s.
- La **Forge 5** coûte 11 000 or, 400 pierres, 100 aciers et 3 Cires consacrées. Le plafond de la Crypte est réglé au niveau du monde : Forge 5.
- Les **reforges 9 et 10** demandent de la Cire consacrée, à la place de la Clé de voûte (qui reste demandée pour les reforges 7 et 8).

## Mesures (banc `crypte-acte3-bench.js`, nouveau)
- **Ce qu'elle garde**, au profil Épique, avec Ysolt et Maddoc, sur 12 runs. Ajustée une fois, de ×1,8 / ×4,6 (Pleureuse p2,9 e2,6) à **×2,1 / ×5,3 (Pleureuse p3,3 e3,0)** :
  - Chevalier : 75 % de réussite ;
  - Rôdeur : 92 % ;
  - Mage : 83 % ;
  - 44 à 56 % des PV à la fin.
- **L'Ossuaire**, sur 10 runs, avec Wenna et Maddoc, en soufflant à la halte :
  - **au palier Rare** (entrée de l'étape 12) : 100 % des runs atteignent le campement, à 48-57 % des PV. La Liche tombe dans 30 à 70 % des runs, ce qui est attendu avant le palier ;
  - **au palier Épique**, avec la Liche ajustée de p0,6 e0,7 à **p0,72 e0,82** : elle tombe dans 80 % des runs pour le Chevalier, 60 % pour le Rôdeur et 90 % pour le Mage, avec 38 à 51 % des PV à la fin et 1,1 à 1,3 potion par run.

## Code
- **Données** :
  - `dungeon.js` : l'Ossuaire ;
  - `elites.js` : le Porte-couronne, la Pleureuse et le carquois d'Ysolt ;
  - `village-buildings.js` : la Forge 5 ;
  - `workshops.js` : la Cire consacrée ;
  - `world-caps.js` : Forge 5 et talents à 18 ;
  - `companions.js` : Ysolt (`departsOnChoice`, `choiceMods`) ;
  - `memory.js` : la Mémoire 15 (`freeRepriseOnChoice`) ;
  - `adventure-quests.js` : `aq_crypte_pleureuse` ;
  - `story-quests.js` : les étapes 11 à 15, le palier Épique, le choix « ysolt » et ses textes.
- **Systèmes** :
  - `sleep-system.js` : Porte-couronne, Pleureuse, phases de la Liche, carquois ;
  - `boss-moment-system.js` : il transmet les phases de boss au système des dormeurs ;
  - `companion-system.js` : départ, modificateurs d'un choix, compagnon endormi ;
  - `forge-system.js` : la Cire consacrée ;
  - `memory-system.js` : la reprise offerte ;
  - `ascension-view.js` : la note sur la reprise offerte, et pas de confirmation quand elle est gratuite.
- Les phases de la Liche passent par `BossMomentManager.onPhase`. **Aucun fichier protégé n'a été touché.**
- Langue : `en.js` (environ 100 textes) et `data-fields.js` (`STORY_YSOLT_TEXTS`). L'audit i18n donne 0 manquant et 0 orphelin.
- **Aucun fichier JS ou CSS ajouté au jeu.** Outils : `tools/sim/crypte-acte3-bench.js` (nouveau) et la section [243] du harnais.

## Images à fournir (icône générique en attendant)
- `Boss/liche_sepulcres.jpg` (la Liche)
- `Enemies/elite_porte_couronne.jpg` et `Enemies/elite_pleureuse.jpg` (portraits)
- `Icons/quest_icons/elite/elite_porte_couronne.png` et `Icons/quest_icons/elite/elite_pleureuse.png` (icônes de quête)

Le carquois d'Ysolt utilise pour l'instant l'icône d'amulette générique. Il n'y a pas de repère de l'Ossuaire sur la carte vivante.

# v3.517.0 — Correctifs de l'audit, lot 1 : textes factuels

Audit complet du 27/10 (`Aethervale_Audit_2026-10-27_v3515_0.md`), lot 1 : les textes qui contredisent le moteur, en français et dans `en.js`. Aucune règle de jeu ne change. Le tutoriel d'onboarding n'est pas réécrit : seules les erreurs de fait sont corrigées.

## Ce qui change en jeu
- **Amélioration (TUT-2, forest_03)** : une ligne de plus : « Ta stat principale, marquée à l'écran, fait l'essentiel de tes dégâts : Force pour le Chevalier, Célérité pour le Rôdeur, Volonté pour le Mage. »
- **Premier combat (TUT-10, TUT-11, forest_02)** : « Défense (Garde, Esquive ou Barrière arcanique selon ta classe) ». La jauge de célérité « se remplit quand tu frappes (attaque ou compétence de dégâts) », et non plus « à chaque round ». La progression affiche « Ennemis 0/5 » au lieu de « Kills ».
- **« Clique » → « Touche »** : ration (forest_08) et récolte (Village & Production).
- **Campement (oubli TUT-1)** : le feu soigne « hors combat et hors sortie (expédition, donjon, Petite Aventure) ».
- **Tanière (QUE-8, QUE-9, forest_14)** : plus de « ticket » (supprimés en v3.358) ni de « marques n'y ont pas cours » (elles existent au donjon), ni d'accord au masculin. Objectif : « Vaincre le Basilic au bout de la Tanière ».
- **Progressions nommées** : « Basilic 0/1 », « Prouver sa valeur 0/1 », « Source 0/1 », « Veine 0/1 » au lieu de « 0/1 ».
- **Accords neutres (QUE-8)** : desert_15 « depuis ton arrivée » ; piège de Petite Aventure « l'effet joue et te blesse ». « Ta lame » reste à la Montagne : c'est le nom de la mécanique des veines (MT2).
- **Wenna (QUE-14, option A)** : « Mener 3 combats avec Wenna », car le compteur avance dès qu'un ennemi tombe.
- **Quêtes du village (TUT-3, TUT-6, QUE-7)** :
  - zones : 3 ouvrables en Forêt, les autres dans les mondes suivants ; niveau 5 en Forêt, plafond qui monte à chaque monde ; coût ×1,15 (et non ×1,4) ;
  - ateliers : niveau 2 en Forêt, 3 ensuite ; « jusqu'à −32 % » et « comme les zones » retirés ;
  - la Carrière est dite « ouverte par l'expédition de la Veine instable ».
- **Ressources (TUT-8, RES-6, SUI-8)** :
  - rations : plus de « chasse » (donjon et élite rejoués, expéditions ou traversées) ;
  - Chitine : reforges 5 et 6 ; Verre trempé et Clé de voûte : reforges 7 à 12 ; Bloc taillé : jusqu'aux derniers paliers ;
  - Résine durcie : reforges, rangs des compétences et hauts paliers ;
  - Cire consacrée : à la Fonderie, avec de la Cire de sépulcre et du Lingot ;
  - Cendre vive : caravane longue au Marché de la Montagne.
- **Caravanes (oubli)** : ruines_04, crypte_04 et montagne_07 précisent que la matière rare ne vient qu'au trajet Long (Halle 3). Sarkel (crypte_04) demande « Du blé, surtout. On en fera du pain. » : la caravane ne prend que des matières brutes.
- **Palier Épique (oubli, montagne_09)** : le tutoriel et « Ce qui manque » citent d'abord les élites de la carte (35 % par victoire), l'échoppe ensuite, « à prix fort ».
- **Fiche Entrepôt (oubli)** : la Taverne n'est citée que si un de ses contrats demande la ressource (pas pour les rations ni l'Outre).
- **Donjon (DUR-12)** : « +1 place de Petite Aventure en réserve, par niveau ».
- **Clé économe (SUI-7, option A)** : « La Forge 4, la Halle 9 et 10 et la reforge 8 demandent une Clé de voûte de moins (jamais moins d'une ; sur la reforge, ne s'ajoute pas à la clé du Cœur). »

## Code
- Données : `story-quests.js`, `village-quests.js`, `hunt-quests.js`, `dungeon.js`, `memory.js`. Vues : `tutorial-view.js`, `warehouse-view.js`. Commentaire périmé : `warehouse-system.js` (plafond des matières brutes).
- `en.js` : 34 clés renommées et traduites, 2 ajoutées. i18n à 100 %, 0 orphelin.
- `tools/audit/i18n-audit.js` : motifs à relire (accord masculin, « vivant », « chasse », « ta lame »), en information, détail avec `--detail`.
- Harnais [338] ; [62b], [63] et [302] mis à jour. Aucun fichier ajouté, aucun fichier protégé.
- Restent à Seb : les titres des tutoriels et des badges (onboarding), le renommage de la zone d'aventure des Ruines.

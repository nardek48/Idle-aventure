# Aethervale v3.430.0 — Ruines, acte III (livraison 1) : la porte, le Sanctuaire scellé, le campement

Première livraison de l'acte III des Ruines, « Le cœur de pierre ». Textes : document « Ruines — Acte III » v1.0 (validé par Seb le 09/10/2026). Campement : RU13 (Conception Ruines v1.4) et feuille validée à l'atelier (`atelier/campement-sanctuaire.html`). S'applique sur la v3.429.24.

## L'histoire : deux étapes de plus (ruines_11 et ruines_12)

| # | Étape | Ce qu'elle fait jouer |
| --- | --- | --- |
| 11 | La porte qui descend | Libérer « La porte du Sanctuaire » sur la carte des Ruines |
| 12 | Sous la ville | Le Sanctuaire scellé s'ouvre ; atteindre le campement (élite de la vague 8). Tutoriel « Le campement » |

- Chacune donne **une pièce Rare**, posée sur un emplacement qui n'en a pas (hors arme), pour le palier de l'étape 13.
- Récompenses provisoires : 2 700 et 2 800 or, 2 Pierres errantes.
- Fin affichée en attendant la livraison 2 : « La suite de l'acte III arrive bientôt. »
- La porte du Sanctuaire n'est **jamais** reprise par le chantier errant (« la seule porte qu'aucun chantier ne touche »).

## Le Sanctuaire scellé (donjon 3)
- **Ouverture par l'Histoire** à `ruines_12`, comme la Cité engloutie. Entrée offerte pendant les étapes 12 et 15.
- **Pool des Ruines** : squelette et zombie (se relèvent), goule, gargouille (blindée).
- **Vague 8 : le Contremaître**, élite escortée d'un Bâtisseur et d'un squelette. Une élite ne peut pas porter le trait « Bouclier » : c'est son Bâtisseur qui pose le mur, souvent sur lui.
- **Vague 12 : le Golem**, lent, lourd, escorté d'un zombie. Le même reviendra à l'étape 14.
- **Boss : Varrek, le Garde scellé.** Seigneur squelette, Blindé, il **se relève une fois**.
- Butin jusqu'au Rare ; **2 Pierres errantes** en fin de run.

## Le campement
- Après la vague 8, le run s'arrête dans la salle de garde. **Le butin de l'étape 1 est mis en sûreté** (banqué tout de suite), avec une Pierre errante.
- Une feuille sans croix, **une seule action** :
  - **Souffler** : le groupe reprend 40 % de ses PV, compagnons compris ;
  - **Changer de compagnon** : deux sur trois ; celui qui arrive descend **à PV pleins** ;
  - **Sortir** : le run s'arrête, la part de l'étape 1 est payée **sans la moitié de la fuite**.
- **Mort dans l'étape 2** : seul le butin d'en bas est perdu.
- Une partie rechargée à la halte rouvre la feuille.

## Équilibrage (banc, provisoire)
Nouveau banc : `tools/sim/ruines-acte3-bench.js` (Sanctuaire complet, campement compris, Wenna + Maddoc, Grimoire auto).

| Profil | Campement atteint | Varrek vaincu (Chev. / Rôd. / Mage) |
| --- | --- | --- |
| Fin d'acte II | 100 %, 71-80 % de PV | 42 / 25 / 63 % |
| Palier Rare visé | 100 %, 78-83 % de PV | 71 / 54 / 67 % |

- Varrek : puissance ×0,8, endurance ×0,6. Sa relève vaut une demi-barre de PV. À 1 / 1, il n'était vaincu que 8 à 42 % du temps.
- **Le Rôdeur reste sous sa cible** (54 % pour ≥ 60 %). Le profil Rare n'est qu'une approximation tant que la Forge 4 n'existe pas : **à recaler en livraison 2**, sur le vrai palier.
- Le Contremaître et le Golem gardent leurs chiffres de départ ; le campement est atteint dans tous les runs mesurés.

## Code
- `dungeon-system.js` (fichier protégé, **accord de Seb du 09/10**) :
  - le campement : `reachCamp`, `campAction`, `isCampPending`, `campCandidates` ;
  - la sortie « camp » dans `finish` ;
  - la relève du boss (`rises`) ;
  - la feuille rouverte au rechargement.
- `sortie-system.js` : `SortieManager.secure()` met le sac en sûreté sans clore la sortie.
- `ui/dungeon-view.js` et `css/04-panel-dungeon.css` : la feuille du campement, et une ligne « En sûreté au campement » dans le rapport de fin.
- `living-map-system.js` : `noChantier` sur un quartier.
- Données : `story-quests.js`, `dungeon.js`, `elites.js` (Contremaître, Golem), `living-maps.js`.
- **Aucun fichier ajouté au jeu** ; `sw.js` et `index.html` ne changent que par la version.
- **Aucun nouvel état sauvegardé hors bloc** : le campement vit dans `game.dungeonRun`, déjà sauvegardé en entier, et le drapeau de l'étape 12 dans `game.explorationProgression`.

## Images à fournir
- `images/Boss/varrek.jpg` : Varrek, le Garde scellé.
- `images/Enemies/elite_contremaitre.jpg` et `images/Icons/quest_icons/elite/elite_contremaitre.png`.
- `images/Enemies/elite_golem.jpg` et `images/Icons/quest_icons/elite/elite_golem.png`.

En attendant, l'icône générique s'affiche et le vrai chemin est conservé.

## Contrôles
- Round : **3 990 OK**, 0 échec, sur deux passes. Nouvelle section [206] (23 contrôles). Trois contrôles mis à jour : donjon 3 avec verrou d'Histoire et Pierre errante, chapitre de plus de dix étapes.
- Boot : 4 OK. Création du héros : 44 OK.
- i18n : 4 282 textes, 100 %, 0 orphelin (Gardien scellé et l'ancienne fin d'acte II retirés). 64 nouvelles traductions anglaises.
- Chromium (390×844), vrai jeu :
  - feuille ouverte à la halte, aperçu de Souffler, échange Wenna → Edda ;
  - reprise en vague 9 ;
  - aucun défilement horizontal, console sans erreur.
- Parcours : 123 OK, **1 échec antérieur à cette livraison** : P7, clic sur une case de la besace en Petite Aventure. Il échoue aussi sur la v3.429.24 sans ces changements.
- `node --check` sur tous les fichiers modifiés.

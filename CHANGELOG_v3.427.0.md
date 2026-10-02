# Aethervale v3.427.0 — Nouvel écran de combat

Ateliers CB-0 à CB-8 validés par Seb le 02/10/2026. S'applique sur la v3.426.3.

## L'écran, de haut en bas
- **Barre du haut** : le lieu (donjon, quête, monde) et la progression (« Vague 15 / 15 », « 4 / 10 »), le butin de la sortie (toucher : la feuille du sac), Fuir ou Rentrer.
- **Bandeau de la cible**, une seule fois à l'écran : nom, ÉLITE ou BOSS, pastilles d'état (toucher : la feuille des états), jauge de PV. Dessous, **les télégraphes de tout le groupe** (« Il charge ! », « Il va se soigner ! Interromps-le ! »…), avec le nom de l'ennemi quand ce n'est pas la cible. La phase d'un boss reste en pastille ; la toucher rejoue son bandeau.
- **Arène « Scène »** : les monstres sont posés dans le décor et l'arène prend toute la hauteur libre.
- **Équipe** : une carte par personnage. Le héros a une **vraie barre de PV** pleine largeur (chiffres centrés, traînée ambre de ce qui vient d'être perdu, rouge qui pulse sous 35 %), sa ressource de classe et la célérité en filet doré. Les compagnons : PV, charges, recharge.
- **Commandes en bas, sous le pouce** :
  - **Tactique** : la ligne du Grimoire dit **ce qu'il conseille et pourquoi** (« L'ennemi prépare une charge → Esquive », ou « Par défaut → Tir précis »), les 4 techniques (coût, recharge, verrou de silence), puis potion · ATTAQUER · potion.
  - **Grimoire** : une bande fine (les 4 techniques en petit, celle qui vient d'être jouée en surbrillance), la vitesse en un seul bouton (x1 → x2 → x4).

## Distance et couloirs
- La distance du moteur (`engageIn`) se voit enfin : **loin** (petit, assombri, haut dans le décor), **approche**, **au contact** (premier plan). L'ennemi avance d'un rang par round en glissant ; une charge le fait bondir devant.
- **Chaque ennemi a son couloir** (gauche, centre, droite) dès son arrivée et avance dedans. À trois, **formation en V** : les côtés devant, le centre en retrait.
- **Tireurs** (araignée, gobelin, ronces : `ENEMY_ENGAGE_ROUNDS` à 0) : ils arrivent du fond et se postent au rang « approche » avec la pastille « à distance ».
- **Boss** : il reste grand, au fond, dans le couloir central ; ses sbires se placent devant lui sur les côtés.
- **La cible passe devant tout le monde.** Chaque monstre ne se touche que dans une zone ovale : les coins de l'image ne volent plus le tap d'un voisin.
- Face au Chevalier, tout le monde commence au contact (rien ne change dans le moteur).

## Effets
- **Sur le monstre** : charge (lueur rouge, il se penche), **soin annoncé en BLEU** (colonne de lumière, cercle au sol, croix qui montent, voile — sur le monstre seul), silence (violet), bouclier qui arrive (blanc), exaltation (orange), **brûlure** (flaque de braises, teinte qui pulse, flammes décalées, pastille « 🔥 rounds »), bouclier actif (bulle bleue), vulnérable (halo rouge).
- **Chiffres** : partis du monstre touché (le moteur ne sait pas lequel : l'écran le retrouve par l'écart de PV), critiques en gros, dégâts de brûlure en orange, soins ennemis en bleu, or gagné en doré.
- **Sur les cartes d'Équipe** : coup normal (tremblement), **charge** (entaille rouge et blanche, gros chiffre, l'écran tremble), **silence** (voile violet, techniques verrouillées), **corruption** (cumuls sur le portrait, teinte à partir de 3), soin reçu (lueur verte).
- **Grimoire visible** : à chaque round en mode Grimoire, une carte « règle » s'affiche en bas de l'arène — « SI ⚡ Je suis blessé → Potion », puis la ligne du compagnon s'il a joué sa compétence. Le livre du bouton Grimoire se tourne.

## Combat en Tactique avec les compagnons
- Le héros, puis chaque compagnon : **« À toi »** sur la carte de celui qui joue, un point qui clignote sur ceux qui attendent, **✓** sur ceux qui ont joué. Toucher une carte change l'ordre.
- Tour d'un compagnon : sa compétence remplace les 4 techniques (icône, nom, charges, effet, « Le Grimoire la conseille »), et **ATTAQUER joue pour lui** (avec son portrait). « Qui soigner ? » s'ouvre quand il y a plusieurs blessés.

## Feuille « États du combat »
- **Tout ce qui est en cours, ennemi par ennemi** : pour ce run, au prochain round, ce que portent les ennemis, ce que ton équipe a posé, ce que tu subis, et **Ton équipe** (compétence, recharge, charges).
- S'ouvre depuis n'importe quel télégraphe, pastille, badge sur un monstre ou préparatif du run. Elle suit le combat tant qu'elle est ouverte.

## Nouveaux états (affichage seulement)
- **Tireur** et **Exaltation** (`COMBAT_STATES_SCREEN`, `js/data/combat-states.js`, déclaré au registre des textes). L'icône `images/Icons/combat_status/ranged.png` **est à générer** : elle s'affiche en « ? » générique en attendant (règle du 18/09).

## Code
- Nouveaux : `js/ui/combat-screen-view.js`, `css/03-combat-screen.css` (chargés après les vues de combat, précachés).
- Le moteur n'est pas touché. L'écran redéfinit les points d'entrée de rendu que le moteur, la boucle et ui-root appellent déjà (`buildCombatHTML`, `renderEnemy`, `renderEnemyHp`, `renderClassSkillButtons`, `renderCombatControls`, `renderHealButtons`, `renderActorBand`, `renderAllyRow`, `renderEnemyRow`, `renderHeroHp`, `openCombatStatesSheet`, `showFloatingDamage`, `showDamageTakenPopup`, `showGoldPopup`, `showBossPhase`). Il enveloppe `ClassCombatManager.chooseRoundAction` et `CompanionManager.takeTurn` pour lire ce que le Grimoire décide.
- Le bouton ATTAQUER garde l'id `combat-attack-btn`. Raccourcis clavier inchangés (Espace, 1-4, 5-6), affichés en mode PC.
- Aucun nouvel état sauvegardé. Le couloir d'un ennemi vit sur l'objet (`_cbxLane`).
- **Ancien code gardé pour le harnais** (à retirer au prochain nettoyage, avec ses contrôles) : les constructeurs de `combat-view.js` et `combat-group-view.js` (`buildCombatControlsHTML`, `buildCombatSortieHTML`, `buildEnemyRowHTML`, `buildAllyRowHTML`, `buildCompanionBandHTML`…), et les règles de `03-combat.css`, `03-combat-v2.css`, `03-combat-group.css` qui ne servent plus à l'écran.

## Contrôles
- Round : **3 878 OK**, 0 échec (nouvelle section [199], 22 contrôles ; contrôles de l'ancienne disposition mis à jour).
- Parcours : **139 OK** (sélecteurs du combat de groupe mis à jour). Boot 4 OK · création du héros 44 OK · campagne option A 38 / 38.
- i18n : 3 846 textes, 100 %, 0 orphelin. Couleurs en clair sous le seuil.

## À supprimer de ton côté
- Les fichiers de l'atelier : `atelier-combat.html`, `atelier/atelier-combat.js`, `atelier/atelier-combat.css`.

---

# v3.427.1 — Retours de Seb (21 h 29)

- **Héros › Sac** : après **Équiper** ou **Offrir** (une fois confirmé), la fiche de l'objet se referme et on revient directement au sac. Avant, elle restait ouverte sur « Aucun objet sélectionné ». Si l'objet est refusé (arme d'une autre classe, héros en expédition), la fiche reste ouverte.
- **Héros › Équipé** : même chose en passant par un emplacement (Comparer › Équiper) : retour à la silhouette.
- **La source tarie** (forest_07) : **+1 Petite ration** en récompense, en plus des 5 Eau, pour enchaîner sur Le sentier obstrué. L'objectif de l'étape suivante devient « Avoir 1 Petite ration et terminer l'expédition « Le sentier obstrué » », et son tutoriel le dit (« la source t'en a donné une ; les suivantes, il faudra les fabriquer »).
- Code : `confirmSellItem(uid, after)` accepte un rappel après l'Offrande ; l'écran Héros redirige les boutons du panneau d'objet (`herosItemEquip`, `herosItemOffer`) et enveloppe `equipFromCompareSheet`.
- Harnais : section [200] (4 contrôles). Round **3 882 OK** · parcours 139 · boot 4 · création 44 · campagne A 38 / 38 · i18n 100 %.

---

# v3.427.2 — Besace retenue, anneau de précision (décisions Seb, option A)

## Petites Aventures : « Comme la dernière fois »
- Dans la préparation, sous la besace : un bouton **Comme la dernière fois** remet les babioles du dernier départ. Il n'apparaît que si la besace actuelle est différente.
- Retenue **par monde** (ou par parcours), sur l'appareil (préférences, pas la sauvegarde). Enregistrée à chaque départ réussi.
- S'il manque des babioles au stock, la besace est reprise sans elles et un message le dit (« Besace reprise. Manque : … »).

## Anneau : la critique en base, l'or en affixe
- La stat de base de l'anneau devient la **chance de critique** (l'or ne jouait que sur l'or des ennemis vaincus). Fourchettes ≈ 60 % de l'amulette : commun 1-2, inhabituel 2-3, rare 3-5, épique 5-8, légendaire 8-12.
- Affixes de l'anneau : primaires dégâts plats, dégâts %, dégâts critiques ; **l'or rejoint les secondaires** (avec XP et butin). D16 inchangée.
- Vitrine de départ : l'**Anneau de cuivre** donne +1 % critique.
- Les anneaux déjà possédés gardent leur stat (or) et leur effet.
- Banc `plafond-bench` (40 runs, 18 contenus × 3 classes), avant / après : Forêt +1 point de critique, écarts dans le bruit ; fin du Désert avec un anneau inhabituel à 3 (`--ringcrit 3`, nouvelle option du banc) : 2 à 4 rounds de moins sur la Cité, réussites inchangées. Pas d'ajustement.

## Contrôles
- Harnais : sections [201] (besace) et [202] (anneau, 6 contrôles). Round **3 892 OK** · parcours 139 · boot 4 · création 44 · campagne A 38 / 38 · i18n 3 849 textes, 100 %, 0 orphelin.

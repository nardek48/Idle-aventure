# Aethervale v3.429.0 — Ruines, acte II : Le chantier

Acte II écrit et codé avec la carte blanche de Seb du 04/10/2026 (lots U-3, U-5, U-6 et U-7 de la Conception Ruines v1.3). Texte complet de l'acte : document « Ruines — Acte II » v1.0. Ce delta s'applique sur la v3.428.3.

## L'histoire : 5 étapes de plus (ruines_06 à ruines_10)

| # | Étape | Ce qu'elle fait jouer |
| --- | --- | --- |
| 6 | Les murs bougent | Première Petite Aventure des Ruines, avec la Craie d'Edda |
| 7 | La carte d'Edda | La carte des Ruines s'ouvre (2 quartiers à libérer) et avec elle le chantier errant |
| 8 | Celui qui pose les pierres | 5 rencontres face au Bâtisseur, et le réglage « Cible » |
| 9 | La porte trop haute | Le premier palier : 6 emplacements Inhabituels sur 7, arme et armure reforgées à 4 |
| 10 | La salle qu'il évite | 4 rencontres de fin d'acte ; le Veilleur dit ce qu'il veut, que la cité tienne |

- Fin du chapitre affichée : « Fin de l'acte II — la cité se souvient mieux que lui. »
- Pas de choix pesant dans cet acte : le deuxième choix est prévu en acte III.
- **Labyrinthe aux leviers (RU12) : reporté.** Il demande l'atelier et tes cartes. Il pourra s'insérer entre les étapes 9 et 10 sans rien réécrire.
- Récompenses (provisoires) : 1 900 à 2 600 or et 8 Pierres errantes. Les étapes 6, 7 et 8 donnent aussi **une pièce Inhabituelle** chacune, posée sur un emplacement qui n'en a pas encore (hors arme).

## Le Bâtisseur (nouvel ennemi)
- Il frappe peu. Il annonce un mur (le télégraphe du bouclier), puis **blinde l'allié debout le plus entamé**. S'il est seul, il se blinde lui-même.
- Il se contre comme un bouclier : condition « Bouclier au prochain tour ».
- Il est marqué soutien : le réglage « Cible » sur « Le soutien » le vise en premier.
- Il craint l'épée et résiste à la magie, ce qui compense l'écart épée / magie des Ruines mesuré au lot U-0.
- **Image à générer** : `images/Enemies/batisseur.jpg`. En attendant, le jeu affiche une icône générique.
- Moteur (`combat-engine.js`, accord de Seb) :
  - le bouclier réduit maintenant les dégâts sur tout ennemi qui le porte ;
  - à l'impact, il se pose sur la cible donnée par `RiseSystem.shieldTarget`.

## Petite Aventure des Ruines : les murs bougent
- Deux cartes, sur tes images : `ruines_1` (le labyrinthe) et `ruines_2` (les arènes). Les nœuds sont posés sur les places peintes.
- **Les murs bougent** : après chaque pas, il y a 35 % de chances qu'un passage change devant toi. Un chemin se ferme, un autre s'ouvre parfois. Chaque nœud garde toujours une sortie. La feuille du nœud suivant le dit.
- **La Craie d'Edda** : objet de besace gratuit, propre aux Ruines, avec 2 traits. Un trait empêche un mur de bouger à 2 rangées devant toi ou moins.
- Destinations :
  - le gardien de la porte, un squelette qui se relève ;
  - la cour au puits ;
  - la chambre scellée.
- Pierre errante dans les trouvailles et aux destinations, jamais perdue. Une accroche : « La page qui manque » (le carnet d'Edda). Quatre nouveaux obstacles.
- **Icône provisoire de la Craie** dessinée par Claude (`images/Icons/scene/items/item_chalk.png`). Le harnais exige les icônes de la PA : remplace-la par la tienne.

## La carte des Ruines : le chantier errant
- 14 quartiers sur ton image, avec la Borne au centre. La porte du Sanctuaire reste fermée jusqu'à l'acte III. Le Marché des Ruines est posé entre la place aux étals et la Borne.
- **Le chantier errant** : chaque jour, la ville rebâtit un quartier. Le tirage prend d'abord un quartier libéré, qui repasse « Rebâti ». Le libérer ce jour-là rapporte **3 Pierres errantes**, une fois par jour. Le quartier du jour porte un badge sur la carte et une ligne dans sa fiche.
- **L'Éboulement** : la règle du Désert (seul le quartier tenté retombe), avec ses mots. La Palissade le freine.
- Effets tenus :
  - la rue qui tourne : +1 trait de Craie ;
  - le puits rangé : Puits +10 % ;
  - la carrière : Carrière +10 % ;
  - les échafaudages : Mine +10 %.

## Plafonds de l'acte II
- Terrain 10 (entraînement 120) et 12 points de talent à partir de ruines_06.
- Monde 3 :
  - Atelier 8 ;
  - Halle 8 ;
  - Entrepôt 7 ;
  - Palissade 8 ;
  - Enchanteur 2.
- La Forge reste à 3. La Forge 4 et la Clé de voûte viendront en acte III.

## Équilibrage (mesuré)

**Quêtes de l'acte II** (`sim/ruines-acte2-bench.js`, sans potion) :
- « Celui qui pose les pierres », au profil de fin d'acte I : 100 % de réussite et 30 à 46 % de PV perdus, quelle que soit la paire de compagnons.
- « La salle qu'il évite », au profil du palier :
  - avec Wenna et Maddoc : 100 % de réussite, 34 à 46 % de PV perdus ;
  - sans Wenna : le Chevalier réussit 92 % du temps en perdant 69 %. La composition du groupe compte, comme prévu.

**Petite Aventure des Ruines** (`pa2-bench.js --ruines`) : les murs bougent, et le taux d'échec reste celui du Désert.

| Anneau | Ruines | Désert |
| --- | --- | --- |
| Sentier | 4 % | 9-12 % |
| Périple | 33 % | 32 % |

**Palier** : à 7 pièces sur 7, le robot y passait de 0 à 109 h selon la chance de l'échoppe. Le seuil est donc à 6 sur 7, et les trois pièces données par les étapes 6 à 8 font le reste.

**Campagne complète** (robot `--avise`, 3 classes) :
- le chapitre 3 se termine, actes I et II, sans aucun mur ;
- **durée** : de la fin du Désert à la fin de l'acte II, 71 à 87 h simulées, contre 46 à 62 h pour tout le chapitre II avec le même robot. L'essentiel part entre les étapes, quand le robot farme l'or pour les reforges et le Terrain. C'est à discuter.

## Code
- Nouveau fichier de simulation : `sim/ruines-acte2-bench.js`.
- Le robot de campagne (`sim/campagne-harness.js`) :
  - joue maintenant les étapes 6 à 10 ;
  - fuit un combat d'élite qu'il ne peut pas finir ;
  - farme ailleurs quand l'élite résiste.
- `sim/pa2-bench.js` prend l'option `--ruines`.
- La récompense d'étape `equipmentFill` (`story-quest-system.js`) pose la pièce sur un emplacement sous la rareté demandée.
- Aucun nouveau fichier de jeu et aucun nouvel état sauvegardé hors bloc. `run.walls` vit dans le run, `game.livingMaps.ruins.chantier` dans le bloc des cartes.

## Images à fournir
- `images/Enemies/batisseur.jpg` : portrait du Bâtisseur.
- `images/Icons/combat_status/rising.png` : la condition « Un ennemi se relève », déjà demandée.
- `images/Icons/scene/items/item_chalk.png` : la Craie. Une version provisoire est fournie dans ce delta.

## Contrôles
- Round : **3 957 OK**, 0 échec. Nouvelle section [204] (32 contrôles).
- Parcours : 139 OK. Boot : 4 OK. Création du héros : 44 OK.
- i18n : 4 183 textes, 100 %, 0 orphelin. 185 nouvelles traductions anglaises.

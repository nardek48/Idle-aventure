# Aethervale — CHANGELOG v3.8.0

Base : v3.7.0. Intégration des icônes fournies par Seb (`A_ajouter.zip`) —
attaques spéciales, arme (arc), badge de talents, icône Campement — plus
un correctif important sur les résistances/faiblesses d'ennemis, cassées
par la simplification des icônes d'équipement.

## 1. Icônes d'attaque spéciale

Les 7 icônes nommées (correspondant aux 7 capacités actuelles) renommées en
anglais et câblées :

| Fichier reçu | Renommé en | Capacité |
|---|---|---|
| coup_fracassant.png | smashing_blow.png | Chevalier |
| tir_grouper.png | multishot.png | Rôdeur |
| explosion_arcanique.png | arcane_blast.png | Mage |
| fureur_du_chaos.png | chaos_fury.png | Chevalier du Chaos |
| tir_chaotique.png | chaotic_shot.png | Rôdeur du Chaos |
| cataclysme.png | cataclysm.png | Sorcier du Chaos |
| posture_defensive.png | defensive_stance.png | Bouclier (tous héros) |

Les 6 icônes non nommées (`attaque3/4/6/10/11/12.png`) renommées en
`attack3/4/6/10/11/12.png` et copiées dans `images/Icons/special_attacks/`
— réservées à de futurs héros, pas encore câblées (rien à quoi les
rattacher pour l'instant).

**Affichage** : les 3 endroits qui montraient l'emoji (`icon: "💥"` etc.)
utilisent maintenant `renderIconOrEmojiHTML()` — détection automatique
image vs emoji, donc aucun autre écran à modifier si de nouvelles icônes
emoji sont utilisées ailleurs plus tard. Concerné : le bouton d'attaque
spéciale et le bouton bouclier sur l'écran Combat, et les 2 cartes de
capacités actives dans la fiche personnage (sous-onglet Stats).

## 2. Icônes d'équipement — une image par type, sauf l'arme

Comme demandé : simplification à **une seule illustration par type
d'équipement**, la rareté restant communiquée par la bordure/couleur de
la carte (déjà en place) plutôt que par un visuel dédié — **sauf l'arme**,
qui garde une image différente par rareté (la plus intéressante à voir
évoluer). C'est en réalité un retour à un fonctionnement plus ancien du
jeu (un commentaire de code de la v2.23 le confirme : *"avant, une seule
icône générique par type, ignorant la rareté"*).

- `data/equipment.js` : les listes `icons` de weapon/armor/amulet réduites
  à une seule entrée chacune (`["bow"]`, `["armor"]`, `["amulet"]`) — les
  autres flavors (sword/axe/staff/robe/shield/crown) restent sur le disque
  mais ne sont plus tirés. Helmet/gloves/ring l'étaient déjà.
- `systems/equipment-system.js` (`getEquipmentIconPath`) : la rareté
  utilisée pour construire le nom de fichier est désormais forcée à
  `"common"` pour tout ce qui n'est PAS `item.slot === "weapon"` — quelle
  que soit la vraie rareté de l'objet, un même type affiche donc toujours
  la même image.
- Nouvel arc (5 raretés, `.png`, fournies par Seb) copié dans
  `images/Icons/equipment_icon/` ; les 4 anciens `bow_*.jpg` (sans variante
  "Inhabituelle" dédiée) retirés, `bow` rejoint la liste des types
  entièrement en PNG.

**État des icônes d'équipement, pour référence** : Casque et Gants sont en
réalité déjà complets depuis un moment (5 raretés chacun, contrairement à
une note de suivi précédente qui les donnait comme manquants) — la
simplification de cette livraison les rend de toute façon inutiles au-delà
de la variante "common", puisqu'un seul visuel est affiché désormais.
**Bottes reste le seul emplacement sans AUCUN visuel sur le disque** (ni
ancien ni nouveau, juste un nom de fichier référencé dans le code qui ne
correspond à rien) — objet manquant réel, à fournir si tu veux le corriger.

## 2bis. Correctif : résistances/faiblesses par arme cassées

**Cause** : `getPlayerDamageType()` lisait `game.equipped.weapon.icon`
(sword/axe/staff/bow, tiré au hasard à chaque drop) pour déterminer le
type de dégâts face aux résistances/faiblesses des ennemis
(`enemy.resists`/`enemy.weak`). Avec la simplification ci-dessus, l'arme
ne montre plus qu'UNE seule icône (bow) — donc `weapon.icon` vaut
désormais toujours `"bow"` pour tout le monde, quel que soit le héros ou
l'objet réellement équipé : la mécanique perdait toute variété.

**Correctif** : le type de dégâts est maintenant rattaché au **héros
choisi**, pas à l'objet équipé — nouveau champ `weaponType` dans
`HEROES_DB` (`data/heroes.js`) :

| Héros | weaponType |
|---|---|
| Chevalier / Chevalier du Chaos | sword |
| Rôdeur / Rôdeur du Chaos | bow |
| Mage / Sorcier du Chaos | magic |

`getPlayerDamageType()` (`systems/combat-engine.js`) lit désormais
`HEROES_DB[game.heroId].weaponType` — stable et lisible (ton Chevalier
fait toujours des dégâts d'épée), plutôt que dépendant d'un tirage
aléatoire invisible pour le joueur. Aucune arme équipée du tout reste
"unarmed" (malus -20%), inchangé.

## 3. Badge "talents disponibles"

Le badge sur le portrait du héros (HUD) était une pastille rouge avec un
"!" — remplacé par l'icône fournie (`up_icon.png`, copiée dans
`images/Icons/talents/`). N'hérite plus du style pastille-numérique
(`.nb-hud-bag-badge`, partagé avec le badge du sac) : porte maintenant son
propre style complet (position bas-gauche du portrait, inchangée).

## 4. Icône Campement (barre du bas)

`camp_menu.png` copiée dans `images/Icons/menu_icons/`, remplace l'emoji
🏕️ temporaire utilisé en v3.7.0.

## 5. Icône raccourci Équipement

Déjà correct depuis v3.7.0 (réutilise `equip_menu.png`) — confirmé, rien
à changer.

## Tutoriel d'accueil

Comme convenu : pas retouché cette fois, sera entièrement refait plus
tard. Ajouté à mes notes de suivi pour les prochaines sessions.

## Tests effectués

- `node --check` sur tous les fichiers JS touchés.
- Nouveau harnais Node `vm` dédié (16 assertions) : sans arme → "unarmed" ;
  avec arme équipée, le type suit bien le héros (testé sur les 6 héros)
  même avec une icône d'objet différente ; le mécanisme resist/weak
  s'applique toujours correctement (bonus +30%/malus -30% vérifiés) ;
  `getEquipmentIconPath()` renvoie bien la MÊME image pour un casque
  common vs legendary, mais une image DIFFÉRENTE pour une arme common vs
  legendary ; 30 générations d'armes procédurales → toujours icône "bow".
- Re-passage des harnais v3.1/v3.2/v3.3 : aucune régression.
- Playwright (rendu réel, 390×844) : icônes d'attaque spéciale et
  bouclier visibles sur l'écran Combat et la fiche personnage (sous-onglet
  Stats) ; inventaire avec 5 casques de raretés différentes montrant tous
  la même icône (bordures colorées différentes) vs 2 armes montrant des
  icônes différentes selon la rareté ; badge de talents confirmé
  fonctionnel (chargement 200, positionnement, élément au premier plan) ;
  icône Campement visible dans la barre du bas. Aucune erreur console, ni
  aucun nouveau 404 (seul le 404 pré-existant connu,
  `right-panel-frame.png`, toujours présent, sans lien avec cette
  livraison).

## Fichiers modifiés

- `js/data/heroes.js`
- `js/data/equipment.js`
- `js/systems/combat-engine.js`
- `js/systems/equipment-system.js`
- `js/ui/combat-view.js`
- `js/ui/heros-view.js`
- `js/ui/hud-view.js`
- `css/03-combat.css`
- `css/04-panel-hero-summary.css`
- `css/02-layout.css`
- `index.html`
- `sw.js` (`CACHE_VERSION` → `"3.8.0"`)

## Nouvelles images

- `images/Icons/special_attacks/` (nouveau dossier) — 13 fichiers
  (7 câblées + 6 en réserve pour de futurs héros)
- `images/Icons/equipment_icon/bow_{common,green,rare,epic,legendary}.png`
  (remplace les 4 anciens `.jpg`)
- `images/Icons/talents/up_icon.png`
- `images/Icons/menu_icons/camp_menu.png`

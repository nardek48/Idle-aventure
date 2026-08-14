# Aethervale — CHANGELOG v3.9.0

Base : v3.8.0. Suite directe des demandes de la livraison précédente :
boutons de combat simplifiés en icônes pures, icône du sac remplacée,
icônes de bottes intégrées, et `EQUIPMENT_SLOT_CONFIG` mis à jour selon
tes valeurs exactes (réactivation des flavors d'arme, nettoyage des noms).

## 1. Boutons attaque spéciale / bouclier — icônes pures

Comme demandé : la carte rectangulaire (bordure + fond + icône + nom en
dessous) est remplacée par l'icône seule en rond, même traitement que les
boutons de potion (`.heal-quick-btn`).

- `css/03-combat.css` : `.combat-action-btn` redessiné en bouton rond sans
  bordure/fond ; l'image occupe maintenant tout le bouton
  (`img.combat-action-icon { width: 100%; height: 100%; }`) ; le texte du
  nom a disparu, le compte à rebours du cooldown est maintenant incrusté
  au centre de l'icône (fond assombri + chiffre en surimpression, au lieu
  d'être affiché sous le nom) ; le halo bleu "bouclier actif" redessiné en
  cercle.
- `js/ui/combat-view.js` : les `<span class="combat-action-name">` retirés
  des deux fonctions de rendu (`buildSpecialAttackHTML`/`buildDefenseHTML`).
- Le survol/appui long (`title="..."`) affiche toujours le nom complet de
  la capacité — l'info n'est pas perdue, juste plus affichée en permanence.

## 2. Icône du sac (HUD) remplacée

L'emoji 🎒 générique remplacé par l'icône Équipement (même fichier que la
carte du Menu ☰, `equip_menu.png`) — cohérence visuelle entre les deux
points d'accès à l'inventaire.

- `js/ui/hud-view.js` : `<img>` à la place de l'emoji dans le bouton.
- `css/02-layout.css` : nouvelle classe `.nb-hud-bag-icon` (20×20,
  `object-fit: contain`), `.nb-hud-bag-btn` passé en `display:flex` pour
  centrer proprement l'image.

## 3. Icônes de bottes intégrées

5 raretés fournies, copiées dans `images/Icons/equipment_icon/`
(`bottes_common/green/rare/epic/legendary.png` — renommé depuis
`bottes_commun.png` pour coller à la convention `common` utilisée
partout ailleurs dans le code). `bottes` ajouté à
`EQUIPMENT_ICON_PNG_TYPES` (`systems/equipment-system.js`).

**Toutes les icônes d'équipement ont désormais un visuel complet sur le
disque** — Bottes était le dernier emplacement sans aucune image, ce
n'est plus le cas.

## 4. `EQUIPMENT_SLOT_CONFIG` — mis à jour selon tes valeurs exactes

- **weapon.icons** : réactivé à `["bow", "sword", "axe", "staff"]` (était
  réduit à `["bow"]` seul en v3.8.0) — l'arme reste le SEUL emplacement
  avec plusieurs illustrations possibles, tous les autres n'en ont qu'une.
  Vérifié un par un que chaque clé pointe vers le bon visuel : axe → hache,
  sword → épée, staff → bâton, bow → arc (aucune inversion trouvée).
- **armor.names** : réduit à `["Armure", "Cuirasse", "Plastron"]` (Cape et
  Bouclier retirés — n'avaient plus lieu d'être depuis que l'armure n'a
  plus qu'une seule icône).
- **helmet.names** : réduit à `["Casque", "Heaume"]` (Couronne et Capuche
  retirés).
- **gloves.names** : réduit à `["Gants"]` seul (Mitaines et Gantelets
  retirés).
- **boots.names** : réduit à `["Bottes"]` seul (Sandales et Chaussures
  retirés).
- ring/amulet : noms inchangés (tu ne les as pas touchés).

La mécanique de résistances/faiblesses (corrigée en v3.8.0, rattachée au
héros plutôt qu'à l'icône de l'arme) n'est PAS affectée par la
réactivation des flavors d'arme — c'était justement tout l'intérêt de ce
découplage : l'icône peut varier librement pour le visuel, la mécanique de
jeu ne dépend plus d'elle.

## Tests effectués

- `node --check` sur tous les fichiers touchés.
- Harnais dédié (v3.8.0) étendu à 21 assertions : les 16 précédentes
  toujours valides (résistances par héros, casque/armure figés sur une
  image) + 5 nouvelles — 30 générations d'armes donnent maintenant
  plusieurs flavors (au lieu d'un seul), tous connus (bow/sword/axe/staff),
  bottes ont un vrai chemin PNG et restent figées sur une image comme les
  autres emplacements non-arme, et chaque flavor d'arme pointe
  spécifiquement vers le bon fichier (axe/sword/staff vérifiés
  individuellement).
- Re-passage des 3 harnais de non-régression (v3.1/v3.2/v3.3) : aucune
  régression.
- Playwright (rendu réel, 390×844) : boutons de combat confirmés en icônes
  rondes pures ; icône du sac confirmée (capture directe de l'élément) ;
  inventaire avec 5 bottes de raretés différentes (bordures différentes,
  même icône) et 4 armes légendaires forcées sur les 4 flavors différents
  (visuellement distinctes : arc en feu / lame / hache / bâton). Aucune
  erreur console, aucun nouveau 404.

## Fichiers modifiés

- `js/data/equipment.js`
- `js/systems/equipment-system.js`
- `js/ui/combat-view.js`
- `js/ui/hud-view.js`
- `css/02-layout.css`
- `css/03-combat.css`
- `sw.js` (`CACHE_VERSION` → `"3.9.0"`)

## Nouvelles images

- `images/Icons/equipment_icon/bottes_{common,green,rare,epic,legendary}.png`

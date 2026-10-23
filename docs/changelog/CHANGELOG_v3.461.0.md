# v3.461.0 — Niveaux de donjon, lot 2 : les récompenses au-delà du plafond

Deuxième lot de la conception « Niveaux de donjon » v0.3 (décisions N-I, N-J, N-K, N-E). Comme pour le lot 1, l'écran de choix du niveau viendra au lot 5 : chaque run se joue encore au niveau 1, et rien ne change pour le joueur.

## Le plafond
Le plafond est le niveau où un donjon atteint sa meilleure rareté : le niveau du dernier palier dont le donjon visé est débloqué, ou 1 si aucun palier n'est ouvert. Par exemple :
- Crypte : plafond 1 ;
- Tanière, Crypte débloquée : plafond 20 ;
- Tanière, seule la Cité débloquée : plafond 10.

Chaque niveau au-delà du plafond rapporte :
- **Or de fin** +10 % (N-I), sur l'or du donjon lui-même : la Tanière 20 garde l'or de la Tanière. Crypte 5 : ×1,4.
- **Éclats du run** +10 % (N-K), appliqués avant l'Écho de la faille (Mémoire).
- **Objets « Touché par l'Aether »** (N-J, N-E) : le plancher du tirage (stat de base et bonus) monte de 5 % de la fourchette par niveau, jusqu'à 80 %. Crypte 5 : 20 % ; 80 % au niveau 17. Ces objets portent la ligne « Touché par l'Aether · niveau N » dans leur fiche. L'Enchanteresse garde toujours la meilleure valeur : ils n'y perdent rien.

## Code
- `data/dungeon.js` : `beyondGoldPct`, `beyondShardPct`, `beyondFloorPct`, `beyondFloorMax`.
- `dungeon-system.js` (protégé, accord de Seb) : `getCapLevel`, `getLevelBeyond`, `getLevelFloor` ; dans `finish`, l'or de fin et les Éclats du run au niveau.
- `loot-system.js` : `generateEquipmentItem(slot, rarity, worldIndex, aether)` et `rollEquipmentAffixes(…, floor)` tirent au plancher ; l'objet reçoit `aether: N`. L'inventaire est sauvegardé en entier, donc pas de nouvel état à câbler.
- `equipment-view.js` : la ligne « Touché par l'Aether · niveau N » sous « Trouvé en … » ; `en.js` : « Aether-touched · level N ».
- Aucun fichier ajouté.

## Contrôles
- Harnais [273] : plafond qui se déplace quand un donjon se débloque ; plancher 20 % à la Crypte 5, 80 % au niveau 17 et au-delà ; 200 objets au plancher 80 % (stat de base et 600 bonus dans le haut de la fourchette, à l'arrondi près) ; butin des vagues et de fin « niveau 5 » ; objet ordinaire au niveau 1 ; ligne de la fiche ; or ×1,4 et Éclats +40 % à la Crypte 5.
- i18n 100 % (5409 textes).
- round-harness 4588 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.

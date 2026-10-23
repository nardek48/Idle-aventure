# v3.465.2 — Icônes des attaques de base

Les 3 attaques de base ont leur icône, générées par Seb à partir des prompts de `Aethervale_Prompts_images_a_faire_v1_0.md`.

## Images
- `images/Icons/special_attacks/basic_knight.webp` : Chevalier (épée et entaille, fond rouge, gemme rubis).
- `images/Icons/special_attacks/basic_archer.webp` : Rôdeur (flèche en vol, fond vert, gemme émeraude).
- `images/Icons/special_attacks/basic_mage.webp` : Mage (trait arcanique, fond bleu nuit, gemme améthyste).

Elles s'affichent dans la fiche Capacités, à la création du héros et dans le Grimoire, à la place de l'icône générique.

Préparation :
- découpées dans une planche à fond transparent de 2172 × 724 ;
- les petites traînées détachées au-dessus des cercles sont retirées (seule la forme principale est gardée) ;
- réduites à 256 px de haut et centrées sur 256 × 256, comme les autres médaillons de capacité.

Elles diffèrent un peu des médaillons existants : gemme ronde au lieu d'un écusson, pas d'encoche en haut du cadre.

## Contrôles
- `missing-icons.js` : 21 images absentes au lieu de 24.
- Chromium : les 3 chemins de `CLASS_ACTION_ICON_FALLBACK` se chargent (256 × 256).
- round-harness 4643 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.

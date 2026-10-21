# v3.458.2 — Lot 6b : lisibilité et mobile (audit C2, P26, P25, P14, P27, C10, C8)

Report dans le jeu de l'atelier `atelier/lot6.html`, validé par Seb (barre de Rage écrite, points pour l'anneau).

## C2 — Ressource de classe lisible
- Combat : « Rage 34 / 100 » écrit dans la barre du héros (15 px de haut, texte 12 px), sur toute la largeur de la carte ; la célérité a sa propre ligne dorée. La carte du héros prend 24 px.
- Capacités (Héros) et création du héros : l'attaque de base vient en tête, avec la règle de la ressource en clair (Rage : 40 % des dégâts, 20 au plus ; Concentration : 15 par coup qui touche, 4 de plus en critique ; Mana : 8 par round et 8 par attaque de base).
- Les descriptions affichent le coût réel du kit : un talent qui baisse un coût (Perforation : 50 → 40) n'est plus démenti par « Coûte 50 ». Helper commun `getSkillDescText` (`class-skills.js`), aussi dans l'infobulle des boutons de combat.

## P26 — Compagnons en combat
- Le nom prend toute la largeur de la carte, au-dessus du portrait : « Wenna » et « Maddoc » entiers à 320 px (avant : rien et « Ma… »).
- La chaîne passe en pastille sur le portrait (icône `chained.png` et rounds) ; la recharge et « Prêt » passent sous la barre de PV.

## P25 — Téléphone en paysage
- Voile « Tourne ton téléphone » (écran tactile, paysage, sous 500 px de haut) : en paysage, la scène de combat faisait 0 px.

## P14 — Contrastes (mesurés au pixel)
- Mémoire : « S'ouvre si tu as choisi… » 2,3 → 8,8:1 (le voile ne porte plus sur la condition) ; sous-titre du niveau 3,0 → 5,3:1.
- Hauts faits : « OBTENUS » 10 → 12 px et 4,3 → 8,8:1 ; « TITRE PORTÉ » 3,7 → 7,6:1 ; paliers 3,4 → 8,4:1.
- Taverne : quantité manquante 2,9 → 6,4:1. Talents : « 0 / 5 » 3,4 → 5,2:1.

## P27 — Toucher sur 44 px (taille visible inchangée)
- Pastilles de créatures de la carte (écart 10 px) ; catégories en pastilles (`.kchips`) ; alerte de combat ; « Livrer » (25 → 32 px de haut) ; bouton du titre des Hauts faits.
- Au passage : les pastilles à image coupaient ce qui dépasse (`.has-icon-img`), donc leur zone et le point doré « nouveau ». Corrigé.

## C10 — Carte vivante
- 1 à 3 points = l'anneau du secteur, à la place d'un numéro qui n'était qu'un index de données. La légende l'explique.

## C8 — Retour « ‹ »
- Bouton « ‹ » dans le bandeau des écrans ouverts depuis un onglet du bas (Donjon, Carte, Grimoire, Potions, Mémoire, Équipement, Talents), vers cet onglet.

## Images à faire (icône générique en attendant)
- `images/Icons/special_attacks/basic_knight.png`, `basic_archer.png`, `basic_mage.png` : attaques de base (avant, l'icône de découverte des scènes était empruntée par défaut).

## Contrôles
- round-harness 4528 OK, 0 échec (deux passes), section [260] ; 3 tests anciens adaptés (légende à 8 lignes, « Prêt » sous la barre, liste des zones de 44 px).
- Boot, création du héros OK ; parcours complets 139 OK, 0 échec ; i18n 100 %, 0 orphelin (9 textes ajoutés).
- Chromium 320 / 390 / 844 px : contrastes et cibles re-mesurés sur le jeu, aucune cible sous 44 px sur les écrans de l'atelier.
- Aucun fichier protégé, aucun fichier ajouté.

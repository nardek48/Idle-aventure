# Pistes : ressenti des combats (ouvert le 2026-10-10, v3.438.1)

Retour de Seb : combats « bien mais il manque un petit quelque chose », « un peu plats et courts ».
Rien n'est décidé : options en attente de validation.

## Constat, retour visuel (`js/ui/combat-screen-view.js`)
- Présent : chiffres flottants (critique, brûlure, soin, bloqué), flash de coup, secousse au critique,
  écrasement sur charge, tampons (soin, silence, corruption), annonces ennemies, vibrations.
- Absent : aucun son dans le jeu ; mort d'ennemi = simple fondu gris de 0,6 s (`.cbx-foe.is-dead`) ;
  aucun geste de l'attaquant (seule la cible réagit), le moteur ne dit pas qui frappe.

## Pistes visuelles (chiffrées le 2026-10-10)
- A. Coup de grâce : arrêt sur image ~80 ms, flash, éclatement CSS, or et XP qui s'envolent. ~1 session, aucun fichier protégé.
- B. Gestes d'attaque : la carte avance quand elle frappe, l'ennemi bondit. 1 à 2 sessions, savoir qui agit (moteur protégé ?).
- C. Sons Web Audio synthétisés + réglage. 2 sessions, nouveau fichier JS + état sauvegardé (`save-system.js` protégé).
- Ordre recommandé : A, puis B, puis C. Prototype dans `atelier/` d'abord.

## Constat, durée et tension (campagne-lot --combats --n 2, 6 parties, 36 h simulées)
- Round = 1,5 s à x1 (`ROUND_INTERVAL_MS`, `combat-engine.js`).
- Combats normaux : médiane 2 à 3 rounds (p90 3 à 7), soit 3 à 4,5 s à x1 ; PV perdus médians ≈ 0 %.
- Boss : 6 à 21 rounds, 15 à 45 % de PV perdus : là, la tension existe.
- Les charges ennemies arrivent après 3 à 5 rounds (`ENEMY_CHARGE_ROUNDS_MIN/MAX`) : un ennemi normal
  meurt presque toujours AVANT de jouer son coup spécial. Cause probable du côté « plat ».
- Attention : le soin au camp pèse déjà 9 à 14 h sur 36 h. Augmenter les dégâts ennemis allonge ce temps mort.

## Rations et temps au camp (vérifié le 2026-10-10)
- Au Campement, `CampManager.eatRation` rend `healPct` des PV max (Petite ration 35 %), fabriquée à la Cuisine de camp.
- La campagne simulée (`tools/sim/campagne-harness.js`, `healUp`) ne mange JAMAIS de ration au camp : elle attend
  la régénération naturelle. Les rations ne sont fabriquées que si une sortie l'exige, et mangées seulement en expédition.
  Le chiffre « soin au camp 9 à 14 h » est donc pessimiste.
- Idée de Seb : la Forêt reste comme aujourd'hui ; l'annonce avancée des ennemis normaux arrive plus tard,
  quand les rations sont plus simples à produire. Il existe déjà des seuils par monde (`*_MIN_WORLD_INDEX`).
